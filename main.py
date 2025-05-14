import os
import uuid
from datetime import datetime, timezone
from typing import Dict, List, Optional, Any

import googlemaps
import httpx
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Depends, WebSocket, WebSocketDisconnect, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from fastapi.responses import JSONResponse
from fastapi.encoders import jsonable_encoder
import logging

load_dotenv()

YELP_API_KEY = os.getenv("YELP_API_KEY")
GOOGLE_MAPS_API_KEY = os.getenv("GOOGLE_MAPS_API_KEY")
YELP_API_URL = "https://api.yelp.com/v3/businesses/search"

# Initialize Google Maps client
if GOOGLE_MAPS_API_KEY:
    gmaps = googlemaps.Client(key=GOOGLE_MAPS_API_KEY)
else:
    gmaps = None

app = FastAPI()

# CORS configuration (as existing)
origins = [
    "http://localhost:5173",
    "https://localhost:5173",
    os.getenv("FRONTEND_URL"),
    "https://vegan-restaurant-matcher.windsurf.build", # Specific frontend URL
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin for origin in origins if origin], # Filter out None values
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Session Sharing Globals ---
sessions: Dict[str, Dict[str, Any]] = {}
active_connections: Dict[tuple[str, str], WebSocket] = {} # (session_id, player_id) -> WebSocket
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173") # Default for local dev

# --- Pydantic Models for Session Sharing ---
class Player(BaseModel):
    id: str
    name: str
    connected: bool = False
    ready: bool = False
    swipes: Dict[str, str] = Field(default_factory=dict) # restaurant_id -> "like" | "dislike" | "superlike"
    current_index: int = 0
    is_host: bool = False

class SessionSetup(BaseModel):
    location_description: str # e.g., "Miami, FL"
    lat: float
    lng: float
    radius: int # In meters
    price: Optional[str] = None # e.g., "1,2,3"
    min_rating: Optional[float] = None
    sort_by: Optional[str] = None

class Session(BaseModel):
    id: str
    created_at: datetime
    setup: SessionSetup
    players: Dict[str, Player] = Field(default_factory=dict) # player_id -> Player
    max_players: int = Field(default=2, ge=2, le=10)
    restaurants: List[Dict[str, Any]] = Field(default_factory=list)
    # Using Dict for matches to store votes per restaurant_id
    matches: Dict[str, Dict[str, List[str]]] = Field(default_factory=dict) # restaurant_id -> {"likes": [player_ids], "superlikes": [player_ids], "dislikes": [player_ids]}
    consensus_threshold: float = Field(default=0.5, ge=0.1, le=1.0) # e.g. 0.5 for 50%
    mode: str = "freeform" # "turn-based" or "freeform"
    status: str = "waiting_for_players" # "waiting_for_players", "active", "completed", "expired"
    host_id: str = ""

class CreateSessionRequest(BaseModel):
    host_name: str
    location_description: str
    lat: float
    lng: float
    radius: int
    price: Optional[str] = None
    min_rating: Optional[float] = None
    sort_by: Optional[str] = None
    max_players: int = Field(default=2, ge=2, le=10)
    consensus_threshold: float = Field(default=0.5, ge=0.1, le=1.0)
    mode: str = "freeform"

class JoinSessionRequest(BaseModel):
    player_name: str

class SessionCreateResponse(BaseModel):
    session_id: str
    player_id: str # Host's player ID
    invite_url: str

class SessionJoinResponse(BaseModel):
    session_id: str
    player_id: str # New player's ID

# --- Helper Functions for Session Management ---
def get_session(session_id: str) -> Optional[Dict[str, Any]]:
    return sessions.get(session_id)

