import React, { useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import RestaurantCard from '../components/RestaurantCard';
import { SessionContext } from '../contexts/SessionContext';
import { Box, Button, Typography, Container, CircularProgress, Alert, Stack, IconButton, Paper } from '@mui/material';
import { ArrowBack, ArrowForward, ExitToApp, DoneAll } from '@mui/icons-material';

// MatchPage now primarily consumes SessionContext
export default function MatchPage() {
  const {
    sessionState,
    playerId,
    swipe,
    clearSessionData,
    isLoading: contextIsLoading,
    error: contextError,
    playerName,
    sendWebSocketMessage
  } = useContext(SessionContext);
  const navigate = useNavigate();
  
  // New state to handle Finish Early process
  const [isFinishingEarly, setIsFinishingEarly] = useState(false);

  useEffect(() => {
    if (contextError) {
      // Potentially handle specific errors relevant to MatchPage if needed
    }
  }, [contextError]);
  
  // Monitor session state changes for redirect to results
  useEffect(() => {
    if (sessionState && sessionState.status === 'completed') {
      // Redirect to results page after a brief delay
      const timer = setTimeout(() => {
        navigate(`/results?session=${sessionState.id}`);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [sessionState, navigate]);
  
  // Handle the case where current player has completed all swipes
  useEffect(() => {
    if (sessionState && playerId && sessionState.players[playerId]) {
      const currentPlayerIndex = sessionState.players[playerId].current_index || 0;
      if (currentPlayerIndex >= (sessionState.restaurants?.length || 0) && sessionState.status === 'active') {
        // Show a "waiting for others" UI instead of a black screen
        setIsFinishingEarly(false);
      }
    }
  }, [sessionState, playerId]);

  if (contextIsLoading && !sessionState) {
    return <Container sx={{ mt: 5, textAlign: 'center' }}><CircularProgress /><Typography>Loading session...</Typography></Container>;
  }
  if (contextError) {
    return (
      <Container sx={{ mt: 5, textAlign: 'center' }}>
        <Alert severity="error">Session Error: {contextError}</Alert>
        <Button onClick={() => { clearSessionData(); navigate('/'); }} sx={{mt:2}}>Go Home</Button>
      </Container>
    );
  }
  if (!sessionState || sessionState.status !== 'active') {
    // This page should only render if session is active
    return <Container sx={{ mt: 5, textAlign: 'center' }}><Typography>Waiting for session to become active...</Typography><CircularProgress sx={{mt:2}}/></Container>;
  }

  const { 
    restaurants = [], 
    players = {}, 
    matches = {}, 
    current_turn_player_id,
    mode
  } = sessionState;
  
  const currentPlayerState = players[playerId];

  if (!currentPlayerState) {
    return <Container sx={{ mt: 5, textAlign: 'center' }}><Alert severity="warning">Your player data not found in session. Attempting to reconnect...</Alert><CircularProgress sx={{mt:2}} /></Container>;
  }

  const currentIndex = currentPlayerState.current_index || 0;

  if (!restaurants || restaurants.length === 0) {
    if (sessionState.status === 'error_fetching_restaurants') {
        return <Container sx={{mt:5, textAlign: 'center'}}><Alert severity="error">Error: Could not load restaurants for this session.</Alert></Container>; 
    }
    return <Container sx={{ mt: 5, textAlign: 'center' }}><CircularProgress /><Typography>Loading restaurants...</Typography></Container>;
  }
  
  // Handle when player has finished all restaurants
  if (currentIndex >= restaurants.length) {
    return (
        <Container sx={{mt:5, textAlign: 'center', backgroundColor: '#fff', p: 4, borderRadius: 2}}>
            <Typography variant="h5" color="primary" sx={{ mb: 2 }}>All restaurants reviewed!</Typography>
            <Typography variant="body1" sx={{ mb: 2 }}>
                {Object.keys(players).length > 1 
                  ? "Waiting for other players to finish or results to be calculated..." 
                  : "Calculating your results..."}
            </Typography>
            <CircularProgress sx={{my:2}}/>
            <Button 
              variant="outlined" 
              onClick={handleLeaveSession} 
              sx={{mt: 2}} 
              startIcon={<ExitToApp />}
            >
                Leave Session
            </Button>
        </Container>
    );
  }

  const currentRestaurant = restaurants[currentIndex];

  const handleSwipe = (decision) => {
    swipe(currentRestaurant.id, decision);
  };

  const handleLeaveSession = () => {
    clearSessionData();
    navigate('/');
  };
  
  const handleFinishEarly = () => {
    setIsFinishingEarly(true);
    
    // Send a message indicating player is finishing early
    sendWebSocketMessage({
      action: "finish_early",
      remaining_count: restaurants.length - currentIndex
    });
    
    // Process all remaining swipes as dislikes
    const processSwipes = async () => {
      for (let i = currentIndex; i < restaurants.length; i++) {
        await new Promise(resolve => setTimeout(resolve, 50)); // Small delay to prevent overloading
        swipe(restaurants[i].id, 'dislike');
      }
      setIsFinishingEarly(false);
    };
    
    processSwipes();
  };

  // Determine if current player has superliked this card
  const isSuperlikedByCurrentUser = (
    matches[currentRestaurant.id]?.superlikes?.includes(playerId)
  ) || false;

  // Determine if other players have superliked this card
  const otherPlayerSuperlikeIds = new Set();
  if (matches[currentRestaurant.id]?.superlikes) {
    matches[currentRestaurant.id].superlikes.forEach(pId => {
      if (pId !== playerId) {
        otherPlayerSuperlikeIds.add(currentRestaurant.id);
      }
    });
  }
  
  // Check if it's this player's turn (for turn-based mode)
  const isMyTurn = mode === 'freeform' || current_turn_player_id === playerId || !current_turn_player_id;

  // Show loading during finish early process
  if (isFinishingEarly) {
    return (
      <Container sx={{mt:5, textAlign: 'center', backgroundColor: '#fff', p: 4, borderRadius: 2}}>
        <Typography variant="h5" color="primary">Skipping remaining restaurants...</Typography>
        <CircularProgress sx={{my:3}}/>
        <Typography variant="body2">Please wait while we process your selection.</Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="sm" sx={{ py: {xs:1, sm:2}, display: 'flex', flexDirection: 'column', alignItems: 'center', minHeight: 'calc(100vh - 64px)' /* Adjust for AppBar if any */ }}>
        <Paper elevation={2} sx={{p:2, mb:2, width: '100%', textAlign: 'center', backgroundColor: '#ffffff'}}>
            <Typography variant="h6" color="#1A237E">
                {playerName || currentPlayerState.name} (Restaurant {currentIndex + 1} of {restaurants.length})
            </Typography>
            {mode === 'turn-based' && current_turn_player_id && (
                <Typography variant="subtitle1" color={isMyTurn ? "primary.main" : "text.secondary"}>
                    {isMyTurn ? "It's your turn!" : `Waiting for ${players[current_turn_player_id]?.name || 'player'}...`}
                </Typography>
            )}
        </Paper>

      {currentRestaurant ? (
        <RestaurantCard
          restaurant={currentRestaurant}
          onLike={() => handleSwipe('like')}
          onDislike={() => handleSwipe('dislike')}
          onSuperlike={() => handleSwipe('superlike')}
          isSuperliked={isSuperlikedByCurrentUser}
          otherPlayerSuperlikeIds={otherPlayerSuperlikeIds}
          disabled={!isMyTurn}
        />
      ) : (
        <Typography sx={{mt:5}}>Something went wrong, no current restaurant.</Typography>
      )}

      <Stack direction="row" spacing={2} sx={{ mt: 2, width: '100%', justifyContent: 'center' }}>
        <Button 
          variant="outlined" 
          color="error" 
          onClick={() => handleSwipe('dislike')} 
          disabled={!isMyTurn || !currentRestaurant} 
          sx={{ 
            flexGrow: 1, 
            py:1.5, 
            fontWeight: 'bold',
            border: '2px solid',
            '&:hover': { backgroundColor: '#ffebee' }
          }}
        >
          Pass
        </Button>
        <Button 
          variant="contained" 
          color="success" 
          onClick={() => handleSwipe('like')} 
          disabled={!isMyTurn || !currentRestaurant} 
          sx={{ 
            flexGrow: 1, 
            py:1.5,
            fontWeight: 'bold',
            '&:hover': { backgroundColor: '#2e7d32' }
          }}
        >
          Like
        </Button>
        <Button 
          variant="contained" 
          color="warning" 
          onClick={() => handleSwipe('superlike')} 
          disabled={!isMyTurn || !currentRestaurant || isSuperlikedByCurrentUser} 
          sx={{ 
            flexGrow: 1, 
            py:1.5,
            fontWeight: 'bold',
            '&:hover': { backgroundColor: '#f57c00' }
          }}
        >
          Superlike
        </Button>
      </Stack>
      
      <Stack direction="row" spacing={2} sx={{ mt: 2, width: '100%', justifyContent: 'center' }}>
        <Button 
          variant="outlined"
          onClick={handleFinishEarly} 
          disabled={!isMyTurn || !currentRestaurant}
          sx={{ 
            flexGrow: 1,
            fontWeight: 'bold',
            color: '#1976d2',
            borderColor: '#1976d2',
            '&:hover': { backgroundColor: '#e3f2fd' }
          }}
          startIcon={<DoneAll />}
        >
          Finish Early
        </Button>
        
        <Button 
          variant="outlined" 
          color="error"
          onClick={handleLeaveSession} 
          sx={{ 
            flexGrow: 1,
            fontWeight: 'bold',
            border: '2px solid',
            '&:hover': { backgroundColor: '#ffebee' }
          }}
          startIcon={<ExitToApp />}
        >
          Leave Session
        </Button>
      </Stack>
    </Container>
  );
}
