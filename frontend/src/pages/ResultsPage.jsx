import React from 'react';
import { Box, Button, Typography, Card, CardContent, Container, Stack, Paper, Rating, Grid, CardMedia } from '@mui/material';

import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import StarIcon from '@mui/icons-material/Star';

export default function ResultsPage({ matches, player1Superlikes, player2Superlikes, onRestart }) {
  const p1SuperlikedIds = new Set(player1Superlikes.map(r => r.id));
  const p2SuperlikedIds = new Set(player2Superlikes.map(r => r.id));

  return (
    <Container maxWidth="md" sx={{ mt: { xs: 3, md: 6 }, mb: 4 }}>
      <Paper elevation={3} sx={{ borderRadius: 4, p: { xs: 2, md: 4 }, bgcolor: 'background.paper' }}>
        <Typography variant="h3" align="center" gutterBottom sx={{ fontWeight: 'bold', color: 'primary.main' }}>
          It's a Match!
        </Typography>
        <Typography variant="h6" align="center" color="text.secondary" sx={{ mb: 4 }}>
          You both liked these restaurants:
        </Typography>
        
        {matches.length === 0 ? (
          <Typography align="center" sx={{ my: 4 }}>No mutual likes found. Maybe try adjusting your filters?</Typography>
        ) : (
          <Grid container spacing={3} justifyContent="center">
            {matches.map((biz, idx) => {
              const isP1Superlike = p1SuperlikedIds.has(biz.id);
              const isP2Superlike = p2SuperlikedIds.has(biz.id);
              const wasSuperliked = isP1Superlike || isP2Superlike;

              return (
                <Grid item key={biz.id || idx} xs={12} sm={6} md={4}>
                  <Card sx={{ 
                    borderRadius: 3, 
                    height: '100%', 
                    display: 'flex', 
                    flexDirection: 'column',
                    border: wasSuperliked ? '2px solid' : '1px solid',
                    borderColor: wasSuperliked ? 'primary.main' : 'grey.300'
                  }}>
                    <CardMedia 
                      component="img" 
                      height="140"
                      image={biz.image_url || 'https://via.placeholder.com/345x140.png?text=No+Image'}
                      alt={biz.name}
                      sx={{ objectFit: 'cover' }} 
                    />
                    <CardContent sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                      <Typography variant="h6" gutterBottom sx={{ fontWeight: 500 }}>{biz.name}</Typography>
                      
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <Rating name="read-only" value={biz.rating} precision={0.5} readOnly size="small"/>
                        <Typography variant="body2" color="text.secondary" sx={{ ml: 1 }}>
                          ({biz.review_count} reviews)
                        </Typography>
                      </Box>
                      
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        {biz.location?.display_address?.join(', ') || 'Address not available'}
                      </Typography>
                      
                      {wasSuperliked && (
                        <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mb: 1, color: 'primary.main' }}>
                          <StarIcon fontSize="small" />
                          <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                            Superliked!
                          </Typography>
                        </Stack>
                      )}
                      
                      <Box sx={{ flexGrow: 1 }} /> 

                      <Button 
                        variant="outlined" 
                        href={biz.url} 
                        target="_blank" 
                        size="small"
                        sx={{ mt: 1, alignSelf: 'center' }}
                        disabled={!biz.url}
                      >
                        View on Yelp
                      </Button>
                    </CardContent>
                  </Card>
                </Grid>
              );
            })}
          </Grid>
        )}
        
        <Stack direction="row" justifyContent="center" sx={{ mt: 5 }}>
          <Button variant="contained" onClick={onRestart} size="large">
            Start New Search
          </Button>
        </Stack>
      </Paper>
    </Container>
  );
}