async def fetch_restaurants_for_session(session_id: str):
    # Placeholder: Actual Yelp API call to fetch restaurants and store in session
    # This needs to be implemented similarly to the existing /restaurants endpoint
    # but store data in sessions[session_id]["restaurants"]
    print(f"Background task: Fetching restaurants for session {session_id}")
    session = get_session(session_id)
    if not session:
        print(f"Session {session_id} not found for fetching restaurants.")
        return

    headers = {"Authorization": f"Bearer {YELP_API_KEY}"}
    params = {
        "latitude": session["setup"]["lat"],
        "longitude": session["setup"]["lng"],
        "radius": min(session["setup"]["radius"], 40000),
        "categories": "vegan,vegetarian",
        "limit": 20, # Max limit reduced to 20 from 50
        "sort_by": session["setup"]["sort_by"] or "best_match",
    }
    if session["setup"]["price"]:
        params["price"] = session["setup"]["price"]

    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(YELP_API_URL, headers=headers, params=params)
            response.raise_for_status()
            data = response.json()
            
            fetched_restaurants = data.get("businesses", [])
            if session["setup"]["min_rating"]:
                min_r = session["setup"]["min_rating"]
                fetched_restaurants = [r for r in fetched_restaurants if r.get("rating", 0) >= min_r]

            # Limit to 20 restaurants at most
            fetched_restaurants = fetched_restaurants[:20]
            
            session["restaurants"] = fetched_restaurants
            # Avoid changing status here directly if it might cause race conditions with player joining
            # Status change could be tied to host action or all players ready
            print(f"Restaurants fetched for session {session_id}. Count: {len(fetched_restaurants)}")
            await broadcast_state_update(session_id) # Notify that restaurants are loaded

        except httpx.HTTPStatusError as e:
            print(f"Error fetching restaurants for session {session_id}: {e.response.text if e.response else str(e)}")
            session["status"] = "error_fetching_restaurants"
            await broadcast_state_update(session_id)
        except Exception as e:
            print(f"Unexpected error fetching restaurants for session {session_id}: {e}")
            session["status"] = "error_fetching_restaurants"
            await broadcast_state_update(session_id)

def create_session(request: CreateSessionRequest) -> tuple[str, str]:
    session_id = str(uuid.uuid4())
    host_player_id = str(uuid.uuid4())

    print(f"Creating new session {session_id} with host {request.host_name} (ID: {host_player_id})")

    host_player = Player(
        id=host_player_id,
        name=request.host_name,
        is_host=True,
        connected=False, 
        ready=False 
    )

    session_setup = SessionSetup(
        location_description=request.location_description,
        lat=request.lat,
        lng=request.lng,
        radius=request.radius,
        price=request.price,
        min_rating=request.min_rating,
        sort_by=request.sort_by
    )

    new_session_data = Session(
        id=session_id,
        created_at=datetime.now(timezone.utc),
        setup=session_setup,
        players={host_player_id: host_player},
        max_players=request.max_players,
        consensus_threshold=request.consensus_threshold,
        mode=request.mode,
        status="waiting_for_players",
        host_id=host_player_id  # Explicitly set host_id here
    )
    
    # Convert Pydantic models to dicts for storage
    session_dict = new_session_data.dict(by_alias=True)  # Pydantic v1
    
    # Ensure host_id is set in the session
    session_dict["host_id"] = host_player_id
    
    # Debug log the session data
    print(f"New session data: host_id={session_dict.get('host_id')}")
    print(f"Host player data: {session_dict.get('players', {}).get(host_player_id, {})}")
    
    sessions[session_id] = session_dict
    return session_id, host_player_id

# --- Placeholder for Broadcast Logic ---
async def broadcast_state_update(session_id: str):
    session = get_session(session_id)
    if not session:
        return

    print(f"Broadcasting state update for session {session_id}")
    
    # Use jsonable_encoder to properly handle datetime and other complex types
    session_data_to_send = jsonable_encoder(session)
    
    for player_id_key in list(session.get("players", {}).keys()): # Iterate over a copy of keys
        ws_key = (session_id, player_id_key)
        if ws_key in active_connections:
            websocket = active_connections[ws_key]
            try:
                await websocket.send_json({"type": "state_update", "data": session_data_to_send})
            except Exception as e:
                print(f"Error sending state to {player_id_key} in session {session_id}: {e}")
                # Potentially remove dead connection
                # del active_connections[ws_key]
                # if player_id_key in session["players"]:
                #     session["players"][player_id_key]["connected"] = False


# --- Existing Endpoints (autocomplete, geocode, restaurants, details) ---
# ... (Keep existing endpoints as they are)
class LocationAutocompleteRequest(BaseModel):
    q: str

class GeocodeRequest(BaseModel):
    location: str

