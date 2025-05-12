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
  const [player1Superlikes, setPlayer1Superlikes] = useState([]);
  const [player2Superlikes, setPlayer2Superlikes] = useState([]);
  const [mutualLikes, setMutualLikes] = useState([]);
  const [matchingPlayer, setMatchingPlayer] = useState(1); // 1 or 2
  const [loadingRestaurants, setLoadingRestaurants] = useState(false); // Added loading state
  const [fetchError, setFetchError] = useState(''); // Added error state for fetching

  // API base URL
  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

  // Updated handleSetup to accept all parameters
  const handleSetup = async ({ 
    player1, player2, lat, lng, radius, 
    minRating, price, sortBy // Added new params
  }) => {
    setPlayer1(player1);
    setPlayer2(player2);
    setRestaurants([]);
    setPlayer1Likes([]);
    setPlayer2Likes([]);
    setPlayer1Superlikes([]);
    setPlayer2Superlikes([]);
    setMutualLikes([]);
    setMatchingPlayer(1);
    setCurrentIdx(0);
    setFetchError('');
    setLoadingRestaurants(true);
    setStage('matching');

    try {
      // Fetch restaurants including filter/sort parameters
      const resp = await axios.post(`${API_BASE_URL}/restaurants`, {
        lat: lat,
        lng: lng,
        radius: radius, // Already in meters
        min_rating: minRating, // Pass directly (backend handles null)
        price: price, // Pass directly
        sort_by: sortBy // Pass directly
      });
      setRestaurants(resp.data || []);
    } catch (err) {
      console.error("Error fetching restaurants:", err);
      const errorMsg = err.response?.data?.detail || err.message || 'Unknown error fetching restaurants';
      setFetchError(errorMsg);
    } finally {
      setLoadingRestaurants(false);
    }
  };

  // Find restaurant by ID from the main list
  const findRestaurantById = (id) => restaurants.find(r => r.id === id);

  // Modified to accept restaurant ID
  const handleLike = (restaurantId) => {
    const biz = findRestaurantById(restaurantId);
    if (!biz) return; // Restaurant not found, should not happen

    if (matchingPlayer === 1) {
      setPlayer1Likes(prevLikes => [...prevLikes, biz]);
    } else {
      setPlayer2Likes(prevLikes => [...prevLikes, biz]);
    }
    nextRestaurant();
  };

  // Modified to accept restaurant ID (though not strictly used by logic yet)
  const handleDislike = (restaurantId) => {
    // const biz = findRestaurantById(restaurantId); // Can be used if needed later
    nextRestaurant();
  };

  // New handler for superlike
  const handleSuperlike = (restaurantId) => {
    const biz = findRestaurantById(restaurantId);
    if (!biz) return;

    if (matchingPlayer === 1) {
      setPlayer1Superlikes(prevSuperlikes => [...prevSuperlikes, biz]);
      // Also counts as a like for matching purposes for now
      setPlayer1Likes(prevLikes => [...prevLikes, biz]); 
    } else {
      setPlayer2Superlikes(prevSuperlikes => [...prevSuperlikes, biz]);
      // Also counts as a like for matching purposes for now
      setPlayer2Likes(prevLikes => [...prevLikes, biz]); 
    }
    nextRestaurant(); // Moves to next restaurant
  };

  // Function to check if a restaurant is superliked by the current player
  const isRestaurantSuperliked = (restaurantId) => {
    if (matchingPlayer === 1) {
      return player1Superlikes.some(r => r.id === restaurantId);
    }
    return player2Superlikes.some(r => r.id === restaurantId);
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
    setPlayer1Superlikes([]);
    setPlayer2Superlikes([]);
    setMutualLikes([]);
    setMatchingPlayer(1);
  };

  if (stage === 'setup') {
    return <SetupPage onSetup={handleSetup} />;
  }
  if (stage === 'matching') {
    // Determine the list of superlikes from the *other* player
    const otherPlayerSuperlikeIds = matchingPlayer === 1 
      ? new Set(player2Superlikes.map(r => r.id)) 
      : new Set(player1Superlikes.map(r => r.id));

    return (
      <MatchPage
        restaurants={restaurants}
        isLoading={loadingRestaurants}
        error={fetchError}
        onLike={handleLike}
        onDislike={handleDislike}
        onSuperlike={handleSuperlike}
        isSuperliked={isRestaurantSuperliked} // Checks if CURRENT player superliked
        otherPlayerSuperlikeIds={otherPlayerSuperlikeIds} // Pass IDs superliked by OTHER player
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
