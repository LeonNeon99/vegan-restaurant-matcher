import React, { useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { SessionContext } from '../contexts/SessionContext';
import { Box, Button, Container, Paper, Typography, List, ListItem, ListItemText, ListItemSecondaryAction, IconButton, CircularProgress, Alert, TextField, Grid, Chip } from '@mui/material';
import { CheckCircleOutline, RadioButtonUncheckedOutlined, ContentCopy, PlayArrow, ExitToApp } from '@mui/icons-material';

// const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'; // Not used directly

function WaitingRoomPage() {
  const {
    sessionState,
    isHost,
    playerId,
    sendWebSocketMessage,
    clearSessionData,
    isLoading: contextIsLoading, // Renamed from isLoading for clarity with page-level loading
    error: contextError
  } = useContext(SessionContext);
  const navigate = useNavigate();

  // Loading and error states specific to this page or initial session load handled by SessionActiveDisplay mostly.
  // This component assumes sessionState is available and status is 'waiting_for_players'.
  // However, adding a check for sessionState for robustness.
  if (!sessionState) { 
    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', bgcolor: 'grey.100', py: 4 }}>
            <Container maxWidth="sm" sx={{textAlign: 'center'}}>
                <CircularProgress />
                <Typography sx={{mt:1}}>Loading session details...</Typography>
            </Container>
        </Box>
    );
  }
  // Context error should ideally be caught by SessionActiveDisplay, but as a fallback:
  if (contextError) return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', bgcolor: 'grey.100', py: 4 }}>
        <Container maxWidth="sm" sx={{textAlign: 'center'}}>
            <Alert severity="error">Session Error: {contextError}</Alert>
            <Button onClick={() => { clearSessionData(); navigate('/'); }} sx={{ mt: 2 }}>Go Home</Button>
        </Container>
    </Box>
  );


  const { id: sessionId, players = {}, max_players, invite_url, host_id } = sessionState;
  const currentPlayer = players[playerId];

  const handleSetReady = () => {
    if (currentPlayer) {
      sendWebSocketMessage({ action: 'set_ready', ready: !currentPlayer.ready });
    }
  };

  const handleStartSession = () => {
    if (isHost) {
      sendWebSocketMessage({ action: 'start_session' });
    }
  };

  const handleLeaveSession = () => {
    clearSessionData();
    navigate('/');
  };

  const inviteLink = invite_url || `${window.location.origin}/join?session=${sessionId}`;
  
  // At least 2 players needed to start typically, or 1 if you want to allow solo testing by host
  const canStartSession = isHost && Object.values(players).length >= 1 && Object.values(players).every(p => p.ready); 


  return (
    <Box 
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'flex-start', // Content starts from top
        minHeight: '100vh',
        bgcolor: 'grey.100',
        py: 4,
        overflowY: 'auto'
      }}
    >
      <Container maxWidth="md" sx={{ borderRadius: 2 }}> {/* Container holds the Paper */}
        <Paper elevation={3} sx={{ p: { xs: 2, sm: 4 }, borderRadius: 2 }}>
          <Typography variant="h4" component="h1" gutterBottom align="center">
            Waiting Room
          </Typography>
          <Typography variant="subtitle1" align="center" color="text.secondary" sx={{ mb: 2 }}>
            Session ID: {sessionId}
          </Typography>

          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" gutterBottom>Invite Friends:</Typography>
            <TextField
              fullWidth
              value={inviteLink}
              readOnly
              InputProps={{
                endAdornment: (
                  <IconButton onClick={() => navigator.clipboard.writeText(inviteLink)} edge="end">
                    <ContentCopy />
                  </IconButton>
                )
              }}
              label="Invite Link"
              variant="outlined"
            />
          </Box>

          <Typography variant="h6" gutterBottom>
            Players ({Object.keys(players).length}/{max_players})
          </Typography>
          <List sx={{ mb: 3, border: '1px solid #ddd', borderRadius: 1 }}>
            {Object.values(players).map((p) => (
              <ListItem key={p.id} divider>
                <ListItemText 
                  primary={<Typography variant="body1">{p.name} {p.id === host_id ? <Chip label="Host" size="small" color="secondary"/> : ''} {p.id === playerId ? <Chip label="You" size="small" color="primary" /> : ''}</Typography>}
                  secondary={p.connected ? 'Online' : 'Offline'}
                />
                <ListItemSecondaryAction>
                  {p.ready ? 
                    <CheckCircleOutline color="success" sx={{mr:1}} /> : 
                    <RadioButtonUncheckedOutlined color="action" sx={{mr:1}} />}
                    {p.ready ? "Ready" : "Not Ready"}
                </ListItemSecondaryAction>
              </ListItem>
            ))}
          </List>

          <Grid container spacing={2} justifyContent="center">
            {currentPlayer && (
              <Grid item xs={12} sm={isHost ? 6 : 12}>
                <Button
                  fullWidth
                  variant={currentPlayer.ready ? "outlined" : "contained"}
                  color="primary"
                  onClick={handleSetReady}
                  startIcon={currentPlayer.ready ? <RadioButtonUncheckedOutlined /> : <CheckCircleOutline />}
                  size="large"
                >
                  {currentPlayer.ready ? 'Set as Not Ready' : 'Set as Ready'}
                </Button>
              </Grid>
            )}
            {isHost && (
              <Grid item xs={12} sm={6}>
                <Button
                  fullWidth
                  variant="contained"
                  color="success"
                  onClick={handleStartSession}
                  disabled={!canStartSession} 
                  startIcon={<PlayArrow />}
                  size="large"
                >
                  Start Session
                </Button>
              </Grid>
            )}
          </Grid>

          <Box sx={{ mt: 4, textAlign: 'center' }}>
            <Button 
              variant="outlined"
              color="error"
              onClick={handleLeaveSession}
              startIcon={<ExitToApp />}
            >
              Leave Session
            </Button>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
}

export default WaitingRoomPage; 