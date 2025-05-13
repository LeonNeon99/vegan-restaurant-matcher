import React, { useContext, useEffect, useState } from 'react';
import { Routes, Route, Navigate, Outlet, useParams, useNavigate } from 'react-router-dom';
import { Box, Button, Typography, Container, Paper, Stack, CircularProgress, Alert } from '@mui/material';
import axios from 'axios';

// Page Imports
import HomePage from './pages/HomePage'; // New: To be created
import CreateSessionPage from './pages/CreateSessionPage';
import JoinSessionPage from './pages/JoinSessionPage';
import MatchPage from './pages/MatchPage'; // Will be refactored to use context
import ResultsPage from './pages/ResultsPage'; // Will be refactored to use context
import SetupPage from './pages/SetupPage'; // Original setup, can be a fallback or new entry point
import WaitingRoomPage from './pages/WaitingRoomPage'; // Import the new WaitingRoomPage

import { SessionContext } from './contexts/SessionContext';

// Layout component for authenticated session routes
const SessionLayout = () => {
  const { sessionId, playerId, sessionState, error, isLoading, clearSessionData } = useContext(SessionContext);
  const navigate = useNavigate();
  const params = useParams(); // To get :sessionId and :playerId from URL

  // This is a simplified check. Ideally, playerId from URL should match context.
  if (!sessionId || !params.sessionId || (params.playerId && !playerId)) {
    // If no session ID in context, or URL doesn't match, redirect to home.
    // Or if playerId is in URL but not in context (meaning not properly joined/restored)
    console.log("SessionLayout: No active session or mismatched IDs, redirecting home.");
    // clearSessionData(); // Optional: clear any stale data before redirecting
    return <Navigate to="/" replace />;
  }
  
  // Potentially, could also check if params.sessionId matches context.sessionId
  // and params.playerId matches context.playerId if both are present.

  // Outlet will render child routes like MatchPage or ResultsPage based on sessionState.status
  return <Outlet />;
};

