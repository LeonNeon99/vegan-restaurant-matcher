import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import httpx
from dotenv import load_dotenv

load_dotenv()

YELP_API_KEY = os.getenv("YELP_API_KEY")
OPENCAGE_API_KEY = os.getenv("OPENCAGE_API_KEY")


app = FastAPI()

@app.get("/debug_env")
def debug_env():
    return {
        "YELP_API_KEY": YELP_API_KEY,
        "OPENCAGE_API_KEY": OPENCAGE_API_KEY
    }

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
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
    if not OPENCAGE_API_KEY:
        raise HTTPException(status_code=500, detail="OpenCage API key not set.")
    url = "https://api.opencagedata.com/geocode/v1/json"
    params = {"q": data.location, "key": OPENCAGE_API_KEY, "limit": 1}
    async with httpx.AsyncClient() as client:
        r = await client.get(url, params=params, timeout=10)
        r.raise_for_status()
        results = r.json().get("results", [])
        if not results:
            raise HTTPException(status_code=404, detail="Location not found.")
        coords = results[0]["geometry"]
        return {"lat": coords["lat"], "lng": coords["lng"]}

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
