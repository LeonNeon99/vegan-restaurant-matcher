import React, { useState, useEffect, useContext } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { Box, Button, TextField, Typography, Container, Paper, CircularProgress, Alert } from '@mui/material';
import { SessionContext } from '../contexts/SessionContext'; 
// import axios from 'axios'; // No longer directly using axios for join

// const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'; // Not needed if context handles API calls

export default function JoinSessionPage() {
  const { joinExistingSession, isLoading: contextIsLoading, error: contextError, clearSessionData } = useContext(SessionContext);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const sessionIdFromQuery = searchParams.get('session');

  // Clear any existing session data when landing on this page
  useEffect(() => {
    clearSessionData();
  }, [clearSessionData]);

  const [playerName, setPlayerName] = useState('');
  const [sessionIdInput, setSessionIdInput] = useState(sessionIdFromQuery || '');
  // const [sessionDetails, setSessionDetails] = useState(null); // Optional: for session preview, not critical now
  
  const [formError, setFormError] = useState(''); // Local form error

  // Optional: Fetch basic session details to show the user what they are joining (can be added later)
  // useEffect(() => {
  //   if (sessionIdInput) {
  //     // Fetch preview logic here if needed
  //   }
  // }, [sessionIdInput]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!playerName || !sessionIdInput) {
      setFormError('Your name and a session ID are required.');
      return;
    }
    setFormError('');

    try {
      const joinData = await joinExistingSession(sessionIdInput, playerName); // Use context function
      
      console.log("Joined session via context:", joinData);
      // SessionContext now has session_id and player_id set.
      // Navigate to the session page; SessionActiveDisplay will use context.
      navigate(`/session/${joinData.session_id}/player/${joinData.player_id}`);
      
    } catch (err) {
      console.error("Join Session Error (from page submit):", err);
      setFormError(err.message || contextError || 'Failed to join session. Please check the Session ID or link.');
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', bgcolor: 'grey.100', py: 4 }}>
      <Container maxWidth="xs">
        <Paper elevation={6} sx={{ p: 4, borderRadius: 2 }}> {/* Consistent borderRadius */}
          <Typography variant="h4" align="center" gutterBottom>Join Session</Typography>
          {/* {sessionDetails && ( ... preview UI ... )} */}
          <Box component="form" onSubmit={handleSubmit}>
            <TextField
              fullWidth
              label="Session ID"
              value={sessionIdInput}
              onChange={e => setSessionIdInput(e.target.value)}
              sx={{ mb: 2 }}
              disabled={contextIsLoading || !!sessionIdFromQuery} 
              InputProps={{
                readOnly: !!sessionIdFromQuery,
              }}
            />
            <TextField 
              fullWidth 
              label="Your Name" 
              value={playerName} 
              onChange={e => setPlayerName(e.target.value)} 
              sx={{ mb: 2 }} 
              disabled={contextIsLoading}
            />
            
            {formError && <Alert severity="error" sx={{ mt: 2, mb: 2 }}>{formError}</Alert>}
            {contextError && !formError && <Alert severity="error" sx={{mt:2, mb:2}}>{contextError}</Alert>} {/* Show context error */}
            <Button 
              fullWidth 
              variant="contained" 
              type="submit" 
              size="large" 
              disabled={contextIsLoading}
              sx={{ mt: 2 }}
            >
              {contextIsLoading ? <CircularProgress size={24} color="inherit" /> : 'Join Session'}
            </Button>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
} 