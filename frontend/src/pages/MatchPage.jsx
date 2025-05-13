import React, { useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import RestaurantCard from '../components/RestaurantCard';
import { SessionContext } from '../contexts/SessionContext';
import { Box, Button, Typography, Container, CircularProgress, Alert, Stack, IconButton, Paper } from '@mui/material';
import { ArrowBack, ArrowForward, ExitToApp } from '@mui/icons-material';

// MatchPage now primarily consumes SessionContext
export default function MatchPage() {
  const {
    sessionState,
    playerId,
    swipe,
    clearSessionData,
    isLoading: contextIsLoading, // Renamed to avoid conflict if any local loading state is needed
    error: contextError,
    playerName // Player's own name from context
  } = useContext(SessionContext);
  const navigate = useNavigate();

  // Local state for card animation or effects, if any (optional)
  // const [animation, setAnimation] = useState('');

  useEffect(() => {
    if (contextError) {
      // Potentially handle specific errors relevant to MatchPage if needed
      // For now, SessionActiveDisplay handles generic errors.
    }
  }, [contextError]);

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
    // This page should only render if session is active. 
    // SessionActiveDisplay should handle redirection if status is not 'active'.
    // However, as a fallback or if navigated here directly:
    return <Container sx={{ mt: 5, textAlign: 'center' }}><Typography>Waiting for session to become active...</Typography><CircularProgress sx={{mt:2}}/></Container>;
  }

  const { 
    restaurants = [], 
    players = {}, 
    matches = {}, 
    current_turn_player_id, // ID of player whose turn it is (if applicable)
    mode // e.g., 'freeform', 'turn-based'
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
  
  if (currentIndex >= restaurants.length) {
    // All restaurants swiped by this player
    // Backend should handle this state and potentially change sessionState.status or player.status
    return (
        <Container sx={{mt:5, textAlign: 'center'}}>
            <Typography variant="h5">No more restaurants to show for you!</Typography>
            <Typography>Waiting for other players or results...</Typography>
            <CircularProgress sx={{my:2}}/>
            <Button variant="outlined" onClick={handleLeaveSession} sx={{mt: 2}} startIcon={<ExitToApp />}>
                Leave Session
            </Button>
        </Container>
    );
  }

  const currentRestaurant = restaurants[currentIndex];

  const handleSwipe = (decision) => {
    // Basic animation trigger (optional)
    // setAnimation(decision === 'like' || decision === 'superlike' ? 'swipe-right' : 'swipe-left');
    // setTimeout(() => { // Reset animation after it plays
    //   swipe(currentRestaurant.id, decision);
    //   setAnimation(''); 
    // }, 300); 
    swipe(currentRestaurant.id, decision);
  };

  const handleLeaveSession = () => {
    clearSessionData();
    navigate('/');
  };

  // Determine if current player has superliked this card
  const isSuperlikedByCurrentUser = (
    matches[currentRestaurant.id]?.superlikes?.includes(playerId)
  ) || false;

  // Determine if other players have superliked this card
  // This is a simplified version. A more robust solution might need specific backend field.
  const otherPlayerSuperlikeIds = new Set();
  if (matches[currentRestaurant.id]?.superlikes) {
    matches[currentRestaurant.id].superlikes.forEach(pId => {
      if (pId !== playerId) {
        otherPlayerSuperlikeIds.add(currentRestaurant.id); // Add restaurant ID if superliked by another
      }
    });
  }
  
  // Check if it's this player's turn (for turn-based mode)
  const isMyTurn = mode === 'freeform' || current_turn_player_id === playerId || !current_turn_player_id;

  return (
    <Container maxWidth="sm" sx={{ py: {xs:1, sm:2}, display: 'flex', flexDirection: 'column', alignItems: 'center', minHeight: 'calc(100vh - 64px)' /* Adjust for AppBar if any */ }}>
        <Paper elevation={2} sx={{p:2, mb:2, width: '100%', textAlign: 'center'}}>
            <Typography variant="h6">
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
          onDislike={() => handleSwipe('pass')} // Assuming 'pass' is the backend action for dislike
          onSuperlike={() => handleSwipe('superlike')}
          isSuperliked={isSuperlikedByCurrentUser} // If current user superliked this one
          otherPlayerSuperlikeIds={otherPlayerSuperlikeIds} // Set of restaurant IDs superliked by others
          disabled={!isMyTurn} // Disable actions if not this player's turn
          // animationClass={animation} // Optional animation class
        />
      ) : (
        <Typography sx={{mt:5}}>Something went wrong, no current restaurant.</Typography>
      )}

      <Stack direction="row" spacing={2} sx={{ mt: 2, width: '100%', justifyContent: 'center' }}>
        <Button variant="outlined" color="error" onClick={() => handleSwipe('pass')} disabled={!isMyTurn || !currentRestaurant} sx={{ flexGrow: 1, py:1.5}}>
          Pass
        </Button>
        <Button variant="contained" color="success" onClick={() => handleSwipe('like')} disabled={!isMyTurn || !currentRestaurant} sx={{ flexGrow: 1, py:1.5}}>
          Like
        </Button>
        <Button variant="contained" color="warning" onClick={() => handleSwipe('superlike')} disabled={!isMyTurn || !currentRestaurant || isSuperlikedByCurrentUser} sx={{ flexGrow: 1, py:1.5}}>
          Superlike
        </Button>
      </Stack>

      <Button variant="outlined" onClick={handleLeaveSession} sx={{mt: 3}} startIcon={<ExitToApp />}>
        Leave Session
      </Button>
    </Container>
  );
}
