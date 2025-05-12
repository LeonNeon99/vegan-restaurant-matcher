import React, { useState } from 'react';
import Card from '@mui/material/Card';
import CardActions from '@mui/material/CardActions';
import CardContent from '@mui/material/CardContent';
import CardMedia from '@mui/material/CardMedia';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Rating from '@mui/material/Rating';
import IconButton from '@mui/material/IconButton';
import InfoIcon from '@mui/icons-material/Info';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import ImageList from '@mui/material/ImageList';
import ImageListItem from '@mui/material/ImageListItem';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import ReviewsIcon from '@mui/icons-material/Reviews';

function RestaurantCard({ restaurant, onLike, onDislike, onSuperlike, isSuperliked, hideButtons, isMatched }) {
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsData, setDetailsData] = useState(null);
  const [detailsError, setDetailsError] = useState(null);
  const [showDetails, setShowDetails] = useState(false);

  const handleFetchDetails = async () => {
    if (!restaurant || !restaurant.id) {
      setDetailsError("Restaurant ID is missing.");
      return;
    }
    
    if (showDetails) {
      setShowDetails(false);
      return;
    }
    
    if (detailsData) {
      setShowDetails(true);
      setDetailsError(null); 
      return;
    }

    setDetailsLoading(true);
    setDetailsError(null);
    setShowDetails(true); 

    try {
      const fetchUrl = `/restaurant-details/${restaurant.id}`;
      const response = await fetch(fetchUrl, { cache: 'no-cache' });

      const contentType = response.headers.get("content-type");
      if (!response.ok) {
        let errorText = `Error fetching details: ${response.status} ${response.statusText}`;
        if (contentType && contentType.includes("application/json")) {
            try {
                const errorData = await response.json();
                errorText = errorData.detail || errorText;
            } catch (jsonError) { 
                console.error("Could not parse error JSON response", jsonError);
            }
        } else {
             try {
                 const textResponse = await response.text();
                 console.error("Non-JSON error response body (first 100 chars):", textResponse.substring(0,100));
             } catch (textError) { /* Ignore */ }
        }
        console.error('Fetch error:', errorText); 
        throw new Error(errorText);
      }
      
      if (!contentType || !contentType.includes("application/json")) {
        console.error('Received non-JSON response:', contentType);
        throw new Error(`Expected JSON but received ${contentType || 'unknown type'}`);
      }

      const data = await response.json();
      setDetailsData(data);
    } catch (error) {
      setDetailsError(error.message);
    } finally {
      setDetailsLoading(false);
    }
  };

  const formatHours = (hours) => {
    if (!hours || hours.length === 0 || !hours[0].open) {
      return 'Hours not available.';
    }
    const formatTime = (time) => time ? `${time.substring(0, 2)}:${time.substring(2)}` : '';
    try {
      return hours[0].open.map(o => {
        const dayMap = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        return `${dayMap[o.day] || 'Day ' + o.day}: ${formatTime(o.start)} - ${formatTime(o.end)}`;
      }).join('\n');
    } catch (e) {
        console.error("Error formatting hours:", e, hours); 
        return "Could not parse opening hours.";
    }
  };

  if (!restaurant) {
    return <Card sx={{maxWidth: 345, margin: '20px auto'}}><CardContent><Typography>Error: Restaurant data missing.</Typography></CardContent></Card>;
  }

  return (
    <Card sx={{ 
      maxWidth: 345, 
      margin: '20px auto', 
      display: 'flex', 
      flexDirection: 'column', 
      justifyContent: 'space-between',
      backgroundColor: isMatched ? '#e6ffed' : 'inherit' 
    }}>
      <CardMedia
        component="img"
        height="140"
        image={restaurant.image_url || 'https://via.placeholder.com/345x140.png?text=No+Image'}
        alt={restaurant.name}
        sx={{ objectFit: 'cover' }}
      />
      <CardContent sx={{ flexGrow: 1 }}>
        <Typography gutterBottom variant="h5" component="div">
          {restaurant.name}
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
          <Rating name="read-only" value={restaurant.rating} precision={0.5} readOnly />
          <Typography variant="body2" color="text.secondary" sx={{ ml: 1 }}>
            ({restaurant.review_count} reviews)
          </Typography>
        </Box>
        <Typography variant="body2" color="text.secondary">
          {restaurant.location?.display_address?.join(', ') || 'Address not available'}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Price: {restaurant.price || 'N/A'}
        </Typography>
        {isMatched && (
          <Typography variant="body2" color="success.main" sx={{ mt: 1, fontWeight: 'bold' }}>
            It's a Match!
          </Typography>
        )}

        {showDetails && (
          <Box sx={{ mt: 2, borderTop: '1px solid #eee', pt: 2 }}>
            {detailsLoading && 
              <Box sx={{display: 'flex', justifyContent: 'center', my: 2}}>
                <CircularProgress size={24} />
              </Box>
            }
            {detailsError && 
              <>
                <Alert severity="error" sx={{mb:1}}>{detailsError}</Alert>
              </>
            }
            {detailsData && !detailsLoading && (
              <>
                {detailsData.photos && detailsData.photos.length > 0 && (
                  <Box sx={{my:1}}>
                    <Typography variant="subtitle1" gutterBottom component="div" sx={{ display: 'flex', alignItems: 'center' }}>
                      <ReviewsIcon fontSize="small" sx={{ mr: 0.5 }} /> More Photos
                    </Typography>
                    <ImageList sx={{ width: '100%', height: 'auto' }} cols={3} rowHeight={100}>
                      {detailsData.photos.slice(0, 3).map((photo, index) => (
                        <ImageListItem key={index}>
                          <img
                            src={`${photo}?w=100&h=100&fit=crop&auto=format`}
                            srcSet={`${photo}?w=100&h=100&fit=crop&auto=format&dpr=2 2x`}
                            alt={`Restaurant detail ${index + 1}`}
                            loading="lazy"
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                        </ImageListItem>
                      ))}
                    </ImageList>
                  </Box>
                )}

                {detailsData.hours && (
                   <Box sx={{my:1}}>
                    <Typography variant="subtitle1" gutterBottom component="div" sx={{ display: 'flex', alignItems: 'center' }}>
                      <AccessTimeIcon fontSize="small" sx={{ mr: 0.5 }} /> Hours
                    </Typography>
                    <Typography variant="body2" color="text.secondary" style={{ whiteSpace: 'pre-wrap' }}>
                      {detailsData.hours && detailsData.hours.length > 0 && detailsData.hours[0].is_open_now !== undefined && (
                        <Typography variant="body2" sx={{ color: detailsData.hours[0].is_open_now ? 'green' : 'red', fontWeight: 'bold', mb: 0.5 }}>
                          {detailsData.hours[0].is_open_now ? 'Open now' : 'Closed now'}
                        </Typography>
                      )}
                      {formatHours(detailsData.hours)}
                    </Typography>
                   </Box>
                )}

                {detailsData.reviews && detailsData.reviews.length > 0 && (
                  <Box sx={{my:1}}>
                    <Typography variant="subtitle1" gutterBottom component="div" sx={{ display: 'flex', alignItems: 'center' }}>
                      <ReviewsIcon fontSize="small" sx={{ mr: 0.5 }} /> Reviews
                    </Typography>
                    {detailsData.reviews.slice(0, 2).map((review, index) => (
                      <Box key={index} sx={{ mb: 1, p:1, border: '1px solid #f0f0f0', borderRadius: '4px'}}>
                        <Typography variant="body2">"{review.text}"</Typography>
                        <Typography variant="caption" color="text.secondary" display="block" align="right">- {review.user || 'A customer'}</Typography>
                      </Box>
                    ))}
                  </Box>
                )}
                {detailsData.url && (
                    <Button size="small" href={detailsData.url} target="_blank" rel="noopener noreferrer">
                        View on Yelp
                    </Button>
                )}
              </>
            )}
          </Box>
        )}
      </CardContent>

      <CardActions sx={{ justifyContent: 'flex-start', padding: '0 16px 8px 16px' }}>
        <IconButton onClick={handleFetchDetails} aria-label="show details">
          <InfoIcon />
        </IconButton>
      </CardActions>
    </Card>
  );
}

export default RestaurantCard; 