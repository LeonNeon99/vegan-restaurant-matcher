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
    console.log('Info icon clicked!', { restaurantId: restaurant?.id, currentlyShowing: showDetails });

    if (!restaurant || !restaurant.id) {
      console.error("handleFetchDetails: Restaurant ID is missing.");
      setDetailsError("Restaurant ID is missing.");
      return;
    }
    // Toggle details visibility or fetch if not already fetched
    if (showDetails) {
      console.log('Hiding details');
      setShowDetails(false);
      return;
    }
    
    if (detailsData) { // If data already fetched, just show it
      console.log('Showing previously fetched details');
      setShowDetails(true);
      setDetailsError(null); // Clear previous errors
      return;
    }

    console.log('Starting to fetch details...');
    setDetailsLoading(true);
    setDetailsError(null);
    setShowDetails(true); // Show loading indicator in details section
    console.log('Set showDetails=true, detailsLoading=true');

    try {
      const fetchUrl = `/restaurant-details/${restaurant.id}`;
      console.log('Fetching from:', fetchUrl);
      const response = await fetch(fetchUrl);
      console.log('Fetch response status:', response.status);

      if (!response.ok) {
        let errorText = `Error fetching details: ${response.statusText}`;
        try {
            const errorData = await response.json();
            errorText = errorData.detail || errorText;
        } catch (jsonError) {
            console.error("Could not parse error response JSON", jsonError);
        }
        console.error('Fetch error:', errorText);
        throw new Error(errorText);
      }
      const data = await response.json();
      console.log('Successfully fetched details:', data);
      setDetailsData(data);
    } catch (error) {
      console.error("Failed inside fetch try-catch:", error);
      setDetailsError(error.message);
    } finally {
      console.log('Setting detailsLoading=false');
      setDetailsLoading(false);
    }
  };

  // Helper to format hours (basic example, Yelp hours can be complex)
  const formatHours = (hours) => {
    if (!hours || hours.length === 0 || !hours[0].open) {
      return 'Hours not available.';
    }
    // This is a simplified representation. Yelp provides an array of open times for each day.
    // For a more robust display, you'd iterate through hours[0].open (for daily hours)
    // and format them nicely.
    return hours[0].open.map(o => `Day ${o.day}: ${o.start} - ${o.end}`).join(', ');
  };

  return (
    <Card sx={{ 
      maxWidth: 345, 
      margin: '20px auto', 
      display: 'flex', 
      flexDirection: 'column', 
      justifyContent: 'space-between',
      backgroundColor: isMatched ? '#e6ffed' : 'inherit' // Highlight matched restaurants
    }}>
      <CardMedia
        component="img"
        height="140"
        image={restaurant.image_url || 'https://via.placeholder.com/345x140.png?text=No+Image'}
        alt={restaurant.name}
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

        {/* Details Section */}
        {console.log('Rendering Details Section Check:', { showDetails, detailsLoading, detailsError, hasData: !!detailsData })}
        {showDetails && (
          <Box sx={{ mt: 2, borderTop: '1px solid #eee', pt: 2 }}>
            {detailsLoading && 
              <Box sx={{display: 'flex', justifyContent: 'center', my: 2}}>
                 {console.log("Rendering loading spinner...")}
                <CircularProgress size={24} />
              </Box>
            }
            {detailsError && 
              <>
                {console.log("Rendering error alert:", detailsError)}
                <Alert severity="error" sx={{mb:1}}>{detailsError}</Alert>
              </>
            }
            {detailsData && !detailsLoading && (
              <>
                 {console.log("Rendering actual details data...")}
                {/* Photos */}
                {detailsData.photos && detailsData.photos.length > 0 && (
                  <Box sx={{my:1}}>
                    <Typography variant="subtitle1" gutterBottom component="div" sx={{ display: 'flex', alignItems: 'center' }}>
                      <ReviewsIcon fontSize="small" sx={{ mr: 0.5 }} /> More Photos
                    </Typography>
                    <ImageList sx={{ width: '100%', height: 'auto' }} cols={3} rowHeight={100}>
                      {detailsData.photos.slice(0, 3).map((photo, index) => ( // Show up to 3 more photos
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

                {/* Hours */}
                {detailsData.hours && (
                   <Box sx={{my:1}}>
                    <Typography variant="subtitle1" gutterBottom component="div" sx={{ display: 'flex', alignItems: 'center' }}>
                      <AccessTimeIcon fontSize="small" sx={{ mr: 0.5 }} /> Hours
                    </Typography>
                    <Typography variant="body2" color="text.secondary" style={{ whiteSpace: 'pre-wrap' }}>
                      {/* Yelp hours are structured. A robust parser is needed.
                          For now, showing simplified hours. Example:
                          Day 0 (Monday): 1100 (11 AM) - 2200 (10 PM)
                      */}
                      {detailsData.hours && detailsData.hours.length > 0 && detailsData.hours[0].is_open_now !== undefined && (
                        <Typography variant="body2" sx={{ color: detailsData.hours[0].is_open_now ? 'green' : 'red', fontWeight: 'bold', mb: 0.5 }}>
                          {detailsData.hours[0].is_open_now ? 'Open now' : 'Closed now'}
                        </Typography>
                      )}
                      {formatHours(detailsData.hours)}
                    </Typography>
                   </Box>
                )}

                {/* Reviews */}
                {detailsData.reviews && detailsData.reviews.length > 0 && (
                  <Box sx={{my:1}}>
                    <Typography variant="subtitle1" gutterBottom component="div" sx={{ display: 'flex', alignItems: 'center' }}>
                      <ReviewsIcon fontSize="small" sx={{ mr: 0.5 }} /> Reviews
                    </Typography>
                    {detailsData.reviews.slice(0, 2).map((review, index) => ( // Show up to 2 reviews
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

      <CardActions sx={{ justifyContent: 'space-between', padding: '0 16px 8px 16px' }}>
        <IconButton onClick={handleFetchDetails} aria-label="show details">
          <InfoIcon />
        </IconButton>
        {!hideButtons && (
          <Box>
            <Button size="small" color="error" onClick={() => onDislike(restaurant.id)}>Dislike</Button>
            <Button size="small" color="success" onClick={() => onLike(restaurant.id)}>Like</Button>
            <Button 
              size="small" 
              color="primary" 
              onClick={() => onSuperlike(restaurant.id)}
              variant={isSuperliked ? "contained" : "outlined"}
            >
              Superlike
            </Button>
          </Box>
        )}
      </CardActions>
    </Card>
  );
}

export default RestaurantCard; 