class RestaurantRequest(BaseModel):
    lat: float
    lng: float
    radius: int # in meters
    price: Optional[str] = None
    sort_by: Optional[str] = "best_match"
    min_rating: Optional[float] = None

@app.get("/autocomplete_location")
async def autocomplete_location(q: str):
    if not GOOGLE_MAPS_API_KEY:
        raise HTTPException(status_code=500, detail="Google Maps API key not configured")
    try:
        autocomplete_result = gmaps.places_autocomplete(q)
        suggestions = [place['description'] for place in autocomplete_result]
        return {"suggestions": suggestions}
    except Exception as e:
        print(f"Error during Google Maps Autocomplete: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch autocomplete suggestions: {str(e)}")

@app.post("/geocode")
async def geocode(request: GeocodeRequest):
    if not GOOGLE_MAPS_API_KEY:
        raise HTTPException(status_code=500, detail="Google Maps API key not configured")
    try:
        geocode_result = gmaps.geocode(request.location)
        if not geocode_result:
            raise HTTPException(status_code=404, detail="Location not found or invalid.")
        
        lat = geocode_result[0]['geometry']['location']['lat']
        lng = geocode_result[0]['geometry']['location']['lng']
        return {"lat": lat, "lng": lng, "full_address": geocode_result[0]['formatted_address']}
    except Exception as e:
        print(f"Error during Google Maps Geocoding: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to geocode location: {str(e)}")

@app.post("/restaurants")
async def get_restaurants(request: RestaurantRequest, background_tasks: BackgroundTasks):
    if not YELP_API_KEY:
        raise HTTPException(status_code=500, detail="Yelp API key not configured")

    headers = {"Authorization": f"Bearer {YELP_API_KEY}"}
    params = {
        "latitude": request.lat,
        "longitude": request.lng,
        "radius": min(request.radius, 40000), # Yelp max radius is 40km
        "categories": "vegan,vegetarian", # Focusing on vegan/vegetarian
        "limit": 50, # Yelp API max limit
        "sort_by": request.sort_by or "best_match",
    }
    if request.price:
         params["price"] = request.price


    async with httpx.AsyncClient() as client:
        try:
            yelp_response = await client.get(YELP_API_URL, headers=headers, params=params)
            yelp_response.raise_for_status() 
        except httpx.HTTPStatusError as exc:
            print(f"Yelp API request failed: {exc.response.status_code} - {exc.response.text}")
            raise HTTPException(status_code=exc.response.status_code, detail=f"Yelp API Error: {exc.response.text}")
        except httpx.RequestError as exc:
            print(f"An error occurred while requesting Yelp API: {exc}")
            raise HTTPException(status_code=503, detail=f"Service unavailable: Could not connect to Yelp API.")

    data = yelp_response.json()
    businesses = data.get("businesses", [])
    
    if request.min_rating:
        min_r = request.min_rating
        businesses = [b for b in businesses if b.get("rating", 0) >= min_r]

    return {"businesses": businesses}


@app.get("/restaurant-details/{business_id}")
async def get_restaurant_details(business_id: str):
    if not YELP_API_KEY:
        raise HTTPException(status_code=500, detail="Yelp API key not configured")

    headers = {"Authorization": f"Bearer {YELP_API_KEY}"}
    details_url = f"https://api.yelp.com/v3/businesses/{business_id}"
    reviews_url = f"https://api.yelp.com/v3/businesses/{business_id}/reviews"
    
    async with httpx.AsyncClient() as client:
        try:
            # Fetch business details
            details_resp = await client.get(details_url, headers=headers)
            details_resp.raise_for_status()
            details_data = details_resp.json()

            # Fetch reviews (optional, could fail gracefully)
            reviews_data = {"reviews": []} # Default if reviews fetch fails
            try:
                reviews_resp = await client.get(reviews_url, headers=headers)
                reviews_resp.raise_for_status()
                reviews_data = reviews_resp.json()
            except httpx.HTTPStatusError as exc_reviews:
                print(f"Yelp API request for reviews failed: {exc_reviews.response.status_code} - {exc_reviews.response.text}")
                # Non-critical, proceed without reviews or with partial data if available

            # Combine data
            combined_data = {
                "id": details_data.get("id"),
                "name": details_data.get("name"),
                "image_url": details_data.get("image_url"),
                "photos": details_data.get("photos", []),
                "url": details_data.get("url"),
                "rating": details_data.get("rating"),
                "review_count": details_data.get("review_count"),
                "price": details_data.get("price"),
                "location": details_data.get("location"),
                "coordinates": details_data.get("coordinates"),
                "display_phone": details_data.get("display_phone"),
                "hours": details_data.get("hours", []),
                "reviews": reviews_data.get("reviews", []) 
            }
            return combined_data

        except httpx.HTTPStatusError as exc_details:
            print(f"Yelp API request for details failed: {exc_details.response.status_code} - {exc_details.response.text}")
            raise HTTPException(status_code=exc_details.response.status_code, detail=f"Yelp API Error: {exc_details.response.text}")
        except httpx.RequestError as exc:
            print(f"An error occurred while requesting Yelp API for details: {exc}")
            raise HTTPException(status_code=503, detail=f"Service unavailable: Could not connect to Yelp API.")


