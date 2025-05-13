import React from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { Button, Container, Typography, Box, Paper } from '@mui/material';

function HomePage() {
  return (
    <Container component="main" maxWidth="sm" sx={{ mt: 8 }}>
      <Paper elevation={3} sx={{ p: 4, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <Typography component="h1" variant="h4" gutterBottom>
          Vegan Restaurant Matcher
        </Typography>
        <Typography variant="subtitle1" color="text.secondary" sx={{ mb: 4 }}>
          Find the perfect vegan spot, together or on your own!
        </Typography>

        <Box sx={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Button
            component={RouterLink}
            to="/single-player-setup"
            variant="contained"
            color="primary"
            fullWidth
            size="large"
          >
            Single Player Mode
          </Button>

          <Button
            component={RouterLink}
            to="/create-session"
            variant="contained"
            color="secondary"
            fullWidth
            size="large"
          >
            Create Group Session
          </Button>

          <Button
            component={RouterLink}
            to="/join"
            variant="outlined"
            color="secondary"
            fullWidth
            size="large"
          >
            Join Group Session
          </Button>
        </Box>
      </Paper>
    </Container>
  );
}

export default HomePage; 