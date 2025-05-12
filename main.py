import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import httpx
from dotenv import load_dotenv
import googlemaps

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
    # Ensure radius is within Yelp's limits (max 40000m)
    # Although frontend should send 1000-25000, let's cap it just in case.
    safe_radius = min(data.radius, 40000)
    params = {
        "latitude": data.lat,
        "longitude": data.lng,
        # "radius": data.radius, # Use safe_radius instead
        "radius": safe_radius, # Use capped radius
        "categories": "vegan",
        "limit": 20, # Consider making this configurable later?
        "sort_by": "best_match"
    }
    
    # Add logging to see the exact parameters sent to Yelp
    print(f"Sending request to Yelp with params: {params}") 
    
    async with httpx.AsyncClient() as client:
        try: # Add try/except around the Yelp call specifically
            r = await client.get(url, headers=headers, params=params, timeout=10)
            print("Yelp response status:", r.status_code) # Log status code
            # print("Yelp response text:", r.text) # Keep this commented unless debugging Yelp response format
            r.raise_for_status() # Raise HTTPStatusError for 4xx/5xx responses
            results = r.json().get("businesses", [])
            # Optionally, fetch photos for each business (requires extra requests)
            # Consider moving photo fetching to a separate detail request later if needed
            # This secondary loop can significantly slow down the initial response
            # and might hit rate limits.
            # for biz in results:
            #     biz_id = biz.get("id")
            #     if biz_id:
            #         try:
            #             photo_resp = await client.get(f"https://api.yelp.com/v3/businesses/{biz_id}", headers=headers, timeout=6)
            #             if photo_resp.status_code == 200:
            #                 biz["photos"] = photo_resp.json().get("photos", [])
            #         except Exception as photo_err:
            #             print(f"Error fetching photos for {biz_id}: {photo_err}")
            #             biz["photos"] = [biz.get("image_url")] if biz.get("image_url") else []
            return results
        except httpx.HTTPStatusError as exc: # Catch specific Yelp API errors
            print(f"Yelp API Error: {exc.response.status_code} - {exc.response.text}")
            raise HTTPException(status_code=exc.response.status_code, detail=f"Error from Yelp API: {exc.response.text}")
        except httpx.RequestError as exc: # Catch network/connection errors
            print(f"Error connecting to Yelp API: {exc}")
            raise HTTPException(status_code=503, detail=f"Could not connect to Yelp API: {exc}")
        except Exception as exc: # Catch any other unexpected errors
            print(f"Unexpected error processing Yelp response: {exc}")
            raise HTTPException(status_code=500, detail="Internal error processing Yelp response.")
