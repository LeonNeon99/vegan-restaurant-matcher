import React, { useState } from 'react';
import { Box, Button, Typography, Card, CardContent, CardMedia, IconButton, Stack } from '@mui/material';
import FavoriteIcon from '@mui/icons-material/Favorite';
import CloseIcon from '@mui/icons-material/Close';
import InfoIcon from '@mui/icons-material/Info';
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';

import { LinearProgress, Collapse } from '@mui/material';

export default function MatchPage({ restaurants, onLike, onDislike, currentIdx, player, onFinish }) {
  const [galleryIdx, setGalleryIdx] = useState(0);
  const [infoOpen, setInfoOpen] = useState(false);
  if (!restaurants || restaurants.length === 0) return <Typography>No restaurants found.</Typography>;
  const biz = restaurants[currentIdx];
  const images = biz.photos && biz.photos.length > 0 ? biz.photos : [biz.image_url];
  const progress = ((currentIdx + 1) / restaurants.length) * 100;

  return (
    <Box sx={{ minHeight: '100vh', width: '100vw', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', bgcolor: 'background.default' }}>
      <Typography variant="h4" align="center" sx={{ mb: 2 }}>{player ? `Player: ${player}` : ''}</Typography>
      <Box sx={{ width: 500, maxWidth: '95vw', mb: 2 }}>
        <LinearProgress variant="determinate" value={progress} sx={{ height: 12, borderRadius: 6 }} />
      </Box>
      <Card sx={{ width: 500, maxWidth: '95vw', borderRadius: 6, boxShadow: 8, p: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <CardContent sx={{ width: '100%' }}>
          <Typography variant="h5" align="center" gutterBottom>{biz.name}</Typography>
          <Box display="flex" alignItems="center" justifyContent="center" sx={{ mb: 2 }}>
            <IconButton onClick={() => setGalleryIdx(idx => Math.max(idx - 1, 0))} disabled={galleryIdx === 0}>
              <ArrowBackIosNewIcon />
            </IconButton>
            <CardMedia
              component="img"
              height="240"
              image={images[galleryIdx]}
              alt={biz.name}
              sx={{ objectFit: 'cover', borderRadius: 3, mx: 1, width: 320 }}
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
            <IconButton color="info" onClick={() => setInfoOpen(o => !o)} size="large"><InfoIcon fontSize="inherit" /></IconButton>
            <IconButton color="success" onClick={() => onLike(biz)} size="large"><FavoriteIcon fontSize="inherit" /></IconButton>
          </Stack>
          <Collapse in={infoOpen}>
            <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 2, border: '1px solid #eee' }}>
              <Typography gutterBottom><b>Address:</b> {biz.location && biz.location.display_address ? biz.location.display_address.join(', ') : ''}</Typography>
              <Typography gutterBottom><b>Phone:</b> {biz.display_phone || 'N/A'}</Typography>
              <Typography gutterBottom><b>Rating:</b> {biz.rating} ({biz.review_count} reviews)</Typography>
              <Typography gutterBottom><b>Price:</b> {biz.price || 'N/A'}</Typography>
              <Typography gutterBottom><b>Categories:</b> {biz.categories ? biz.categories.map(cat => cat.title).join(', ') : ''}</Typography>
              <Stack direction="row" spacing={2} sx={{ mt: 1 }}>
                <Button onClick={() => window.open(biz.url, '_blank')} color="info" variant="contained">View on Yelp</Button>
                {biz.menu_url && <Button onClick={() => window.open(biz.menu_url, '_blank')} color="secondary" variant="outlined">View Menu</Button>}
              </Stack>
            </Box>
          </Collapse>
          <Box display="flex" justifyContent="center" sx={{ mt: 3 }}>
            <Button variant="outlined" color="primary" onClick={onFinish} sx={{ minWidth: 180 }}>Finish & Switch Player</Button>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}
