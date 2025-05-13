import React, { useState, useContext, useEffect } from 'react';
import { Box, Button, TextField, Typography, Slider, Container, Paper, Rating, ToggleButtonGroup, ToggleButton, FormControl, InputLabel, Select, MenuItem, CircularProgress, Alert } from '@mui/material';
import Autocomplete from '@mui/material/Autocomplete';
import axios from 'axios';
import { SessionContext } from '../contexts/SessionContext'; // Uncommented
import { useNavigate } from 'react-router-dom';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export default function CreateSessionPage() {
  const { createNewSession, isLoading: contextIsLoading, error: contextError, clearSessionData } = useContext(SessionContext); // Used context
  const navigate = useNavigate();

  useEffect(() => { // Added useEffect to clear session data
    clearSessionData();
  }, [clearSessionData]);

  const [hostName, setHostName] = useState('');
  const [location, setLocation] = useState('');
  const [locationDetails, setLocationDetails] = useState(null); // To store lat, lng
  const [radius, setRadius] = useState(10); // km
  const [autocompleteOptions, setAutocompleteOptions] = useState([]);
  const [autocompleteLoading, setAutocompleteLoading] = useState(false);
  
  const [minRating, setMinRating] = useState(0);
  const [priceLevels, setPriceLevels] = useState(() => ['1', '2', '3', '4']);
  const [sortBy, setSortBy] = useState('best_match');

  const [maxPlayers, setMaxPlayers] = useState(2);
  const [consensusThreshold, setConsensusThreshold] = useState(0.5);
  const [mode, setMode] = useState('freeform');

  const [formError, setFormError] = useState(''); // Renamed from error to avoid conflict with contextError
  
  // New local states for handling post-creation flow
  const [inviteUrlLocal, setInviteUrlLocal] = useState('');
  const [createdSessionId, setCreatedSessionId] = useState(null);
  const [createdPlayerId, setCreatedPlayerId] = useState(null);


  const handleLocationChange = async (event, newValue, reason) => {
    setLocation(newValue || '');
    setLocationDetails(null); // Reset lat/lng if location text changes
    if (reason === 'input' && newValue && newValue.length > 2) {
      setAutocompleteLoading(true);
      setFormError('');
      try {
        const resp = await axios.get(`${API_BASE_URL}/autocomplete_location`, { params: { q: newValue } });
        setAutocompleteOptions(resp.data.suggestions || []);
      } catch (err) {
        console.error("Autocomplete Error:", err);
        setFormError(err.response?.data?.detail || 'Error fetching locations'); // Use setFormError
        setAutocompleteOptions([]);
      } finally {
        setAutocompleteLoading(false);
      }
    } else if (reason === 'selectOption' && newValue) {
         // User selected an option, now geocode it
        setAutocompleteLoading(true);
        try {
            const geocodeResponse = await axios.post(`${API_BASE_URL}/geocode`, { location: newValue });
            setLocationDetails(geocodeResponse.data); // Store lat, lng, full_address
            setLocation(geocodeResponse.data.full_address || newValue); // Update input with formatted address
            setAutocompleteOptions([]);
        } catch (err) {
            console.error("Geocoding Error:", err);
            setFormError(err.response?.data?.detail || 'Error geocoding location'); // Use setFormError
            setLocationDetails(null);
        } finally {
            setAutocompleteLoading(false);
        }
    } else {
      setAutocompleteOptions([]);
    }
  };

  const handlePriceChange = (event, newPriceLevels) => {
    setPriceLevels(newPriceLevels.length ? newPriceLevels : ['1', '2', '3', '4']);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!hostName || !location || !locationDetails) {
      setFormError('Host name and a geocoded location are required.'); // Use setFormError
      return;
    }
    setFormError(''); // Use setFormError
    setInviteUrlLocal(''); // Clear previous invite URL
    setCreatedSessionId(null); // Clear previous session ID
    setCreatedPlayerId(null); // Clear previous player ID

    try {
      const payload = {
        host_name: hostName,
        location_description: locationDetails.full_address || location,
        lat: locationDetails.lat,
        lng: locationDetails.lng,
        radius: radius * 1000, // convert km to meters
        price: priceLevels.join(','),
        min_rating: minRating > 0 ? minRating : null,
        sort_by: sortBy,
        max_players: maxPlayers,
        consensus_threshold: consensusThreshold,
        mode: mode,
      };
      
      // Use the context function
      const sessionDataFromContext = await createNewSession(payload); 

      console.log("Session created via context:", sessionDataFromContext);
      // Store details for the "Session Created!" view and navigation
      setInviteUrlLocal(sessionDataFromContext.invite_url);
      setCreatedSessionId(sessionDataFromContext.session_id);
      setCreatedPlayerId(sessionDataFromContext.player_id);

    } catch (err) {
      console.error("Create Session Error (from page submit):", err);
      // contextError should be set by createNewSession if it throws.
      // setFormError can be used for additional page-specific error display if needed.
      setFormError(err.message || contextError || 'Failed to create session.'); // Use setFormError
    } 
  };

  const handleGoToSession = () => { // New handler for the button
    if (createdSessionId && createdPlayerId) {
        navigate(`/session/${createdSessionId}/player/${createdPlayerId}`);
    }
  };

  if (inviteUrlLocal) { // Check local state
    return (
      <Box 
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          bgcolor: 'grey.100',
          py: 4
        }}
      >
        <Container maxWidth="sm">
          <Paper elevation={6} sx={{ p: 4, borderRadius: 2, textAlign: 'center' }}>
            <Typography variant="h5" gutterBottom>Session Created!</Typography>
            <Typography variant="body1" sx={{ mb: 2 }}>Share this link with your friends:</Typography>
            <TextField
              fullWidth
              value={inviteUrlLocal} // Use local state
              readOnly
              sx={{ mb: 2 }}
              onClick={(e) => e.target.select()}
            />
            <Box sx={{display: 'flex', justifyContent: 'center', gap: 1, flexWrap: 'wrap'}}>
                <Button variant="contained" onClick={() => navigator.clipboard.writeText(inviteUrlLocal)} sx={{ mr: 1 }}>
                Copy Link
                </Button>
                {createdSessionId && createdPlayerId && ( // Conditionally render Go to Waiting Room button
                    <Button variant="contained" color="primary" onClick={handleGoToSession}>
                        Go to Waiting Room
                    </Button>
                )}
                <Button variant="outlined" onClick={() => { setInviteUrlLocal(''); navigate('/');}} sx={{ml:1}}> 
                 Back to Home
                </Button>
            </Box>
            {contextError && <Alert severity="error" sx={{mt:2}}>{contextError}</Alert>}
          </Paper>
        </Container>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', bgcolor: 'grey.100', py: 4 }}>
      <Container maxWidth="sm">
        <Paper elevation={6} sx={{ p: {xs: 2, sm:4}, borderRadius: 2 }}>
          <Typography variant="h4" align="center" gutterBottom>Create New Session</Typography>
          <Box component="form" onSubmit={handleSubmit}>
            <TextField fullWidth label="Your Name (Host)" value={hostName} onChange={e => setHostName(e.target.value)} sx={{ mb: 2 }} disabled={contextIsLoading}/>
            
            <Autocomplete
              freeSolo
              options={autocompleteOptions}
              loading={autocompleteLoading}
              onInputChange={handleLocationChange} // Corrected: use onInputChange for text, onChange for selection
              onChange={(event, newValueOption) => { // Handle selection of an option
                if (newValueOption) { // An option was selected from the dropdown
                    handleLocationChange(event, newValueOption, 'selectOption');
                }
                // If newValueOption is null (e.g. input cleared via 'x' button), 
                // onInputChange would have already been called with value: null, reason: 'clear'.
                // So location and locationDetails should be reset by handleLocationChange.
              }}
              value={location} // Controlled input value
              disabled={contextIsLoading || autocompleteLoading} // Disable if context is loading OR local autocomplete is loading
              getOptionLabel={(option) => typeof option === 'string' ? option : option.description} // Yelp/Google might return structured options
              filterOptions={(x) => x} // Backend does filtering
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
              <Slider value={radius} min={1} max={40} step={1} onChange={(_, val) => setRadius(val)} valueLabelDisplay="auto" disabled={contextIsLoading} />
            </Box>

            <Typography variant="h6" sx={{ mt: 3, mb: 1 }}>Restaurant Filters</Typography>
            <Box sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
              <Typography sx={{ mr: 2 }}>Min Rating:</Typography>
              <Rating name="min-rating" value={minRating} precision={0.5} onChange={(event, newValue) => setMinRating(newValue || 0)} disabled={contextIsLoading} />
              <Typography sx={{ ml: 1 }}>({minRating === 0 ? 'Any' : `${minRating} Stars`})</Typography>
            </Box>
            <Box sx={{ mb: 2 }}>
              <Typography gutterBottom>Price Level:</Typography>
              <ToggleButtonGroup value={priceLevels} onChange={handlePriceChange} aria-label="price level" disabled={contextIsLoading} fullWidth >
                <ToggleButton value="1" aria-label="$">$</ToggleButton>
                <ToggleButton value="2" aria-label="$$">$$</ToggleButton>
                <ToggleButton value="3" aria-label="$$$">$$$</ToggleButton>
                <ToggleButton value="4" aria-label="$$$$">$$$$</ToggleButton>
              </ToggleButtonGroup>
            </Box>
            <FormControl fullWidth sx={{ mb: 2 }} disabled={contextIsLoading}>
              <InputLabel id="sort-by-label">Sort By</InputLabel>
              <Select labelId="sort-by-label" value={sortBy} label="Sort By" onChange={(e) => setSortBy(e.target.value)} >
                <MenuItem value="best_match">Best Match</MenuItem>
                <MenuItem value="rating">Rating</MenuItem>
                <MenuItem value="distance">Distance</MenuItem>
                <MenuItem value="review_count">Review Count</MenuItem> 
              </Select>
            </FormControl>

            <Typography variant="h6" sx={{ mt: 3, mb: 1 }}>Session Settings</Typography>
            <FormControl fullWidth sx={{ mb: 2 }} disabled={contextIsLoading}>
              <InputLabel id="max-players-label">Max Players</InputLabel>
              <Select labelId="max-players-label" value={maxPlayers} label="Max Players" onChange={(e) => setMaxPlayers(parseInt(e.target.value,10))} >
                {[...Array(9)].map((_, i) => <MenuItem key={i+2} value={i+2}>{i+2}</MenuItem>)}
              </Select>
            </FormControl>
            <FormControl fullWidth sx={{ mb: 2 }} disabled={contextIsLoading}>
              <InputLabel id="consensus-label">Consensus Threshold</InputLabel>
              <Select labelId="consensus-label" value={consensusThreshold} label="Consensus Threshold" onChange={(e) => setConsensusThreshold(parseFloat(e.target.value))} >
                <MenuItem value={0.5}>50% (Majority)</MenuItem>
                <MenuItem value={0.66}>66% (Super Majority)</MenuItem>
                <MenuItem value={0.75}>75% (Strong Consensus)</MenuItem>
                <MenuItem value={1.0}>100% (Unanimous)</MenuItem>
              </Select>
            </FormControl>
            <FormControl fullWidth sx={{ mb: 2 }} disabled={contextIsLoading}>
              <InputLabel id="mode-label">Swiping Mode</InputLabel>
              <Select labelId="mode-label" value={mode} label="Swiping Mode" onChange={(e) => setMode(e.target.value)} >
                <MenuItem value="freeform">Freeform (Everyone swipes anytime)</MenuItem>
                <MenuItem value="turn-based">Turn-based (Players take turns)</MenuItem>
              </Select>
            </FormControl>
            
            {formError && <Alert severity="error" sx={{ mt: 2, mb: 2 }}>{formError}</Alert>}
            {contextError && !formError && <Alert severity="error" sx={{ mt: 2, mb: 2 }}>{contextError}</Alert>} 
            <Button fullWidth variant="contained" type="submit" size="large" disabled={contextIsLoading || autocompleteLoading || !locationDetails} sx={{ mt: 2 }} >
              {contextIsLoading ? <CircularProgress size={24} color="inherit" /> : 'Create Session & Get Invite Link'} 
            </Button>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
} 