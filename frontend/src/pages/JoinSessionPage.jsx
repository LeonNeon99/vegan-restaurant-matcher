import React, { useState, useEffect, useContext } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { Box, Button, TextField, Typography, Container, Paper, CircularProgress, Alert } from '@mui/material';
import { SessionContext } from '../contexts/SessionContext'; // Uncommented
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export default function JoinSessionPage() {
  const { joinExistingSession, isLoading: contextIsLoading, error: contextError, clearSessionData } = useContext(SessionContext); // Used context
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const sessionIdFromQuery = searchParams.get('session');

  useEffect(() => { // Added useEffect to clear session data
    clearSessionData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty dependency array

  const [playerName, setPlayerName] = useState('');
  const [sessionIdInput, setSessionIdInput] = useState(sessionIdFromQuery || ''); // Renamed to avoid clash with context sessionId
  // const [sessionDetails, setSessionDetails] = useState(null); // Can be removed for now if not used
  
  // const [isLoading, setIsLoading] = useState(false); // Will use contextIsLoading
  const [formError, setFormError] = useState(''); // Renamed error to formError

  // Optional: Fetch basic session details to show the user what they are joining
  useEffect(() => {
    if (sessionIdInput) {
      const fetchDetails = async () => {
        // In a real app, you might have a lightweight endpoint to get session metadata
        // For now, we'll just assume the session ID is valid and proceed
        // Example:
        // try {
        //   const response = await axios.get(`${API_BASE_URL}/sessions/${sessionIdInput}/preview`);
        //   setSessionDetails(response.data);
        // } catch (fetchErr) {
        //   setError('Could not retrieve session details. Ensure the link is correct.');
        // }
      };
      // fetchDetails(); 
    }
  }, [sessionIdInput]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!playerName || !sessionIdInput) {
      setFormError('Your name and a session ID are required.');
      return;
    }
    setFormError('');
    // setIsLoading(true); // Context will handle its own loading state

    try {
      // Use context function to join and set context state
      const joinDataFromContext = await joinExistingSession(sessionIdInput, playerName);

      console.log("Joined session via context:", joinDataFromContext);
      // Navigate to the session page. SessionContext should now have the necessary IDs.
      navigate(`/session/${joinDataFromContext.session_id}/player/${joinDataFromContext.player_id}`);
      
    } catch (err) {
      console.error("Join Session Error (from page submit):", err);
      // contextError should be set by joinExistingSession if it throws
      setFormError(err.message || contextError || 'Failed to join session. Please check the Session ID or link.');
    }
    // finally { setIsLoading(false); } // Context handles its loading state
  };

  return (
    <Box sx={{ minHeight: '100vh', width: '100vw', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', bgcolor: 'grey.100', py: 4 }}>
      <Container maxWidth="xs">
        <Paper elevation={6} sx={{ p: 4, borderRadius: 4 }}>
          <Typography variant="h4" align="center" gutterBottom>Join Session</Typography>
          {/* {sessionDetails && ( ... )} */}
          <Box component="form" onSubmit={handleSubmit}>
            <TextField
              fullWidth
              label="Session ID"
              value={sessionIdInput}
              onChange={e => setSessionIdInput(e.target.value)}
              sx={{ mb: 2 }}
              disabled={contextIsLoading || !!sessionIdFromQuery} // Disable if context is loading or from query
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
            {contextError && !formError && <Alert severity="error" sx={{ mt: 2, mb: 2 }}>{contextError}</Alert>}
            <Button 
              fullWidth 
              variant="contained" 
              type="submit" 
              size="large" 
              disabled={contextIsLoading} // Use contextIsLoading
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