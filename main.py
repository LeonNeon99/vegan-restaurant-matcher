import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import httpx
from dotenv import load_dotenv
import googlemaps
from typing import Optional

load_dotenv()

YELP_API_KEY = os.getenv("YELP_API_KEY")
GOOGLE_MAPS_API_KEY = os.getenv("GOOGLE_MAPS_API_KEY")

# Initialize Google Maps client
if GOOGLE_MAPS_API_KEY:
    gmaps = googlemaps.Client(key=GOOGLE_MAPS_API_KEY)
else:
    gmaps = None

app = FastAPI()

@app.get("/autocomplete_location")
async def autocomplete_location(q: str):
    if not gmaps:
        raise HTTPException(status_code=500, detail="Google Maps API key not set or client not initialized.")
    
    try:
        autocomplete_result = gmaps.places_autocomplete(
            input_text=q, 
            types='(regions)'
        )
        suggestions = [place['description'] for place in autocomplete_result if 'description' in place]
        return {"suggestions": suggestions}
    except googlemaps.exceptions.ApiError as e:
        print(f"Google Maps Autocomplete API Error: {e}")
        raise HTTPException(status_code=503, detail=f"Error communicating with Google Maps Autocomplete API: {e.message}")
    except Exception as e:
        print(f"An unexpected error occurred in autocomplete_location: {e}")
        raise HTTPException(status_code=500, detail="An unexpected error occurred while fetching location suggestions.")

@app.get("/debug_env")
def debug_env():
    return {
        "YELP_API_KEY": YELP_API_KEY,
        "GOOGLE_MAPS_API_KEY": GOOGLE_MAPS_API_KEY,
        "GMAPS_CLIENT_INITIALIZED": gmaps is not None
    }

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify your frontend URL here instead of *
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class GeocodeRequest(BaseModel):
    location: str

class RestaurantsRequest(BaseModel):
    lat: float
    lng: float
    radius: int
    price: Optional[str] = None  # Optional: Comma-separated string of price levels (1, 2, 3, 4)
    sort_by: Optional[str] = None # Optional: 'best_match', 'rating', 'review_count', 'distance'
    min_rating: Optional[float] = None # Optional: Minimum rating to filter by (e.g., 4.0)

class GeocodeResponse(BaseModel):
    lat: float
    lng: float

@app.post("/geocode", response_model=GeocodeResponse)
async def geocode_location(data: GeocodeRequest):
    if not gmaps:
        raise HTTPException(status_code=500, detail="Google Maps API key not set or client not initialized.")

    try:
        geocode_result = gmaps.geocode(address=data.location)
        if not geocode_result or not geocode_result[0].get('geometry', {}).get('location'):
            raise HTTPException(status_code=404, detail=f"Location not found or invalid: {data.location}")
        
        coords = geocode_result[0]['geometry']['location']
        return {"lat": coords["lat"], "lng": coords["lng"]}
    except googlemaps.exceptions.ApiError as e:
        print(f"Google Maps Geocode API Error: {e}")
        raise HTTPException(status_code=503, detail=f"Error communicating with Google Maps Geocode API: {e.message}")
    except HTTPException:
        raise
    except Exception as e:
        print(f"An unexpected error occurred in geocode_location: {e}")
        raise HTTPException(status_code=500, detail="An unexpected error occurred while geocoding location.")

@app.post("/restaurants")
async def get_restaurants(data: RestaurantsRequest):
    if not YELP_API_KEY:
        raise HTTPException(status_code=500, detail="Yelp API key not set.")
    
    url = "https://api.yelp.com/v3/businesses/search"
    headers = {"Authorization": f"Bearer {YELP_API_KEY}"}
    
    safe_radius = min(data.radius, 40000) # Keep radius check
    
    params = {
        "latitude": data.lat,
        "longitude": data.lng,
        "radius": safe_radius,
        "categories": "vegan", # Keep targeting vegan
        "limit": 50, # Increase limit slightly to get more results for potential filtering
        # "sort_by": "best_match" # Default, will be overridden if provided
    }

    # Add optional parameters if provided by the frontend
    if data.sort_by and data.sort_by in ['best_match', 'rating', 'review_count', 'distance']:
        params['sort_by'] = data.sort_by
    else:
        params['sort_by'] = 'best_match' # Ensure default if invalid sort_by is passed
        
    if data.price:
        # Basic validation: ensure it's comma-separated numbers 1-4
        valid_prices = all(p.isdigit() and 1 <= int(p) <= 4 for p in data.price.split(','))
        if valid_prices:
            params['price'] = data.price

    print(f"Sending request to Yelp with params: {params}") 
    
    async with httpx.AsyncClient() as client:
        try:
            r = await client.get(url, headers=headers, params=params, timeout=15) # Increased timeout slightly
            print("Yelp response status:", r.status_code)
            r.raise_for_status()
            results = r.json().get("businesses", [])

            # ---- Post-fetch Filtering (for options not supported by Yelp API directly) ----
            filtered_results = results
            
            # Filter by minimum rating if requested
            if data.min_rating is not None and data.min_rating > 0:
                print(f"Filtering results by min_rating: {data.min_rating}")
                filtered_results = [biz for biz in filtered_results if biz.get('rating', 0) >= data.min_rating]
                print(f"Results after rating filter: {len(filtered_results)}")

            # --- (Commented out photo fetching remains here) --- 
            # ...

            return filtered_results # Return the potentially filtered list

        except httpx.HTTPStatusError as exc:
            print(f"Yelp API Error: {exc.response.status_code} - {exc.response.text}")
            raise HTTPException(status_code=exc.response.status_code, detail=f"Error from Yelp API: {exc.response.text}")
        except httpx.RequestError as exc:
            print(f"Error connecting to Yelp API: {exc}")
            raise HTTPException(status_code=503, detail=f"Could not connect to Yelp API: {exc}")
        except Exception as exc:
            print(f"Unexpected error processing Yelp response: {exc}")
            raise HTTPException(status_code=500, detail="Internal error processing Yelp response.")
