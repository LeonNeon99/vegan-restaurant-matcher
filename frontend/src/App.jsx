import React, { useState } from 'react';
import SetupPage from './pages/SetupPage';
import MatchPage from './pages/MatchPage';
import ResultsPage from './pages/ResultsPage';
import axios from 'axios';

function App() {
  const [stage, setStage] = useState('setup');
  const [player1, setPlayer1] = useState('');
  const [player2, setPlayer2] = useState('');
  const [location, setLocation] = useState('');
  const [radius, setRadius] = useState(3);
  const [restaurants, setRestaurants] = useState([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [player1Likes, setPlayer1Likes] = useState([]);
  const [player2Likes, setPlayer2Likes] = useState([]);
  const [mutualLikes, setMutualLikes] = useState([]);
  const [matchingPlayer, setMatchingPlayer] = useState(1); // 1 or 2

  // Handle setup form submit
  // API base URL - use environment variable in production, fallback to localhost for development
  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

  const handleSetup = async ({ player1, player2, location, radius }) => {
    setPlayer1(player1);
    setPlayer2(player2);
    setLocation(location);
    setRadius(radius);
    // Geocode location
    try {
      const geo = await axios.post(`${API_BASE_URL}/geocode`, { location });
      // Fetch restaurants
      const resp = await axios.post(`${API_BASE_URL}/restaurants`, {
        lat: geo.data.lat,
        lng: geo.data.lng,
        radius: radius * 1000
      });
      setRestaurants(resp.data);
      setStage('matching');
      setCurrentIdx(0);
      setPlayer1Likes([]);
      setPlayer2Likes([]);
      setMatchingPlayer(1);
    } catch (err) {
      alert('Error fetching restaurants: ' + (err.response?.data?.detail || err.message));
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
    setLocation('');
    setRadius(3);
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
        restaurants={restaurants.businesses || restaurants} // fallback for old/new API shape
        onLike={handleLike}
        onDislike={handleDislike}
        currentIdx={currentIdx}
        player={matchingPlayer === 1 ? player1 : player2}
        onFinish={handleFinish}
      />
    );
  }
  if (stage === 'results') {
    return <ResultsPage matches={mutualLikes} onRestart={handleRestart} />;
  }
  return null;
}

export default App;
