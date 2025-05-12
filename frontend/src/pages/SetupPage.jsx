import React, { useState } from 'react';
import { 
  Box, Button, TextField, Typography, Slider, Container, Paper, 
  Rating,
  ToggleButton,
  ToggleButtonGroup,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import Autocomplete from '@mui/material/Autocomplete';
import axios from 'axios';
import CircularProgress from '@mui/material/CircularProgress';

export default function SetupPage({ onSetup }) {
  const [player1, setPlayer1] = useState('');
  const [player2, setPlayer2] = useState('');
  const [location, setLocation] = useState('');
  const [radius, setRadius] = useState(5);
  const [autocompleteOptions, setAutocompleteOptions] = useState([]);
  const [autocompleteLoading, setAutocompleteLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [error, setError] = useState('');

  // New state for filters/sorting
  const [minRating, setMinRating] = useState(0);
  const [priceLevels, setPriceLevels] = useState(() => ['1', '2', '3', '4']);
  const [sortBy, setSortBy] = useState('best_match');

  // API base URL - use environment variable in production, fallback to localhost for development
  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
  
  // Autocomplete: fetch suggestions from backend
  const handleLocationChange = async (event, newValue, reason) => {
    setLocation(newValue || '');
    if (reason === 'input' && newValue && newValue.length > 2) {
      setAutocompleteLoading(true);
      setError('');
      try {
        const resp = await axios.get(`${API_BASE_URL}/autocomplete_location`, { params: { q: newValue } });
        setAutocompleteOptions(resp.data.suggestions || []);
      } catch (err) {
        console.error("Autocomplete Error:", err);
        setError(err.response?.data?.detail || 'Error fetching locations');
        setAutocompleteOptions([]);
      } finally {
        setAutocompleteLoading(false);
      }
    } else {
      setAutocompleteOptions([]);
    }
  };

  const handlePriceChange = (event, newPriceLevels) => {
    if (newPriceLevels.length) {
      setPriceLevels(newPriceLevels);
    } else {
      setPriceLevels(['1', '2', '3', '4']);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!player1 || !player2 || !location) {
      setError('Player names and location are required.');
      return;
    }
    setError('');
    setSubmitLoading(true);

    try {
      const geocodeResponse = await axios.post(`${API_BASE_URL}/geocode`, { location: location });
      const { lat, lng } = geocodeResponse.data;

      onSetup({ 
        player1, 
        player2, 
        location: location,
        lat, 
        lng, 
        radius: radius * 1000,
        minRating: minRating > 0 ? minRating : null,
        price: priceLevels.join(','),
        sortBy: sortBy
      });

    } catch (err) {
      console.error("Geocoding/Submit Error:", err);
      setError(err.response?.data?.detail || 'Failed to find coordinates for the location.');
      setSubmitLoading(false);
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', width: '100vw', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', bgcolor: 'background.default' }}>
      <Container maxWidth="sm">
        <Paper elevation={6} sx={{ p: 4, borderRadius: 4 }}>
          <Typography variant="h4" align="center" gutterBottom>Vegan Restaurant Matcher</Typography>
          <Box component="form" onSubmit={handleSubmit}>
            <TextField fullWidth label="Player 1 Name" value={player1} onChange={e => setPlayer1(e.target.value)} sx={{ mb: 2 }} disabled={submitLoading}/>
            <TextField fullWidth label="Player 2 Name" value={player2} onChange={e => setPlayer2(e.target.value)} sx={{ mb: 2 }} disabled={submitLoading}/>
            <Autocomplete
              freeSolo
              options={autocompleteOptions}
              loading={autocompleteLoading}
              onInputChange={handleLocationChange}
              inputValue={location}
              disabled={submitLoading}
              getOptionLabel={(option) => option}
              filterOptions={(x) => x}
              renderInput={(params) => (
                <TextField 
                  {...params} 
                  label="Location (e.g., City, Address)" 
                  fullWidth 
                  sx={{ mb: 2 }} 
                  InputProps={{
                    ...params.InputProps,
                    endAdornment: (
                      <React.Fragment>
                        {autocompleteLoading ? <CircularProgress color="inherit" size={20} /> : null}
                        {params.InputProps.endAdornment}
                      </React.Fragment>
                    ),
                  }}
                />
              )}
            />
          <Box sx={{ mb: 2 }}>
            <Typography gutterBottom>Search Radius: {radius} km</Typography>
            <Slider
              value={radius}
              min={1}
              max={40}
              step={1}
              onChange={(_, val) => setRadius(val)}
              valueLabelDisplay="auto"
              disabled={submitLoading}
            />
          </Box>
          <Typography variant="h6" sx={{ mt: 3, mb: 1 }}>Options</Typography>
          <Box sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
            <Typography sx={{ mr: 2 }}>Min Rating:</Typography>
            <Rating 
              name="min-rating"
              value={minRating}
              precision={0.5}
              onChange={(event, newValue) => {
                setMinRating(newValue || 0);
              }}
              disabled={submitLoading}
            />
            <Typography sx={{ ml: 1 }}>({minRating === 0 ? 'Any' : `${minRating} Stars`})</Typography>
          </Box>
          <Box sx={{ mb: 2 }}>
            <Typography gutterBottom>Price Level:</Typography>
            <ToggleButtonGroup
              value={priceLevels}
              onChange={handlePriceChange}
              aria-label="price level"
              disabled={submitLoading}
              fullWidth
            >
              <ToggleButton value="1" aria-label="$">$</ToggleButton>
              <ToggleButton value="2" aria-label="$$">$$</ToggleButton>
              <ToggleButton value="3" aria-label="$$$">$$$</ToggleButton>
              <ToggleButton value="4" aria-label="$$$$">$$$$</ToggleButton>
            </ToggleButtonGroup>
          </Box>
          <FormControl fullWidth sx={{ mb: 2 }} disabled={submitLoading}>
            <InputLabel id="sort-by-label">Sort By</InputLabel>
            <Select
              labelId="sort-by-label"
              id="sort-by-select"
              value={sortBy}
              label="Sort By"
              onChange={(e) => setSortBy(e.target.value)}
            >
              <MenuItem value="best_match">Best Match (Default)</MenuItem>
              <MenuItem value="rating">Rating</MenuItem>
              <MenuItem value="distance">Distance</MenuItem>
              <MenuItem value="review_count">Review Count</MenuItem> 
            </Select>
          </FormControl>
          {error && <Typography color="error" align="center" sx={{ mt: 2, mb: 2 }}>{error}</Typography>}
          <Button 
            fullWidth 
            variant="contained" 
            type="submit" 
            size="large" 
            disabled={submitLoading}
            sx={{ mt: 2 }}
          >
            {submitLoading ? <CircularProgress size={24} color="inherit" /> : 'Find Restaurants'} 
          </Button>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
}