function App() {
  // Most of the old state and handlers are removed as they will be managed
  // by SessionContext or individual pages.

  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/create-session" element={<CreateSessionPage />} />
      <Route path="/join" element={<JoinSessionPage />} />
      
      {/* Route for an active session - uses SessionLayout to protect */}
      {/* The actual component rendered here (MatchPage/ResultsPage/WaitingRoom) 
          will depend on the sessionState.status from SessionContext */}
      <Route path="/session/:sessionId/player/:playerId" element={<SessionActiveDisplay />} />

      {/* Fallback for original single-player flow if needed for testing, or remove */}
      <Route path="/single-player-setup" element={<OriginalSetupAndFlow />} /> 

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

// Component to decide what to show for an active session
const SessionActiveDisplay = () => {
  const { sessionState, isLoading, error, clearSessionData, playerId, sessionId, setSessionIdExternally, setPlayerIdExternally, isConnected } = useContext(SessionContext);
  const navigate = useNavigate();
  const params = useParams();

  useEffect(() => {
    // If context has no session/player ID, but URL does, set them in context.
    // This helps re-establish context if user refreshes on a session page or joins via direct link.
    if (params.sessionId && params.playerId) {
      if (!sessionId || sessionId !== params.sessionId) {
        console.log("SessionActiveDisplay: Setting session ID from URL param");
        setSessionIdExternally(params.sessionId);
      }
      if (!playerId || playerId !== params.playerId) {
        console.log("SessionActiveDisplay: Setting player ID from URL param");
        setPlayerIdExternally(params.playerId);
      }
    }
  }, [params.sessionId, params.playerId, sessionId, playerId, setSessionIdExternally, setPlayerIdExternally]);

  useEffect(() => {
    if (error && (error.toLowerCase().includes('session not found') || error.toLowerCase().includes('player not found'))) {
        console.warn("Session/Player not found error detected, navigating home.");
        clearSessionData();
        navigate('/', {replace: true});
    }
  }, [error, clearSessionData, navigate]);


  // Loading state for initial session connection or data fetch
  if (isLoading && !sessionState) {
    return (
        <Container sx={{mt:5, textAlign: 'center'}}>
            <Typography>Connecting to session...</Typography>
            <CircularProgress sx={{mt:2}}/>
            <Typography variant="caption" display="block" sx={{mt:1}}>
                Session ID: {params.sessionId}, Player ID: {params.playerId}
            </Typography>
            <Button onClick={() => { clearSessionData(); navigate('/'); }} sx={{mt:2}}>Cancel and Go Home</Button>
        </Container>
    );
  }

  // If there is an error message from context
  if (error) return (
    <Container sx={{mt:5, textAlign: 'center'}}>
      <Alert severity="error">Session Error: {error}</Alert>
      <Button onClick={() => { clearSessionData(); navigate('/'); }} sx={{mt:2}}>Go Home</Button>
    </Container>
  );

  // If sessionState is null after attempting to load/connect, and no specific error related to session/player not found.
  // This could be a temporary state or an issue with WebSocket connection not populating sessionState yet.
  if (!sessionState) {
    return (
        <Container sx={{mt:5, textAlign: 'center'}}>
            <Typography>Loading session data...</Typography>
            {!isConnected && <Typography color="error" variant="caption">WebSocket not connected. Attempting to connect...</Typography>}
            <CircularProgress sx={{mt:2}}/>
            <Typography variant="caption" display="block" sx={{mt:1}}>
                Session ID: {params.sessionId}, Player ID: {params.playerId}
            </Typography>
            <Button onClick={() => { clearSessionData(); navigate('/'); }} sx={{mt:2}}>Cancel and Go Home</Button>
        </Container>
    );
  }
  
  // Ensure player from URL is part of the current session state
  // This is a critical check after sessionState is confirmed to be loaded.
  if (!sessionState.players || !sessionState.players[params.playerId]) {
    return (
      <Container sx={{mt:5, textAlign: 'center'}}>
        <Alert severity="error">Player ID {params.playerId} not found in this session. You may have been disconnected or the session has changed.</Alert>
        <Button onClick={() => { clearSessionData(); navigate('/'); }} sx={{mt:2}}>Go Home</Button>
      </Container>
    );
  }

  switch (sessionState.status) {
    case 'waiting_for_players':
      return <WaitingRoomPage />;
    case 'active':
        // TODO: Refactor MatchPage to use SessionContext
        // For now, a very basic placeholder. This will NOT work as MatchPage expects many props.
        return (
            <Box sx={{mt: 2, textAlign: 'center'}}>
                <Typography variant="h5">Session Active - MatchPage Placeholder</Typography>
                <Typography>Current Player making decisions: {sessionState.players[playerId]?.name}</Typography>
                <Typography>Restaurant: {sessionState.restaurants && sessionState.restaurants.length > 0 ? sessionState.restaurants[sessionState.players[playerId]?.current_index || 0]?.name : 'Loading restaurants...'}</Typography>
                {/* <MatchPage {...suitablePropsFromSessionState} /> */}
                <Button onClick={() => { clearSessionData(); navigate('/'); }} sx={{mt:2}}>Leave Session</Button>
            </Box>
        );
    case 'completed':
        // TODO: Refactor ResultsPage to use SessionContext
        // Calculate final matches based on sessionState.matches and consensus_threshold
        const finalMatches = [];
        if (sessionState.matches) {
            for (const bizId in sessionState.matches) {
                const votes = sessionState.matches[bizId];
                const likeCount = (votes.likes?.length || 0) + (votes.superlikes?.length || 0);
                const totalPlayers = Object.keys(sessionState.players).length;
                if (totalPlayers > 0 && (likeCount / totalPlayers) >= sessionState.consensus_threshold) {
                    const restaurant = sessionState.restaurants.find(r => r.id === bizId);
                    if (restaurant) finalMatches.push(restaurant); // Add more details if needed for ResultsPage
                }
            }
        }
        return (
            <Box sx={{mt: 2, textAlign: 'center'}}>
                <Typography variant="h5">Session Completed - ResultsPage Placeholder</Typography>
                <Typography>Matches Found: {finalMatches.length}</Typography>
                {/* <ResultsPage matches={finalMatches} onRestart={() => navigate('/')} player1Superlikes={[]} player2Superlikes={[]} /> */}
                <Button onClick={() => { clearSessionData(); navigate('/'); }} sx={{mt:2}}>Start New Game</Button>
            </Box>
        );
    case 'error_fetching_restaurants':
        return <Container sx={{mt:5, textAlign: 'center'}}><Alert severity="error">Error: Could not load restaurants for this session.</Alert><Button onClick={() => { clearSessionData(); navigate('/'); }} sx={{mt:2}}>Go Home</Button></Container>; 
    default:
      return <Container sx={{mt:5, textAlign: 'center'}}><Typography>Unknown session status: {sessionState.status}</Typography><Button onClick={() => { clearSessionData(); navigate('/'); }} sx={{mt:2}}>Go Home</Button></Container>;
  }
}

// Placeholder for the original single-player flow if you want to keep it accessible
// This would re-introduce the old state management from App.jsx here.
const OriginalSetupAndFlow = () => {
    const [stage, setStage] = useState('setup');
    const [player1, setPlayer1] = useState('');
    const [player2, setPlayer2] = useState('');
    const [restaurants, setRestaurants] = useState([]);
    const [currentIdx, setCurrentIdx] = useState(0);
    const [player1Likes, setPlayer1Likes] = useState([]);
    const [player2Likes, setPlayer2Likes] = useState([]);
    const [player1Superlikes, setPlayer1Superlikes] = useState([]);
    const [player2Superlikes, setPlayer2Superlikes] = useState([]);
    const [mutualLikes, setMutualLikes] = useState([]);
    const [matchingPlayer, setMatchingPlayer] = useState(1);
    const [loadingRestaurants, setLoadingRestaurants] = useState(false);
    const [fetchError, setFetchError] = useState('');
    const navigate = useNavigate();

    const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

    const handleSetup = async (setupData) => {
        setPlayer1(setupData.player1);
        setPlayer2(setupData.player2);
        setLoadingRestaurants(true);
        setFetchError('');
        setStage('matching');
        try {
            const resp = await axios.post(`${API_BASE_URL}/restaurants`, {
                lat: setupData.lat,
                lng: setupData.lng,
                radius: setupData.radius,
                min_rating: setupData.minRating,
                price: setupData.price,
                sort_by: setupData.sortBy
            });
            setRestaurants(resp.data.businesses || []);
        } catch (err) {
            setFetchError(err.response?.data?.detail || err.message || 'Error fetching restaurants');
        } finally {
            setLoadingRestaurants(false);
        }
    };
    const findRestaurantById = (id) => restaurants.find(r => r.id === id);

    const handleLike = (restaurantId) => {
        const biz = findRestaurantById(restaurantId);
        if (!biz) return;
        if (matchingPlayer === 1) setPlayer1Likes(prev => [...prev, biz]);
        else setPlayer2Likes(prev => [...prev, biz]);
        nextRestaurant();
    };
    const handleDislike = () => nextRestaurant();
    const handleSuperlike = (restaurantId) => {
        const biz = findRestaurantById(restaurantId);
        if (!biz) return;
        if (matchingPlayer === 1) {
            setPlayer1Superlikes(prev => [...prev, biz]);
            setPlayer1Likes(prev => [...prev, biz]);
        } else {
            setPlayer2Superlikes(prev => [...prev, biz]);
            setPlayer2Likes(prev => [...prev, biz]);
        }
        nextRestaurant();
    };
    const isRestaurantSuperliked = (restaurantId) => {
        if (matchingPlayer === 1) return player1Superlikes.some(r => r.id === restaurantId);
        return player2Superlikes.some(r => r.id === restaurantId);
    };
    const handleFinish = () => {
        if (matchingPlayer === 1) {
            setMatchingPlayer(2);
            setCurrentIdx(0);
        } else {
            const ids1 = new Set(player1Likes.map(b => b.id));
            const mutual = player2Likes.filter(b => ids1.has(b.id));
            setMutualLikes(mutual);
            setStage('results');
        }
    };
    const nextRestaurant = () => {
        if (currentIdx < restaurants.length - 1) {
            setCurrentIdx(prev => prev + 1);
        } else {
            handleFinish(); // Simplified: directly call handleFinish
        }
    };
    const handleRestart = () => {
      setStage('setup'); 
      setPlayer1(''); setPlayer2(''); setRestaurants([]); setCurrentIdx(0);
      setPlayer1Likes([]); setPlayer2Likes([]); setPlayer1Superlikes([]); setPlayer2Superlikes([]);
      setMutualLikes([]); setMatchingPlayer(1); setLoadingRestaurants(false); setFetchError('');
      // navigate('/'); // Navigate to new home if preferred
    };

    if (stage === 'setup') return <SetupPage onSetup={handleSetup} />;
    if (stage === 'matching') {
        const otherPlayerSuperlikeIds = matchingPlayer === 1 
            ? new Set(player2Superlikes.map(r => r.id)) 
            : new Set(player1Superlikes.map(r => r.id));
        return <MatchPage restaurants={restaurants} isLoading={loadingRestaurants} error={fetchError}
                        onLike={handleLike} onDislike={handleDislike} onSuperlike={handleSuperlike}
                        isSuperliked={isRestaurantSuperliked} otherPlayerSuperlikeIds={otherPlayerSuperlikeIds}
                        currentIdx={currentIdx} player={matchingPlayer === 1 ? player1 : player2}
                        onFinish={handleFinish} onRestart={handleRestart} />;
    }
    if (stage === 'results') return <ResultsPage matches={mutualLikes} onRestart={handleRestart} player1Superlikes={player1Superlikes} player2Superlikes={player2Superlikes}/>;
    return null;
};

export default App;
