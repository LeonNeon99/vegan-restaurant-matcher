import React from 'react';
import { Box, Button, Typography, Card, CardContent, Container, Stack } from '@mui/material';

import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import StarIcon from '@mui/icons-material/Star';

export default function ResultsPage({ matches, onRestart }) {
  return (
    <Container maxWidth="sm" sx={{ mt: 6 }}>
      <Card sx={{ borderRadius: 4, boxShadow: 6 }}>
        <CardContent>
          <Typography variant="h4" align="center" gutterBottom>Mutual Likes</Typography>
          {matches.length === 0 ? (
            <Typography align="center">No mutual likes found. Try again!</Typography>
          ) : (
            matches.map((biz, idx) => (
              <Box key={biz.id || idx} sx={{ my: 2, p: 2, border: '1px solid #eee', borderRadius: 2 }}>
                <Typography variant="h6">{biz.name}</Typography>
                <Typography color="text.secondary">{biz.location && biz.location.address1}</Typography>
                <Typography>⭐ {biz.rating} ({biz.review_count} reviews)</Typography>
                <Button variant="outlined" href={biz.url} target="_blank" sx={{ mt: 1 }}>View on Yelp</Button>
              </Box>
            ))
          )}
          <Stack direction="row" justifyContent="center" sx={{ mt: 4 }}>
            <Button variant="contained" onClick={onRestart}>Start New Search</Button>
          </Stack>
        </CardContent>
      </Card>
    </Container>
  );
}

