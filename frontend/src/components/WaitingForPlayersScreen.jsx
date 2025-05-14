import React from 'react';
import { Box, Typography, CircularProgress, Paper } from '@mui/material';
import { useSession } from '../contexts/SessionContext';

const WaitingForPlayersScreen = () => {
  const { sessionState, playerId } = useSession();
  
  // Get the names of players who haven't finished yet
  const unfinishedPlayers = React.useMemo(() => {
    if (!sessionState?.players) return [];
    
    const finishedPlayerIds = new Set(sessionState.finished_players || []);
    return Object.entries(sessionState.players)
      .filter(([id, player]) => !finishedPlayerIds.has(id) && id !== playerId)
      .map(([_, player]) => player.name);
  }, [sessionState, playerId]);

  return (
    <Box sx={{ 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      justifyContent: 'center', 
      minHeight: '70vh',
      p: 3,
      textAlign: 'center'
    }}>
      <Paper elevation={3} sx={{ p: 4, borderRadius: 2, maxWidth: 600, width: '100%' }}>
        <Typography variant="h4" component="h1" gutterBottom color="primary">
          🎉 You've Finished!
        </Typography>
        
        <Typography variant="body1" sx={{ mt: 2, mb: 4 }}>
          Waiting for other players to finish...
        </Typography>
        
        <CircularProgress size={60} thickness={4} sx={{ mb: 4 }} />
        
        {unfinishedPlayers.length > 0 && (
          <Box sx={{ mt: 3, textAlign: 'left' }}>
            <Typography variant="subtitle1" gutterBottom>
              Still waiting on:
            </Typography>
            <ul style={{ margin: 0, paddingLeft: 20 }}>
              {unfinishedPlayers.map((name, index) => (
                <li key={index}>
                  <Typography variant="body1">{name}</Typography>
                </li>
              ))}
            </ul>
          </Box>
        )}
        
        <Typography variant="body2" color="text.secondary" sx={{ mt: 3, fontStyle: 'italic' }}>
          The results will be shown once all players have finished.
        </Typography>
      </Paper>
    </Box>
  );
};

export default WaitingForPlayersScreen;