# --- New Session Sharing Endpoints ---
@app.post("/sessions/create", response_model=SessionCreateResponse)
async def create_new_session(request: CreateSessionRequest, background_tasks: BackgroundTasks):
    session_id, host_player_id = create_session(request)
    
    # Fetch restaurants in the background
    background_tasks.add_task(fetch_restaurants_for_session, session_id)
    
    invite_url = f"{FRONTEND_URL}/join?session={session_id}"
    return SessionCreateResponse(
        session_id=session_id,
        player_id=host_player_id,
        invite_url=invite_url
    )

@app.post("/sessions/{session_id}/join", response_model=SessionJoinResponse)
async def join_existing_session(session_id: str, request: JoinSessionRequest):
    session = get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    current_players = session.get("players", {})
    if len(current_players) >= session.get("max_players", 2):
        raise HTTPException(status_code=400, detail="Session is full")

    new_player_id = str(uuid.uuid4())
    # Ensure Player model is instantiated and then converted to dict if needed for storage
    new_player_model = Player(
        id=new_player_id,
        name=request.player_name,
        is_host=False,
        connected=False
    )
    # current_players[new_player_id] = new_player_model.model_dump(by_alias=True) # Pydantic v2
    current_players[new_player_id] = new_player_model.dict(by_alias=True) # Pydantic v1
    session["players"] = current_players # Re-assign to ensure update if it was a copy
    
    await broadcast_state_update(session_id)
    
    return SessionJoinResponse(session_id=session_id, player_id=new_player_id)

