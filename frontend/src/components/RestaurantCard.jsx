import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Card, CardContent, CardMedia, Typography, IconButton, Box, CircularProgress, Collapse, List, ListItem, ListItemText, Chip, Avatar, Tooltip, Badge, Rating, Paper, ImageList, ImageListItem, Button, CardActions, Alert } from '@mui/material';
import { styled } from '@mui/material/styles';
import { ExpandMore as ExpandMoreIconMUI, StarBorder, Star, LocationOn, Phone, Launch, PhotoCamera, Reviews, AccessTime, RestaurantMenu, PeopleAlt, Favorite, FavoriteBorder, Info as InfoIcon, ExpandLess as ExpandLessIcon } from '@mui/icons-material';
import { Map, AdvancedMarker, Pin } from '@vis.gl/react-google-maps';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const ExpandMore = styled((props) => {
  const { expand, ...other } = props;
  return <IconButton {...other} />;
})(({ theme, expand }) => ({
  transform: !expand ? 'rotate(0deg)' : 'rotate(180deg)',
  marginLeft: 'auto',
  transition: theme.transitions.create('transform', {
    duration: theme.transitions.duration.shortest,
  }),
}));

function RestaurantCard({
  restaurant,
  onLike, 
  onDislike, 
  onSuperlike, 
  isSuperliked, 
  otherPlayerSuperlikeIds, 
  disabled, 
  isMatched = false, 
  showMatchDetails = false, 
  allLikers = [], 
  likedByCurrentUser = false, 
  superlikedByCurrentUser = false,
  viewingPlayerId,
}) {
  const [details, setDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [errorDetails, setErrorDetails] = useState('');
  const [expanded, setExpanded] = useState(false);
  const [hoursExpandedLocal, setHoursExpandedLocal] = useState(false);

  useEffect(() => {
    setExpanded(false);
    setDetails(null);
    setErrorDetails('');
    setLoadingDetails(false);
    setHoursExpandedLocal(false);
  }, [restaurant?.id]);

  const handleExpandClick = () => {
    setExpanded(!expanded);
    if (!expanded && !details && !loadingDetails && restaurant.id) {
      setLoadingDetails(true);
      setErrorDetails('');
      axios.get(`${API_BASE_URL}/restaurant-details/${restaurant.id}`)
        .then(response => {
          setDetails(response.data);
          setLoadingDetails(false);
        })
        .catch(err => {
          console.error("Error fetching details:", err);
          setErrorDetails(err.response?.data?.detail || 'Failed to load details');
          setLoadingDetails(false);
        });
    }
  };
  
  const formatHoursToListItems = (hoursData) => {
    if (!hoursData || hoursData.length === 0 || !hoursData[0].open) {
      return []; 
    }
    const formatTime = (time) => time ? `${time.substring(0, 2)}:${time.substring(2)}` : '';
    try {
      return hoursData[0].open.map(o => {
        const dayMap = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        return { day: dayMap[o.day] || 'Day ' + o.day, time: `${formatTime(o.start)} - ${formatTime(o.end)}` };
      });
    } catch (e) {
        console.error("Error formatting hours:", e, hoursData); 
        return [];
    }
  };
  const formattedHoursLines = details ? formatHoursToListItems(details.hours) : [];

  const wasSuperlikedByOtherPlayerInMatchPhase = otherPlayerSuperlikeIds instanceof Set && otherPlayerSuperlikeIds.has(restaurant.id);
  const badgeContent = isSuperliked || superlikedByCurrentUser ? <Star color="warning" /> : (wasSuperlikedByOtherPlayerInMatchPhase ? <StarBorder color="warning" /> : null);

  if (!restaurant) {
    return (
      <Card sx={{maxWidth: 345, margin: '20px auto', backgroundColor: 'background.paper'}}>
        <CardContent>
          <Typography color="text.primary">Error: Restaurant data missing.</Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <Badge
      badgeContent={badgeContent}
      invisible={!badgeContent}
      anchorOrigin={{ vertical: 'top', horizontal: 'left' }}
      sx={{ 
        width: '100%',
        '& .MuiBadge-badge': {
          transform: 'scale(1.2) translate(-50%, -50%)',
          padding: '8px',
          borderRadius: '50%',
          background: 'white',
          zIndex: 2
        }
      }}
    >
      <Card sx={{
        width: '100%',
        borderRadius: 2,
        boxShadow: 3,
        border: (isSuperliked || superlikedByCurrentUser) ? '3px solid #FF8C00' : (isMatched && likedByCurrentUser ? '3px solid #2E7D32' : '1px solid #ddd'),
        backgroundColor: isMatched ? '#f0fff0' : 'background.paper',
        overflow: 'hidden',
        transition: 'all 0.3s ease'
      }}>
        <CardMedia
          component="img"
          height="200"
          image={restaurant.image_url || 'https://via.placeholder.com/300x200.png?text=No+Image'}
          alt={restaurant.name}
          sx={{ objectFit: 'cover' }}
        />
        <CardContent sx={{pb: 1, backgroundColor: 'background.paper'}}>
          <Typography gutterBottom variant="h5" component="div" noWrap sx={{ fontWeight: 'bold', color: '#1A237E', letterSpacing: '-0.01em' }}>
            {restaurant.name}
          </Typography>
          <Typography variant="body2" color="#555555" sx={{mb: 1, height: '2.5em', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', fontWeight: 500}}
          >
            {restaurant.categories?.map(c => c.title).join(', ')}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', my: 0.5 }}>
            <LocationOn fontSize="small" sx={{ mr: 0.5, color: '#E91E63' }} />
            <Typography variant="body2" color="#333333" noWrap sx={{ maxWidth: '95%', fontWeight: 500 }}>
              {restaurant.location?.display_address?.join(', ') || 'Address not available'}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', mb:1 }}>
            <Rating name={`rating-${restaurant.id}`} value={restaurant.rating || 0} precision={0.5} readOnly size="small" sx={{mr:0.5}}/>
            <Typography variant="body2" color="#555555" sx={{fontWeight: 500}}>
              ({restaurant.review_count || 0} reviews) {restaurant.price && <span style={{fontWeight: 'bold', color: '#1A237E'}}>{restaurant.price}</span>}
            </Typography>
          </Box>
        </CardContent>
        
        {!isMatched && onLike && (
            <CardActions sx={{ display: 'flex', justifyContent: 'space-around', pt:0, pb:1, backgroundColor: 'background.paper' }}>
              <IconButton onClick={onDislike} color="error" disabled={disabled} sx={{
                border: '2px solid', 
                borderColor: '#f44336', 
                p:1,
                '&:hover': { backgroundColor: '#ffebee', transform: 'scale(1.05)' },
                transition: 'all 0.2s'
              }}><RestaurantMenu sx={{transform: 'rotate(135deg)'}} /></IconButton>
              <IconButton onClick={onSuperlike} color="warning" disabled={disabled || isSuperliked} sx={{
                border: '2px solid', 
                borderColor: '#ff9800', 
                p:1,
                '&:hover': { backgroundColor: '#fff8e1', transform: 'scale(1.05)' },
                transition: 'all 0.2s'
              }}><Star /></IconButton>
              <IconButton onClick={onLike} color="success" disabled={disabled} sx={{
                border: '2px solid', 
                borderColor: '#4caf50', 
                p:1,
                '&:hover': { backgroundColor: '#e8f5e9', transform: 'scale(1.05)' },
                transition: 'all 0.2s'
              }}><Favorite /></IconButton>
            </CardActions>
        )}
        
        <CardActions sx={{ justifyContent: 'flex-start', pt:0, pl:1, pb: 1, backgroundColor: 'background.paper' }}>
            <Button
                onClick={handleExpandClick}
                aria-expanded={expanded}
                aria-label="show more"
                sx={{
                  color: '#1976d2',
                  fontWeight: 'bold',
                  display: 'flex',
                  alignItems: 'center',
                  '&:hover': { backgroundColor: '#e3f2fd' },
                  transition: 'all 0.2s'
                }}
            >
                <InfoIcon sx={{mr: 0.5}} />
                {expanded? "Hide Details" : "View Details"}
            </Button>
        </CardActions>

        <Collapse in={expanded} timeout="auto" unmountOnExit>
          <CardContent sx={{pt:0, backgroundColor: '#f9f9f9'}}>
            {loadingDetails && <Box sx={{display:'flex', justifyContent:'center'}}><CircularProgress size={24} /></Box>}
            {errorDetails && <Alert severity="error" sx={{mb:1}}>{errorDetails}</Alert>}
            {details && (
              <Box>
                {details.coordinates?.latitude && details.coordinates?.longitude && (
                  <Box sx={{ height: '200px', width: '100%', my: 2, borderRadius: 2, overflow:'hidden', border: '1px solid #dddddd' }}>
                    <Map
                      defaultCenter={{ lat: details.coordinates.latitude, lng: details.coordinates.longitude }}
                      defaultZoom={15}
                      mapId={import.meta.env.VITE_GOOGLE_MAPS_MAP_ID || 'DEMO_MAP_ID'}
                      gestureHandling={'greedy'}
                      disableDefaultUI={true}
                    >
                      <AdvancedMarker position={{ lat: details.coordinates.latitude, lng: details.coordinates.longitude }}>
                        <Pin />
                      </AdvancedMarker>
                    </Map>
                  </Box>
                )}
                {details.phone && (
                  <Typography variant="body2" sx={{display: 'flex', alignItems: 'center', mb:1, color: '#333333', fontWeight: 500}}>
                    <Phone sx={{mr:1, color: '#1976d2'}} fontSize="small"/> {details.display_phone || details.phone}
                  </Typography>)
                }
                {details.url && (
                  <Button startIcon={<Launch color="primary"/>} href={details.url} target="_blank" rel="noopener noreferrer" sx={{mb:1, p:0, justifyContent:'flex-start', fontWeight: 'bold'}} size="small">
                    View on Yelp
                  </Button>)
                }
                {details.hours && details.hours[0]?.open && (
                  <Box sx={{my:1, backgroundColor: 'background.paper', p: 1, borderRadius: 1, boxShadow: '0 1px 3px rgba(0,0,0,0.1)'}}>
                     <Box 
                         onClick={() => setHoursExpandedLocal(!hoursExpandedLocal)}
                         sx={{ cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #eee', py: 0.5}}
                       >
                        <Typography variant="subtitle2" sx={{display: 'flex', alignItems: 'center', fontWeight: 'bold', color: '#333333'}}><AccessTime sx={{mr:1, color: '#1976d2'}}/>Hours</Typography>
                        {hoursExpandedLocal ? <ExpandLessIcon color="primary" /> : <ExpandMoreIconMUI color="primary" />}
                    </Box>
                    {details.hours[0].is_open_now !== undefined && (
                         <Typography variant="body2" sx={{ color: details.hours[0].is_open_now ? '#2E7D32' : '#D32F2F', fontWeight: 'bold', mb: 0.5, mt:0.5 }}>
                           {details.hours[0].is_open_now ? 'Open now' : 'Closed now'}
                         </Typography>
                    )}
                    <Collapse in={hoursExpandedLocal} timeout="auto" unmountOnExit>
                        <List dense disablePadding sx={{pl:1}}>
                          {formattedHoursLines.map((line, idx) => (
                            <ListItem key={idx} sx={{pl:0, py:0.1}}>
                              <ListItemText disableTypography
                                primary={<Typography variant="body2" sx={{color: '#333333'}}><strong>{line.day}:</strong> {line.time}</Typography>}
                              />
                            </ListItem>
                          ))}
                        </List>
                    </Collapse>
                  </Box>
                )}
                {details.photos && details.photos.length > 0 && (
                  <Box sx={{my:2, backgroundColor: 'background.paper', p: 1, borderRadius: 1, boxShadow: '0 1px 3px rgba(0,0,0,0.1)'}}>
                    <Typography variant="subtitle2" sx={{display: 'flex', alignItems: 'center', mb:1, fontWeight: 'bold', color: '#333333'}}><PhotoCamera sx={{mr:1, color: '#1976d2'}}/>Photos:</Typography>
                    <ImageList sx={{ width: '100%', height: 'auto', m:0 }} cols={3} rowHeight={100} gap={4}>
                      {details.photos.map((photo, idx) => (
                        <ImageListItem key={idx}>
                           <img src={photo} alt={`Restaurant photo ${idx + 1}`} style={{ width: '100%', height: '100px', objectFit: 'cover', borderRadius: '4px', border: '1px solid #dddddd' }} loading="lazy"/>
                        </ImageListItem>
                      ))}
                    </ImageList>
                  </Box>
                )}
                {details.reviews && details.reviews.length > 0 && (
                  <Box sx={{my:2, backgroundColor: 'background.paper', p: 1, borderRadius: 1, boxShadow: '0 1px 3px rgba(0,0,0,0.1)'}}>
                    <Typography variant="subtitle2" sx={{display: 'flex', alignItems: 'center', mb:1, fontWeight: 'bold', color: '#333333'}}><Reviews sx={{mr:1, color: '#1976d2'}}/>Reviews:</Typography>
                    {details.reviews.slice(0,2).map((review) => (
                      <Paper key={review.id} sx={{p:1, mb:1, bgcolor: '#f5f5f5', border: '1px solid #eeeeee'}} elevation={0}>
                          <Box sx={{display:'flex', alignItems: 'center', mb:0.5}}>
                            <Avatar src={review.user.image_url} sx={{width: 24, height: 24, mr:1}}/> 
                            <Typography variant="caption" fontWeight="bold" color="#333333">{review.user.name}</Typography>
                          </Box>
                          <Rating name={`review-rating-${review.id}`} value={review.rating || 0} readOnly size="small"/>
                          <Typography variant="caption" display="block" sx={{maxHeight: '3em', overflow: 'hidden', textOverflow: 'ellipsis', color: '#333333'}}>{review.text}</Typography>
                          <Typography variant="caption" color="#666666" display="block">{new Date(review.time_created).toLocaleDateString()}</Typography>
                      </Paper>
                    ))}
                  </Box>
                )}
              </Box>
            )}

            {showMatchDetails && (
              <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid #eee', backgroundColor: 'background.paper', p: 1, borderRadius: 1, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                <Typography variant="subtitle1" gutterBottom sx={{display: 'flex', alignItems: 'center', color: '#333333', fontWeight: 'bold'}}>
                  <PeopleAlt sx={{ mr: 1, color: '#1976d2' }} /> Agreed By:
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {allLikers.filter(player => player && player.id && player.name).map((player) => {
                    const isCurrentViewingPlayer = player.id === viewingPlayerId;
                    const didPlayerSuperlike = restaurant.superlikedBy?.includes(player.name); 
                    
                    return (
                      <Tooltip key={player.id} title={`${player.name} ${didPlayerSuperlike ? 'superliked this!' : 'liked this.' }`}>
                        <Chip 
                            avatar={<Avatar sx={{bgcolor: didPlayerSuperlike ? 'orange' : 'green', width:22, height:22, fontSize:'0.8rem'}}>{player.name[0]?.toUpperCase()}</Avatar>}
                            label={player.name} 
                            icon={didPlayerSuperlike ? <Star sx={{fontSize:'1rem'}}/> : <FavoriteBorder sx={{fontSize:'1rem'}}/>}
                            color={didPlayerSuperlike ? "warning" : "success"}
                            variant={isCurrentViewingPlayer ? "filled" : "outlined"}
                            size="small"
                        />
                      </Tooltip>
                    );
                  })}
                </Box>
              </Box>
            )}
          </CardContent>
        </Collapse>
      </Card>
    </Badge>
  );
}

export default RestaurantCard; 