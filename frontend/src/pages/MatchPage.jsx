import React from 'react';
import { Box, Button, Typography, Stack, CircularProgress, LinearProgress, IconButton } from '@mui/material';
import FavoriteIcon from '@mui/icons-material/Favorite';
import CloseIcon from '@mui/icons-material/Close';
import StarIcon from '@mui/icons-material/Star';

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

  const handleDislikeClick = () => onDislike(biz.id);
  const handleLikeClick = () => onLike(biz.id);
  const handleSuperlikeClick = () => onSuperlike(biz.id);

  return (
    <Box sx={{
      minHeight: '100vh', 
      width: '100vw', 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      bgcolor: 'background.default', 
      p: 2,
      pt: { xs: 2, md: 5 }
    }}>
      <Typography variant="h4" align="center" sx={{ mb: 2 }}>{player ? `Player: ${player}` : ''}</Typography>
      <Box sx={{ 
        width: { xs: '95vw', sm: 450, md: 500 },
        maxWidth: '100%',
        mb: 2 
      }}> 
        <LinearProgress variant="determinate" value={progress} sx={{ height: 10, borderRadius: 5 }} />
      </Box>

      <Box sx={{ 
        width: { xs: '95vw', sm: 450, md: 500 },
        maxWidth: '100%' 
      }}>
        <RestaurantCard 
          restaurant={biz} 
          hideButtons={true} 
          isMatched={false} 
        />
      </Box>

      <Stack direction="row" justifyContent="center" spacing={3} sx={{ mt: 3, mb: 3 }}>
        <IconButton color="error" onClick={handleDislikeClick} size="large" sx={{ border: '2px solid', borderColor: 'error.light', width: 64, height: 64 }}>
          <CloseIcon fontSize="inherit" />
        </IconButton>
        <IconButton 
          color="primary" 
          onClick={handleSuperlikeClick} 
          size="large" 
          sx={{ 
            border: '2px solid', 
            borderColor: checkSuperliked ? 'primary.main' : 'primary.light',
            width: 64, 
            height: 64,
            transform: 'scale(1.1)',
            bgcolor: checkSuperliked ? 'primary.light' : 'transparent'
          }}
        >
          <StarIcon fontSize="inherit" />
        </IconButton>
        <IconButton color="success" onClick={handleLikeClick} size="large" sx={{ border: '2px solid', borderColor: 'success.light', width: 64, height: 64 }}>
          <FavoriteIcon fontSize="inherit" />
        </IconButton>
      </Stack>

      <Box display="flex" justifyContent="center"> 
        <Button variant="outlined" color="primary" onClick={onFinish} sx={{ minWidth: 180 }}>
          {currentIdx === restaurants.length - 1 ? 'Finish & See Matches' : 'Finish Turn'}
        </Button>
      </Box>
    </Box>
  );
}
