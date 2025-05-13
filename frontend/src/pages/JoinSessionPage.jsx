import React, { useState, useEffect, useContext } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { Box, Button, TextField, Typography, Container, Paper, CircularProgress, Alert } from '@mui/material';
// import { SessionContext } from '../contexts/SessionContext'; // Will be used later
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export default function JoinSessionPage() {
  // const { joinSession, isLoading: contextLoading, error: contextError } = useContext(SessionContext); // Will be used later
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const sessionIdFromQuery = searchParams.get('session');

  const [playerName, setPlayerName] = useState('');
  const [sessionId, setSessionId] = useState(sessionIdFromQuery || '');
  const [sessionDetails, setSessionDetails] = useState(null); // To store basic session info
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Optional: Fetch basic session details to show the user what they are joining
  useEffect(() => {
    if (sessionId) {
      const fetchDetails = async () => {
        // In a real app, you might have a lightweight endpoint to get session metadata
        // For now, we'll just assume the session ID is valid and proceed
        // Example:
        // try {
        //   const response = await axios.get(`${API_BASE_URL}/sessions/${sessionId}/preview`);
        //   setSessionDetails(response.data);
        // } catch (fetchErr) {
        //   setError('Could not retrieve session details. Ensure the link is correct.');
        // }
      };
      // fetchDetails(); 
    }
  }, [sessionId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!playerName || !sessionId) {
      setError('Your name and a session ID are required.');
      return;
    }
    setError('');
    setIsLoading(true);

    try {
      // const joinData = await joinSession(sessionId, playerName); // Context function
      const response = await axios.post(`${API_BASE_URL}/sessions/${sessionId}/join`, { player_name: playerName });
      const joinData = response.data;

      console.log("Joined session:", joinData);
      // Navigate to the session/match page, passing player ID
      // This will require the WebSocket connection to be established by the next page
      navigate(`/session/${joinData.session_id}/player/${joinData.player_id}`);
      
    } catch (err) {
      console.error("Join Session Error:", err);
      setError(err.response?.data?.detail || 'Failed to join session. Please check the Session ID or link.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', width: '100vw', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', bgcolor: 'grey.100', py: 4 }}>
      <Container maxWidth="xs">
        <Paper elevation={6} sx={{ p: 4, borderRadius: 4 }}>
          <Typography variant="h4" align="center" gutterBottom>Join Session</Typography>
          {sessionDetails && (
            <Box sx={{mb: 2, p:1, border: '1px solid #eee', borderRadius:1}}>
              <Typography variant="body2">Joining session for: {sessionDetails.location}</Typography>
              <Typography variant="caption">Hosted by: {sessionDetails.hostName}</Typography>
            </Box>
          )}
          <Box component="form" onSubmit={handleSubmit}>
            <TextField
              fullWidth
              label="Session ID"
              value={sessionId}
              onChange={e => setSessionId(e.target.value)}
              sx={{ mb: 2 }}
              disabled={isLoading || !!sessionIdFromQuery} // Disable if from query param
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
              disabled={isLoading}
            />
            
            {error && <Alert severity="error" sx={{ mt: 2, mb: 2 }}>{error}</Alert>}
            <Button 
              fullWidth 
              variant="contained" 
              type="submit" 
              size="large" 
              disabled={isLoading}
              sx={{ mt: 2 }}
            >
              {isLoading ? <CircularProgress size={24} color="inherit" /> : 'Join Session'}
            </Button>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
} 