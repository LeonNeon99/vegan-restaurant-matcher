import React, { useState } from 'react';
import { Box, Button, Typography, Card, CardContent, CardMedia, IconButton, Stack } from '@mui/material';
import FavoriteIcon from '@mui/icons-material/Favorite';
import CloseIcon from '@mui/icons-material/Close';
import InfoIcon from '@mui/icons-material/Info';
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';

export default function MatchPage({ restaurants, onLike, onDislike, currentIdx }) {
  const [galleryIdx, setGalleryIdx] = useState(0);
  if (!restaurants || restaurants.length === 0) return <Typography>No restaurants found.</Typography>;
  const biz = restaurants[currentIdx];
  const images = biz.photos && biz.photos.length > 0 ? biz.photos : [biz.image_url];

  return (
    <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
      <Card sx={{ width: 350, borderRadius: 4, boxShadow: 6 }}>
        <CardContent sx={{ p: 2 }}>
          <Typography variant="h5" align="center" gutterBottom>{biz.name}</Typography>
          <Box display="flex" alignItems="center" justifyContent="center" sx={{ mb: 1 }}>
            <IconButton onClick={() => setGalleryIdx(idx => Math.max(idx - 1, 0))} disabled={galleryIdx === 0}>
              <ArrowBackIosNewIcon />
            </IconButton>
            <CardMedia
              component="img"
              height="180"
              image={images[galleryIdx]}
              alt={biz.name}
              sx={{ objectFit: 'cover', borderRadius: 2, mx: 1 }}
            />
            <IconButton onClick={() => setGalleryIdx(idx => Math.min(idx + 1, images.length - 1))} disabled={galleryIdx === images.length - 1}>
              <ArrowForwardIosIcon />
            </IconButton>
          </Box>
          <Typography align="center" color="text.secondary" gutterBottom>
            {biz.categories ? biz.categories.map(cat => cat.title).join(', ') : ''}
          </Typography>
          <Typography align="center">⭐ {biz.rating} ({biz.review_count} reviews)</Typography>
          <Stack direction="row" justifyContent="center" spacing={2} sx={{ mt: 2 }}>
            <IconButton color="error" onClick={() => onDislike(biz)} size="large"><CloseIcon fontSize="inherit" /></IconButton>
            <IconButton color="info" onClick={() => window.open(biz.url, '_blank')} size="large"><InfoIcon fontSize="inherit" /></IconButton>
            <IconButton color="success" onClick={() => onLike(biz)} size="large"><FavoriteIcon fontSize="inherit" /></IconButton>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
}
