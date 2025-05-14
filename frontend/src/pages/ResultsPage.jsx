import React, { useContext, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { SessionContext } from '../contexts/SessionContext';
import RestaurantCard from '../components/RestaurantCard';
import { Box, Button, Container, Typography, Grid, Paper, Alert, CircularProgress, Chip, Avatar, Tooltip } from '@mui/material';
import { Replay, Home, EmojiEvents } from '@mui/icons-material';

function ResultsPage() {
  const {
    sessionState,
    clearSessionData,
    isLoading: contextIsLoading,
    error: contextError,
    playerId // this is the viewingPlayerId
  } = useContext(SessionContext);
  const navigate = useNavigate();

  const finalMatches = useMemo(() => {
    if (!sessionState || sessionState.status !== 'completed' || !sessionState.restaurants || !sessionState.matches) {
      return [];
    }
    const { restaurants, matches, players, consensus_threshold } = sessionState;
    const calculatedMatches = [];

    for (const bizId in matches) {
      const restaurant = restaurants.find(r => r.id === bizId);
      if (!restaurant) continue;

      const votes = matches[bizId];
      const likedByPlayerIds = votes.likes || [];
      const superlikedByPlayerIds = votes.superlikes || [];
      const totalUniqueLikers = new Set([...likedByPlayerIds, ...superlikedByPlayerIds]);
      
      const numTotalPlayers = Object.keys(players).length;
      // Ensure playerId from context is valid before using it for likedByCurrentUser/superlikedByCurrentUser
      const validPlayerId = playerId && players[playerId] ? playerId : null;

      if (numTotalPlayers > 0 && (totalUniqueLikers.size / numTotalPlayers) >= consensus_threshold) {
        calculatedMatches.push({
          ...restaurant,
          likedBy: likedByPlayerIds.map(pId => players[pId]?.name || 'A player'),
          superlikedBy: superlikedByPlayerIds.map(pId => players[pId]?.name || 'A player'),
          allLikers: Array.from(totalUniqueLikers).map(pId => players[pId]).filter(Boolean), // Filter out undefined players if any pId was bad
          likedByCurrentUser: validPlayerId ? likedByPlayerIds.includes(validPlayerId) : false,
          superlikedByCurrentUser: validPlayerId ? superlikedByPlayerIds.includes(validPlayerId) : false,
        });
      }
    }
    return calculatedMatches.sort((a,b) => (b.superlikedBy.length - a.superlikedBy.length) || (b.likedBy.length - a.likedBy.length));
  }, [sessionState, playerId]); // Added playerId to dependency array

  if (contextIsLoading && !sessionState) {
    return <Container sx={{ mt: 5, textAlign: 'center' }}><CircularProgress /><Typography>Loading results...</Typography></Container>;
  }
  if (contextError) {
    return (
      <Container sx={{ mt: 5, textAlign: 'center' }}>
        <Alert severity="error">Session Error: {contextError}</Alert>
        <Button onClick={() => { clearSessionData(); navigate('/'); }} sx={{mt:2}}>Go Home</Button>
      </Container>
    );
  }
  if (!sessionState || sessionState.status !== 'completed') {
    return <Container sx={{ mt: 5, textAlign: 'center' }}><Typography>Waiting for session to complete...</Typography><CircularProgress sx={{mt:2}}/></Container>;
  }

  const handlePlayAgain = () => {
    clearSessionData();
    navigate('/create-session');
  };

  const handleGoHome = () => {
    clearSessionData();
    navigate('/');
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Paper elevation={3} sx={{ p: { xs: 2, sm: 4 }, borderRadius: 2, textAlign: 'center' }}>
        <EmojiEvents color="warning" sx={{ fontSize: 60, mb: 2 }} />
        <Typography variant="h3" component="h1" gutterBottom>
          Session Results!
        </Typography>

        {finalMatches.length > 0 ? (
          <Typography variant="h5" color="text.secondary" sx={{ mb: 4 }}>
            Here are the restaurants you all agreed on:
          </Typography>
        ) : (
          <Typography variant="h5" color="text.secondary" sx={{ mb: 4 }}>
            No consensus matches this time. Try again with different options or a bigger group!
          </Typography>
        )}
      </Paper>

      <Grid container spacing={3} sx={{ mt: 2 }}>
        {finalMatches.map((restaurant) => {
          // Ensure all required props are properly defined
          const safeProps = {
            restaurant: restaurant || {},
            isMatched: true,
            showMatchDetails: true,
            allLikers: Array.isArray(restaurant?.allLikers) ? restaurant.allLikers : [],
            likedByCurrentUser: Boolean(restaurant?.likedByCurrentUser),
            superlikedByCurrentUser: Boolean(restaurant?.superlikedByCurrentUser),
            viewingPlayerId: playerId || null,
            key: restaurant?.id || `restaurant-${Math.random().toString(36).substr(2, 9)}`
          };
          
          return (
            <Grid item xs={12} sm={6} md={4} key={safeProps.key}>
              <RestaurantCard {...safeProps} />
            </Grid>
          );
        })}
      </Grid>

      <Box sx={{ mt: 5, display: 'flex', justifyContent: 'center', gap: 2, flexWrap: 'wrap' }}>
        <Button variant="contained" color="primary" onClick={handlePlayAgain} startIcon={<Replay />} size="large">
          Play Again (New Session)
        </Button>
        <Button variant="outlined" color="secondary" onClick={handleGoHome} startIcon={<Home />} size="large">
          Back to Home
        </Button>
      </Box>
    </Container>
  );
}

export default ResultsPage;

