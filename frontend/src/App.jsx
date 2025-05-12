import React, { useState } from 'react';
import SetupPage from './pages/SetupPage';
import MatchPage from './pages/MatchPage';
import ResultsPage from './pages/ResultsPage';
import axios from 'axios';

function App() {
  const [stage, setStage] = useState('setup');
  const [player1, setPlayer1] = useState('');
  const [player2, setPlayer2] = useState('');
  const [restaurants, setRestaurants] = useState([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [player1Likes, setPlayer1Likes] = useState([]);
  const [player2Likes, setPlayer2Likes] = useState([]);
  const [mutualLikes, setMutualLikes] = useState([]);
  const [matchingPlayer, setMatchingPlayer] = useState(1); // 1 or 2
  const [loadingRestaurants, setLoadingRestaurants] = useState(false); // Added loading state
  const [fetchError, setFetchError] = useState(''); // Added error state for fetching

  // API base URL
  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

  // Updated handleSetup to accept lat/lng directly
  const handleSetup = async ({ player1, player2, lat, lng, radius }) => {
    setPlayer1(player1);
    setPlayer2(player2);
    setRestaurants([]); // Clear previous restaurants
    setPlayer1Likes([]);
    setPlayer2Likes([]);
    setMutualLikes([]);
    setMatchingPlayer(1);
    setCurrentIdx(0);
    setFetchError(''); // Clear previous errors
    setLoadingRestaurants(true); // Start loading
    setStage('matching'); // Navigate to matching page immediately to show loading

    try {
      // Fetch restaurants using the provided lat/lng and radius (already in meters)
      const resp = await axios.post(`${API_BASE_URL}/restaurants`, {
        lat: lat,
        lng: lng,
        radius: radius // Comes from SetupPage already multiplied by 1000
      });
      setRestaurants(resp.data || []); // Ensure it's an array
    } catch (err) {
      console.error("Error fetching restaurants:", err);
      const errorMsg = err.response?.data?.detail || err.message || 'Unknown error fetching restaurants';
      setFetchError(errorMsg); // Store error message
      // Optional: Navigate back or show error prominently on MatchPage
      // For now, MatchPage will show the error if restaurants array is empty and error exists
    } finally {
      setLoadingRestaurants(false); // Stop loading regardless of success/error
    }
  };

  // Handle like/dislike for current player
  const handleLike = (biz) => {
    if (matchingPlayer === 1) {
      setPlayer1Likes([...player1Likes, biz]);
    } else {
      setPlayer2Likes([...player2Likes, biz]);
    }
    nextRestaurant();
  };

  const handleFinish = () => {
    if (matchingPlayer === 1) {
      setMatchingPlayer(2);
      setCurrentIdx(0);
    } else {
      // Compute mutual likes
      const ids1 = new Set(player1Likes.map(b => b.id));
      const mutual = player2Likes.filter(b => ids1.has(b.id));
      setMutualLikes(mutual);
      setStage('results');
    }
  };

  const handleDislike = () => {
    nextRestaurant();
  };
  const nextRestaurant = () => {
    if (currentIdx < restaurants.length - 1) {
      setCurrentIdx(currentIdx + 1);
    } else {
      if (matchingPlayer === 1) {
        setMatchingPlayer(2);
        setCurrentIdx(0);
      } else {
        // Compute mutual likes
        const ids1 = new Set(player1Likes.map(b => b.id));
        const mutual = player2Likes.filter(b => ids1.has(b.id));
        setMutualLikes(mutual);
        setStage('results');
      }
    }
  };
  const handleRestart = () => {
    setStage('setup');
    setPlayer1('');
    setPlayer2('');
    setRestaurants([]);
    setCurrentIdx(0);
    setPlayer1Likes([]);
    setPlayer2Likes([]);
    setMutualLikes([]);
    setMatchingPlayer(1);
  };

  if (stage === 'setup') {
    return <SetupPage onSetup={handleSetup} />;
  }
  if (stage === 'matching') {
    return (
      <MatchPage
        restaurants={restaurants}
        isLoading={loadingRestaurants}
        error={fetchError}
        onLike={handleLike}
        onDislike={handleDislike}
        currentIdx={currentIdx}
        player={matchingPlayer === 1 ? player1 : player2}
        onFinish={handleFinish}
        onRestart={handleRestart}
      />
    );
  }
  if (stage === 'results') {
    return <ResultsPage matches={mutualLikes} onRestart={handleRestart} />;
  }
  return null;
}

export default App;
