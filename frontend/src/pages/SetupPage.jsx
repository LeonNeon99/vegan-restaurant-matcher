import React, { useState } from 'react';
import { Box, Button, TextField, Typography, Slider, Container, Paper } from '@mui/material';
import Autocomplete from '@mui/material/Autocomplete';
import axios from 'axios';

import CircularProgress from '@mui/material/CircularProgress';

export default function SetupPage({ onSetup }) {
  const [player1, setPlayer1] = useState('');
  const [player2, setPlayer2] = useState('');
  const [location, setLocation] = useState('');
  const [radius, setRadius] = useState(3);
  const [autocompleteOptions, setAutocompleteOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // API base URL - use environment variable in production, fallback to localhost for development
  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
  
  // Improved autocomplete: fetch suggestions from backend
  const handleLocationChange = async (e, value) => {
    setLocation(value);
    if (value && value.length > 2) {
      setLoading(true);
      try {
        const resp = await axios.get(`${API_BASE_URL}/autocomplete_location`, { params: { q: value } });
        setAutocompleteOptions(resp.data.suggestions || []);
      } catch (err) {
        setAutocompleteOptions([]);
      } finally {
        setLoading(false);
      }
    } else {
      setAutocompleteOptions([]);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!player1 || !player2 || !location) {
      setError('All fields are required.');
      return;
    }
    setError('');
    onSetup({ player1, player2, location, radius });
  };

  return (
    <Box sx={{ minHeight: '100vh', width: '100vw', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', bgcolor: 'background.default' }}>
      <Container maxWidth="sm">
        <Paper elevation={6} sx={{ p: 4, borderRadius: 4 }}>
          <Typography variant="h4" align="center" gutterBottom>Vegan Restaurant Matcher</Typography>
          <Box component="form" onSubmit={handleSubmit}>
            <TextField fullWidth label="Player 1 Name" value={player1} onChange={e => setPlayer1(e.target.value)} sx={{ mb: 2 }} />
            <TextField fullWidth label="Player 2 Name" value={player2} onChange={e => setPlayer2(e.target.value)} sx={{ mb: 2 }} />
            <Autocomplete
              freeSolo
              options={autocompleteOptions}
              loading={loading}
              onInputChange={handleLocationChange}
              inputValue={location}
              renderInput={(params) => (
                <TextField {...params} label="Location" fullWidth sx={{ mb: 2 }} />
              )}
            />
          <Box sx={{ mb: 2 }}>
            <Typography gutterBottom>Search Radius: {radius} km</Typography>
            <Slider
              value={radius}
              min={1}
              max={25}
              step={1}
              onChange={(_, val) => setRadius(val)}
              valueLabelDisplay="auto"
            />
          </Box>
          {error && <Typography color="error" sx={{ mb: 2 }}>{error}</Typography>}
          <Button fullWidth variant="contained" type="submit" size="large">Find Restaurants</Button>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
}
