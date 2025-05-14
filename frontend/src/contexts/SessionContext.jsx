import React, { createContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export const SessionContext = createContext(null);

export function SessionProvider({ children }) {
  const [sessionId, setSessionId] = useState(localStorage.getItem('sessionId'));
  const [playerId, setPlayerId] = useState(localStorage.getItem('playerId'));
  const [playerName, setPlayerName] = useState(localStorage.getItem('playerName'));
  const [isHost, setIsHost] = useState(localStorage.getItem('isHost') === 'true');
  
  const [sessionState, setSessionState] = useState(null); // Full state from WebSocket
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const [ws, setWs] = useState(null);
  const [isConnected, setIsConnected] = useState(false);

  // Save to localStorage
  useEffect(() => {
    if (sessionId) localStorage.setItem('sessionId', sessionId); else localStorage.removeItem('sessionId');
    if (playerId) localStorage.setItem('playerId', playerId); else localStorage.removeItem('playerId');
    if (playerName) localStorage.setItem('playerName', playerName); else localStorage.removeItem('playerName');
    localStorage.setItem('isHost', isHost);
  }, [sessionId, playerId, playerName, isHost]);

  // WebSocket connection logic
  useEffect(() => {
    if (!sessionId || !playerId) {
      if (ws) {
        ws.close();
        setWs(null);
        setIsConnected(false);
      }
      return;
    }

    const wsUrl = `${API_BASE_URL.replace(/^http/, 'ws')}/ws/${sessionId}/${playerId}`;
    const newWs = new WebSocket(wsUrl);

    newWs.onopen = () => {
      console.log('WebSocket connected');
      setIsConnected(true);
      // Optionally send a "client_ready" or "get_initial_state" message
    };

    newWs.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        console.log('WS Message Received:', message);
        if (message.type === 'state_update') {
          setSessionState(message.data);
          setError(null);
        } else if (message.type === 'error') {
          setError(message.message || 'An error occurred in the session.');
          // Potentially clear session if error is critical (e.g. session_not_found)
          if (message.message.toLowerCase().includes('session not found') || message.message.toLowerCase().includes('player not found')) {
            clearSessionData();
          }
        }
        // Handle other message types (player_joined, match_found, etc.)
      } catch (e) {
        console.error('Error processing WebSocket message:', e);
        setError('Received an invalid message from the server.');
      }
    };

    newWs.onclose = () => {
      console.log('WebSocket disconnected');
      setIsConnected(false);
      // Optionally attempt auto-reconnect with backoff, or prompt user
    };

    newWs.onerror = (err) => {
      console.error('WebSocket error:', err);
      setError('WebSocket connection error.');
      setIsConnected(false);
    };
    
    setWs(newWs);

    return () => {
      if (newWs.readyState === WebSocket.OPEN || newWs.readyState === WebSocket.CONNECTING) {
        newWs.close();
      }
      setWs(null);
      setIsConnected(false);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps 
  }, [sessionId, playerId]); // Added clearSessionData to deps of onmessage, so clearSessionData needs to be stable.
                           // The WebSocket useEffect itself should *not* depend on clearSessionData here directly.
                           // The call to clearSessionData from onmessage is the concern.


  const clearSessionData = useCallback(() => {
    setSessionId(null);
    setPlayerId(null);
    setPlayerName(null);
    setIsHost(false);
    setSessionState(null);
    if(ws && ws.readyState === WebSocket.OPEN) { // Check if ws exists and is open before closing
        ws.close();
    }
    setWs(null);
    setIsConnected(false);
    localStorage.removeItem('sessionId');
    localStorage.removeItem('playerId');
    localStorage.removeItem('playerName');
    localStorage.removeItem('isHost');
  }, [ws]); // ws is a dependency because we use it in the function body

  const createNewSession = useCallback(async (createRequest) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await axios.post(`${API_BASE_URL}/sessions/create`, createRequest);
      const { session_id, player_id, invite_url } = response.data;
      
      setSessionId(session_id);
      setPlayerId(player_id);
      setPlayerName(createRequest.host_name);
      setIsHost(true);
      return { session_id, player_id, invite_url };
    } catch (err) {
      console.error('Create session error (context):', err);
      setError(err.response?.data?.detail || 'Could not create session.');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const joinExistingSession = useCallback(async (sId, pName) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await axios.post(`${API_BASE_URL}/sessions/${sId}/join`, { player_name: pName });
      const { player_id } = response.data;

      setSessionId(sId);
      setPlayerId(player_id);
      setPlayerName(pName);
      setIsHost(false);
      return { session_id: sId, player_id };
    } catch (err) {
      console.error('Join session error (context):', err);
      setError(err.response?.data?.detail || 'Could not join session.');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const sendWebSocketMessage = useCallback((message) => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    } else {
      console.error('WebSocket not connected or not ready to send message.');
      // setError('Not connected to session. Please try again.'); // Maybe too noisy
    }
  }, [ws]);

  const swipe = useCallback((restaurantId, decision) => {
    sendWebSocketMessage({
      action: 'swipe',
      restaurant_id: restaurantId,
      decision: decision,
    });
  }, [sendWebSocketMessage]);
  
  const setReadyStatus = useCallback((isReady) => {
    sendWebSocketMessage({
      action: 'set_ready',
      ready: isReady,
    });
  }, [sendWebSocketMessage]);

  const finishEarly = useCallback(() => {
    sendWebSocketMessage({
      action: 'finish_early',
    });
  }, [sendWebSocketMessage]);

  const value = {
    sessionId,
    playerId,
    playerName,
    isHost,
    sessionState,
    isLoading, // Combined loading state for API calls via context
    error,    // Combined error state
    isConnected, // WebSocket connection status
    
    createNewSession,
    joinExistingSession,
    sendWebSocketMessage, // Generic sender
    swipe,
    setReadyStatus,
    finishEarly, // New method to finish early
    clearSessionData, // To logout/leave session
    setSessionIdExternally: setSessionId, // For URL parsing on join
    setPlayerIdExternally: setPlayerId,   // For URL parsing on join
  };

  return (
    <SessionContext.Provider value={value}>
      {children}
    </SessionContext.Provider>
  );
} 