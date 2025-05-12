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

class RestaurantsRequest(BaseModel):
    lat: float
    lng: float
    radius: int  # in meters

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
    params = {
        "latitude": data.lat,
        "longitude": data.lng,
        "radius": data.radius,
        "categories": "vegan",
        "limit": 20,
        "sort_by": "best_match"
    }
    async with httpx.AsyncClient() as client:
        r = await client.get(url, headers=headers, params=params, timeout=10)
        print("Yelp response:", r.text)  
        r.raise_for_status()
        results = r.json().get("businesses", [])
        # Optionally, fetch photos for each business (requires extra requests)
        for biz in results:
            biz_id = biz.get("id")
            if biz_id:
                try:
                    photo_resp = await client.get(f"https://api.yelp.com/v3/businesses/{biz_id}", headers=headers, timeout=6)
                    if photo_resp.status_code == 200:
                        biz["photos"] = photo_resp.json().get("photos", [])
                except Exception:
                    biz["photos"] = [biz.get("image_url")] if biz.get("image_url") else []
        return results
