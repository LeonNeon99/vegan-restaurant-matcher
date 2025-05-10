import React, { useState } from 'react';
import { Box, Button, TextField, Typography, Slider, Container, Paper } from '@mui/material';
import Autocomplete from '@mui/material/Autocomplete';
import axios from 'axios';

export default function SetupPage({ onSetup }) {
  const [player1, setPlayer1] = useState('');
  const [player2, setPlayer2] = useState('');
  const [location, setLocation] = useState('');
  const [radius, setRadius] = useState(3);
  const [autocompleteOptions, setAutocompleteOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // OpenCage autocomplete (call backend)
  const handleLocationChange = async (e, value) => {
    setLocation(value);
    if (value && value.length > 2) {
      try {
        setLoading(true);
        const resp = await axios.post('http://localhost:8000/geocode', { location: value });
        setAutocompleteOptions([{ label: value, ...resp.data }]);
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
    <Container maxWidth="sm" sx={{ mt: 6 }}>
      <Paper elevation={3} sx={{ p: 4, borderRadius: 3 }}>
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
  );
}
