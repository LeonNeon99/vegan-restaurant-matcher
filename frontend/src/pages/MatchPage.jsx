import React, { useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import RestaurantCard from '../components/RestaurantCard';
import WaitingForPlayersScreen from '../components/WaitingForPlayersScreen';
import { SessionContext } from '../contexts/SessionContext';
import { Box, Button, Typography, Container, CircularProgress, Alert, Stack, IconButton, Paper } from '@mui/material';
import { ArrowBack, ArrowForward, ExitToApp } from '@mui/icons-material';

// MatchPage now primarily consumes SessionContext
// All return paths must always return a valid React element to prevent React error #300
export default function MatchPage() {
  const [stage, setStage] = useState('swiping');

  // Show results UI immediately if stage is 'results'
  if (stage === 'results') {
    // You may want to render your results component or UI here. If it's a separate component, import and render it.
    return <ResultsPage />;
  }
  const {
    sessionState,
    playerId,
    swipe,
    finishEarly,
    clearSessionData,
    sendWebSocketMessage, // FIX: Use correct websocket send function
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

  // Render loading state
  if (contextIsLoading && !sessionState) {
    return (
      <Container sx={{ mt: 5, textAlign: 'center' }}>
        <CircularProgress />
        <Typography>Loading session...</Typography>
      </Container>
    );
  }

  // Defensive: If sessionState is missing, show error and log
  if (!sessionState) {
    console.error('MatchPage: sessionState is missing!');
    return (
      <Container sx={{ mt: 5, textAlign: 'center' }}>
        <Typography color="error">Session data is missing. Please try rejoining.</Typography>
      </Container>
    );
  }

  // Defensive: If playerId is missing or player not found
  if (!playerId || !sessionState.players || !sessionState.players[playerId]) {
    console.error('MatchPage: playerId missing or not found in sessionState.players', { playerId, players: sessionState.players });
    return (
      <Container sx={{ mt: 5, textAlign: 'center' }}>
        <Alert severity="error">Player not found in session. Please rejoin or check your link.</Alert>
        <Button onClick={() => { clearSessionData(); navigate('/'); }} sx={{mt:2}}>Go Home</Button>
      </Container>
    );
  }

  // Defensive: If restaurants are missing
  if (!sessionState.restaurants || sessionState.restaurants.length === 0) {
    // If all players are finished, don't show loading, let the results effect take over
    if (allPlayersFinished) return null;
    console.error('MatchPage: sessionState.restaurants missing or empty!', { restaurants: sessionState.restaurants });
    return (
      <Container sx={{ mt: 5, textAlign: 'center' }}>
        <Typography color="error">No restaurants loaded for this session. Please try rejoining.</Typography>
      </Container>
    );
  }
  
  // Track if current player has finished
  const currentPlayerFinished = useMemo(() => {
    if (!sessionState?.players?.[playerId] || !sessionState?.restaurants) return false;
    return sessionState.players[playerId].current_index >= sessionState.restaurants.length;
  }, [sessionState, playerId]);

  // Extract player names and their likes/superlikes for the results page
  const { player1Likes, player2Likes } = useMemo(() => {
    if (!sessionState?.players || !sessionState.matches) {
      return { player1Likes: [], player2Likes: [] };
    }
    const player1Id = Object.keys(sessionState.players)[0];
    const player2Id = Object.keys(sessionState.players)[1];
    const player1Likes = sessionState.matches[player1Id]?.likes || [];
    const player2Likes = sessionState.matches[player2Id]?.likes || [];
    return { player1Likes, player2Likes };
  }, [sessionState]);

  // Track if all players have finished
  const allPlayersFinished = useMemo(() => {
    // In single player mode, just check if current player is finished
    if (!sessionState?.players || Object.keys(sessionState.players).length <= 1) {
      return currentPlayerFinished;
    }
    
    // Check if session is marked as completed
    if (sessionState.status === 'completed') return true;
    
    // Check if all players have reached the end of the list
    return Object.values(sessionState.players).every(
      player => player.current_index >= sessionState.restaurants.length
    );
  }, [sessionState, currentPlayerFinished]);
  
  // Handle the session status
  useEffect(() => {
    // If we're in the waiting state, no need to do anything special
    // The waiting screen will be shown by the isWaitingForOtherPlayers check
    if (sessionState?.status === 'some_players_finished') {
      return;
    }
    
    // If session is completed, show results if not already showing
    if (sessionState?.status === 'completed' && stage !== 'results') {
      // Calculate mutual likes when all players have finished
      const ids1 = new Set(player1Likes?.map(b => b.id) || []);
      const mutual = player2Likes?.filter(b => ids1.has(b.id)) || [];
      setMutualLikes(mutual);
      setStage('results');
      return;
    }

    // --- LOCAL/SINGLE-PLAYER LOGIC: if both players are finished, show results even if status isn't 'completed' ---
    if (
      sessionState?.players &&
      Object.values(sessionState.players).every(player => player.current_index >= sessionState.restaurants.length)
      && stage !== 'results'
    ) {
      const ids1 = new Set(player1Likes?.map(b => b.id) || []);
      const mutual = player2Likes?.filter(b => ids1.has(b.id)) || [];
      setMutualLikes(mutual);
      setStage('results');
    }
  }, [sessionState?.status, stage, player1Likes, player2Likes, sessionState?.players, sessionState?.restaurants?.length]);
  
  // Handle finish early in multiplayer mode
  useEffect(() => {
    if (sessionState?.status === 'some_players_finished' && currentPlayerFinished) {
      // If we reach here, it means we're in multiplayer and the current player has finished
      // The waiting screen will be shown by the isWaitingForOtherPlayers check
      return;
    }
  }, [sessionState?.status, currentPlayerFinished]);
  
  // Check if we should show the waiting screen
  const isWaitingForOtherPlayers = useMemo(() => {
    // In single player mode, never show waiting screen
    if (!sessionState?.players || Object.keys(sessionState.players).length <= 1) return false;
    
    // Show waiting if current player has finished but others haven't
    const shouldWait = currentPlayerFinished && 
                     (sessionState.status === 'some_players_finished' || !allPlayersFinished);
    
    return shouldWait;
  }, [sessionState, currentPlayerFinished, allPlayersFinished]);
  
  // Show waiting screen if needed
  if (isWaitingForOtherPlayers) {
    return <WaitingForPlayersScreen />;
  }

  if (isWaitingForOtherPlayers) {
    return <WaitingForPlayersScreen />;
  }

  if (contextError) {
    return (
      <Container sx={{ mt: 5, textAlign: 'center' }}>
        <Alert severity="error">Session Error: {contextError}</Alert>
        <Button onClick={() => { clearSessionData(); navigate('/'); }} sx={{mt:2}}>Go Home</Button>
      </Container>
    );
  }
  if (!sessionState || (sessionState.status !== 'active' && sessionState.status !== 'some_players_finished')) {
    // If all players are finished, don't show any waiting message (results effect will take over)
    if (allPlayersFinished) return null;
    // Otherwise, show fallback waiting message
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
        <Container maxWidth="sm" sx={{ 
          py: {xs:1, sm:2}, 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          minHeight: 'calc(100vh - 64px)', 
          backgroundColor: '#f5f5f5',
          borderRadius: 2,
          my: 2,
          boxShadow: 3
        }}>
            <Paper elevation={2} sx={{
              p:2, 
              mb:2, 
              width: '100%', 
              textAlign: 'center',
              backgroundColor: '#ffffff'
            }}>
                <Typography variant="h5" color="primary.dark" fontWeight="bold">
                    Finished!
                </Typography>
            </Paper>
            
            <Box sx={{ my: 4, textAlign: 'center' }}>
                <Typography variant="h6" gutterBottom>You've seen all restaurants</Typography>
                <Typography variant="body1" sx={{ mb: 3 }}>
                    Waiting for other players to finish their selections...
                </Typography>
                <CircularProgress sx={{my:2}}/>
                
                {/* Show which players are still swiping */}
                <Box sx={{ mt: 3, p: 2, bgcolor: 'background.paper', borderRadius: 1 }}>
                    <Typography variant="subtitle1" fontWeight="medium" gutterBottom>
                        Players Status:
                    </Typography>
                    {Object.values(players).map(player => (
                        <Typography key={player.id} variant="body2" color={
                            player.id === playerId ? 'success.main' : 
                            (player.current_index >= restaurants.length ? 'success.main' : 'warning.main')
                        }>
                            {player.name}: {player.current_index >= restaurants.length ? 'Finished' : 'Still swiping'}
                        </Typography>
                    ))}
                </Box>
            </Box>

            <Button variant="contained" color="primary" onClick={handleLeaveSession} sx={{mt: 3}} startIcon={<ExitToApp />}>
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

  // Handle finish early button click
  const handleFinishEarly = () => {
    try {
      if (finishEarly) {
        // In multiplayer, notify server that we're finishing early
        if (sessionState?.players && Object.keys(sessionState.players).length > 1) {
          // Update local state immediately for better UX
          const restaurantCount = sessionState.restaurants?.length || 0;
          sessionState.players[playerId].current_index = restaurantCount;
          
          // Notify server
          if (sendWebSocketMessage) {
            // Fix ReferenceError: Replace all sendMessage with sendWebSocketMessage
            sendWebSocketMessage({
              action: "finish_early"
            });
          } else {
            // Defensive: fallback for missing function
            console.warn('sendWebSocketMessage is not defined in context');
          }
          
          // If we're in single player mode, proceed to results immediately
          if (Object.keys(sessionState.players).length === 1) {
            const ids1 = new Set(player1Likes?.map(b => b.id) || []);
            const mutual = player2Likes?.filter(b => ids1.has(b.id)) || [];
            setMutualLikes(mutual);
            setStage('results');
          }
        } else {
          // Single player mode - just call finishEarly
          finishEarly();
        }
      } else {
        console.warn('finishEarly function is not available');
        // Fallback for error case
        if (sessionState?.status === 'completed') {
          return; // Already completed, do nothing
        }
        
        // Force update to show results if possible
        const ids1 = new Set(player1Likes?.map(b => b.id) || []);
        const mutual = player2Likes?.filter(b => ids1.has(b.id)) || [];
        setMutualLikes(mutual);
        setStage('results');
      }
    } catch (error) {
      console.error('Error in handleFinishEarly:', error);
      // Fallback to showing current matches if any
      if (sessionState?.matches) {
        const matches = Object.entries(sessionState.matches)
          .filter(([_, votes]) => votes.likes?.length > 0 || votes.superlikes?.length > 0)
          .map(([bizId]) => sessionState.restaurants?.find(r => r.id === bizId))
          .filter(Boolean);
        setMutualLikes(matches);
        setStage('results');
      }
    }
  };

  return (
    <Container maxWidth="sm" sx={{ 
      py: {xs:1, sm:2}, 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      minHeight: 'calc(100vh - 64px)', /* Adjust for AppBar if any */
      backgroundColor: '#f5f5f5', /* Light background for the container */
      borderRadius: 2,
      my: 2,
      boxShadow: 3
    }}>
        <Paper elevation={2} sx={{
          p:2, 
          mb:2, 
          width: '100%', 
          textAlign: 'center',
          backgroundColor: '#ffffff'
        }}>
            <Typography variant="h6" color="primary.dark" fontWeight="bold">
                {playerName || currentPlayerState.name} (Restaurant {currentIndex + 1} of {restaurants.length})
            </Typography>
            {mode === 'turn-based' && current_turn_player_id && (
                <Typography variant="subtitle1" color={isMyTurn ? "primary.main" : "text.secondary"} fontWeight="medium">
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
          isSuperliked={isSuperlikedByCurrentUser} // If current user superliked this one
          otherPlayerSuperlikeIds={otherPlayerSuperlikeIds} // Set of restaurant IDs superliked by others
          disabled={!isMyTurn} // Disable actions if not this player's turn
          // animationClass={animation} // Optional animation class
        />
      ) : (
        <Typography sx={{mt:5, color: 'text.primary'}}>Something went wrong, no current restaurant.</Typography>
      )}

      <Stack direction="row" spacing={2} sx={{ mt: 2, width: '100%', justifyContent: 'center' }}>
        <Button variant="contained" color="error" onClick={() => handleSwipe('dislike')} disabled={!isMyTurn || !currentRestaurant} sx={{ flexGrow: 1, py:1.5}}>
          Pass
        </Button>
        <Button variant="contained" color="success" onClick={() => handleSwipe('like')} disabled={!isMyTurn || !currentRestaurant} sx={{ flexGrow: 1, py:1.5}}>
          Like
        </Button>
        <Button variant="contained" color="warning" onClick={() => handleSwipe('superlike')} disabled={!isMyTurn || !currentRestaurant || isSuperlikedByCurrentUser} sx={{ flexGrow: 1, py:1.5}}>
          Superlike
        </Button>
      </Stack>

      <Stack direction="row" spacing={2} sx={{ mt: 2, width: '100%', justifyContent: 'center' }}>
        <Button variant="outlined" color="primary" onClick={handleFinishEarly} sx={{ py:1.5, width: '100%' }}>
          Finish Early
        </Button>
      </Stack>

      <Button variant="contained" color="primary" onClick={handleLeaveSession} sx={{mt: 3}} startIcon={<ExitToApp />}>
        Leave Session
      </Button>
    </Container>
  );
}