@app.websocket("/ws/{session_id}/{player_id}")
async def websocket_endpoint(websocket: WebSocket, session_id: str, player_id: str):
    print(f"WebSocket connection attempt: session_id={session_id}, player_id={player_id}")
    
    await websocket.accept()
    print(f"WebSocket connection accepted for session_id={session_id}, player_id={player_id}")
    
    session = get_session(session_id)
    if not session:
        print(f"ERROR: Session {session_id} not found for WebSocket connection")
        await websocket.send_json({"type": "error", "message": "Session not found"})
        await websocket.close()
        return

    current_player_data = session.get("players", {}).get(player_id)
    if not current_player_data:
        print(f"ERROR: Player {player_id} not found in session {session_id}")
        await websocket.send_json({"type": "error", "message": "Player not found in session"})
        await websocket.close()
        return

    print(f"WebSocket connection validated: Player '{current_player_data.get('name')}' ({player_id}) in session {session_id}")
    
    current_player_data["connected"] = True
    active_connections[(session_id, player_id)] = websocket
    player_name = current_player_data.get("name", "Unknown")
    print(f"Player {player_id} ({player_name}) connected to session {session_id}")
    
    # Auto-start sessions with only one player (singleplayer mode)
    if len(session.get("players", {})) == 1 and session.get("status") == "waiting_for_players" and len(session.get("restaurants", [])) > 0:
        current_player_data["ready"] = True
        session["status"] = "active"
        print(f"Auto-starting single player session {session_id}")
    
    await broadcast_state_update(session_id)

    try:
        while True:
            data = await websocket.receive_json()
            print(f"WS RCV from {player_id} ({player_name}) in {session_id}: {data}")
            
            action = data.get("action")
            if action == "swipe":
                restaurant_id = data.get("restaurant_id")
                decision = data.get("decision") 
                if restaurant_id and decision in ["like", "dislike", "superlike"]:
                    current_player_data["swipes"][restaurant_id] = decision
                    
                    # Update shared matches structure
                    session_matches = session.get("matches", {})
                    if restaurant_id not in session_matches:
                        session_matches[restaurant_id] = {"likes": [], "superlikes": [], "dislikes": []}
                    
                    # Atomically update votes for this restaurant
                    # Remove player from other lists for this restaurant
                    for vote_type_key in ["likes", "superlikes", "dislikes"]:
                        if player_id in session_matches[restaurant_id].get(vote_type_key, []):
                            if vote_type_key != decision + "s": # e.g. "likes" vs "like"+"s"
                                session_matches[restaurant_id][vote_type_key].remove(player_id)
                    
                    # Add to the current decision list if not already present
                    decision_key = decision + "s"
                    if player_id not in session_matches[restaurant_id].get(decision_key, []):
                        session_matches[restaurant_id].setdefault(decision_key, []).append(player_id)
                    
                    session["matches"] = session_matches # Ensure session dict is updated
                    print(f"Player {player_name} swiped {decision} on {restaurant_id}. Votes: {session_matches[restaurant_id]}")
                    
                    # Update player's current_index
                    current_player_data["current_index"] = current_player_data.get("current_index", 0) + 1
                    
                    # Check if all players have completed swiping through all restaurants
                    # Only count connected players in the completion check
                    connected_players = [p for p in session.get("players", {}).values() if p.get("connected", False)]
                    all_players_finished = True
                    for p in connected_players:
                        if p.get("current_index", 0) < len(session.get("restaurants", [])):
                            all_players_finished = False
                            break
                    
                    if all_players_finished and connected_players:
                        session["status"] = "completed"
                        print(f"Session {session_id} marked as completed - all players have swiped through all restaurants")
                    
                    await broadcast_state_update(session_id)
            
            elif action == "finish_early":
                # Player wants to finish early - they'll be auto-swiping the remaining restaurants
                print(f"Player {player_name} is finishing early, skipping {data.get('remaining_count', 0)} restaurants")
                # No special backend handling needed - the frontend will send individual swipes to complete
                
            elif action == "set_ready":
                is_ready = data.get("ready", False)
                current_player_data["ready"] = bool(is_ready)
                print(f"Player {player_name} is now {'ready' if is_ready else 'not ready'}.")
                await broadcast_state_update(session_id)
                
            elif action == "start_session":
                # Check if this player is the host
                is_host = current_player_data.get("is_host", False)
                is_marked_as_host_id = session.get("host_id") == player_id
                
                print(f"Start session requested by {player_name} (ID: {player_id})")
                print(f"Player is_host flag: {is_host}")
                print(f"Session host_id: {session.get('host_id')}")
                print(f"Match: {is_marked_as_host_id}")
                
                if is_host or is_marked_as_host_id:
                    # Check if all players are ready
                    all_players_ready = all(player.get("ready", False) for player in session.get("players", {}).values())
                    if all_players_ready:
                        session["status"] = "active"
                        print(f"Session {session_id} started by host {player_name}")
                        await broadcast_state_update(session_id)
                    else:
                        # Send error to host
                        await websocket.send_json({"type": "error", "message": "All players must be ready to start the session"})
                else:
                    # Send error about not being host
                    await websocket.send_json({"type": "error", "message": "Only the host can start the session"})

            # Further actions: e.g., host starts game, advances turn (if turn-based)

    except WebSocketDisconnect:
        print(f"Player {player_id} ({player_name}) disconnected from session {session_id}")
    finally:
        if (session_id, player_id) in active_connections:
            del active_connections[(session_id, player_id)]
        # Ensure player is marked as disconnected in the session state
        if session and session.get("players", {}).get(player_id):
            session["players"][player_id]["connected"] = False
            session["players"][player_id]["ready"] = False # Reset ready status on disconnect
        await broadcast_state_update(session_id)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

# Ensure existing endpoints are still available
# For example, if you have a root endpoint:
@app.get("/")
def read_root():
    return {"message": "Vegan Restaurant Matcher API"}
