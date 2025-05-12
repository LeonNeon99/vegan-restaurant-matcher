import React, { useState, useEffect } from 'react';
import { Box, Button, Typography, Stack, CircularProgress, LinearProgress } from '@mui/material';

import RestaurantCard from '../components/RestaurantCard';

export default function MatchPage({ 
  restaurants, 
  isLoading, 
  error, 
  onLike, 
  onDislike, 
  onSuperlike,
  isSuperliked,
  currentIdx, 
  player, 
  onFinish, 
  onRestart 
}) {
  if (isLoading) {
    return (
      <Box sx={{ minHeight: '100vh', width: '100vw', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', bgcolor: 'background.default', p: 2 }}>
        <CircularProgress size={60} sx={{ mb: 3 }}/>
        <Typography variant="h6" align="center">Finding vegan restaurants near you...</Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ minHeight: '100vh', width: '100vw', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', bgcolor: 'background.default', p: 2 }}>
        <Typography variant="h5" color="error" align="center" gutterBottom>Error Finding Restaurants</Typography>
        <Typography color="error" align="center" sx={{ mb: 3 }}>{error}</Typography>
        <Button variant="contained" onClick={onRestart}>Start Over</Button>
      </Box>
    );
  }
  
  if (!restaurants || restaurants.length === 0 || currentIdx >= restaurants.length) {
    return (
      <Box sx={{ minHeight: '100vh', width: '100vw', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', bgcolor: 'background.default', p: 2 }}>
        <Typography variant="h5" align="center" gutterBottom>No Restaurants Found</Typography>
        <Typography align="center" sx={{ mb: 3 }}>We couldn't find any vegan restaurants matching your current criteria. Please try adjusting the location, radius, or filters.</Typography>
        <Button variant="contained" onClick={onRestart}>Search Again</Button>
      </Box>
    );
  }

  const biz = restaurants[currentIdx];
  const progress = ((currentIdx + 1) / restaurants.length) * 100;

  const checkSuperliked = typeof isSuperliked === 'function' ? isSuperliked(biz.id) : false;

  return (
    <Box sx={{ minHeight: '100vh', width: '100vw', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', bgcolor: 'background.default', p: 2 }}>
      <Typography variant="h4" align="center" sx={{ mb: 2 }}>{player ? `Player: ${player}` : ''}</Typography>
      <Box sx={{ width: 345, maxWidth: '90vw', mb: 2 }}>
        <LinearProgress variant="determinate" value={progress} sx={{ height: 10, borderRadius: 5 }} />
      </Box>

      <RestaurantCard 
        restaurant={biz} 
        onLike={onLike}
        onDislike={onDislike}
        onSuperlike={onSuperlike}
        isSuperliked={checkSuperliked}
        hideButtons={false}
        isMatched={false}
      />

      <Box display="flex" justifyContent="center" sx={{ mt: 3 }}>
        <Button variant="outlined" color="primary" onClick={onFinish} sx={{ minWidth: 180 }}>
          {currentIdx === restaurants.length - 1 ? 'Finish & See Matches' : 'Finish Turn'}
        </Button>
      </Box>
    </Box>
  );
}
