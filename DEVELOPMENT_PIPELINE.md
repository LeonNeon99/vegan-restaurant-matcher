# Development Pipeline & Feature Roadmap

This document outlines planned improvements and features for the Vegan Restaurant Matcher application. Details may evolve during implementation.

---

## 1. Improve Location Input UX

*   **Problem:** The current location input using OpenCage for geocoding/autocomplete is not intuitive. Users get generic errors for incorrect city names, and it's unclear if/how street addresses can be used.
*   **Goal:** Make location input user-friendly, provide clear feedback during typing and on errors, and gracefully handle various input types (city, address, zip) using the Google Places API.
*   **Chosen API:** Google Places API (including Autocomplete and Geocoding).
*   **Implementation Plan:**
    *   **Backend (`/autocomplete_location`, `/geocode`):**
        *   Replace OpenCage API calls with calls to the Google Places API.
        *   **/autocomplete_location:** Use the Google Places Autocomplete API. This endpoint will take the user's partial input and return relevant location suggestions (addresses, cities, establishments).
        *   **/geocode:** Use the Google Geocoding API. This endpoint will take a selected suggestion (identified by its Place ID from Autocomplete) or a raw address string and convert it into precise latitude/longitude coordinates needed for the Yelp search.
        *   **API Key:** Access the Google Maps API Key securely from environment variables (`GOOGLE_MAPS_API_KEY`).
        *   **Error Handling:** Implement robust error handling for Google API responses (e.g., `ZERO_RESULTS`, `REQUEST_DENIED`, `OVER_QUERY_LIMIT`) and translate them into user-friendly error messages for the frontend.
    *   **Frontend:**
        *   Utilize a suitable autocomplete component (e.g., Material UI `Autocomplete`) configured to fetch suggestions from the backend `/autocomplete_location` endpoint.
        *   Implement debouncing on the input field to limit API calls while the user is typing.
        *   Display suggestions clearly, showing the formatted address provided by Google.
        *   When a user selects a suggestion, store the necessary information (like the Place ID or the full address string) to send to the `/geocode` endpoint.
        *   Show specific, user-friendly error messages based on feedback from the backend.
        *   Add helpful placeholder text like "Enter address, city, or zip code".
        *   Visually indicate loading states during autocomplete lookups and geocoding.
*   **Required Setup (User Action Needed):**
    1.  **Google Cloud Project:** Ensure a Google Cloud project exists.
    2.  **Enable APIs:** In the Google Cloud Console for your project, enable:
        *   **Places API**
        *   **Geocoding API**
    3.  **Create & Restrict API Key:** Create an API key in "APIs & Services" > "Credentials". **Restrict the key** to only allow the enabled APIs (Places, Geocoding) and potentially HTTP referrers (your website domain) or IP addresses later.
    4.  **Enable Billing:** Link a billing account to your project (required for most Google Maps Platform APIs, though a generous free tier exists).
    5.  **Configure Environment:** Add the created API key to your backend `.env` file:
        ```
        GOOGLE_MAPS_API_KEY=YOUR_API_KEY_HERE
        ```
        *(Ensure `.env` is in `.gitignore`)*.
*   **Action Steps:**
    1.  User: Complete the Google Cloud setup and provide the API key in `.env`. *(Assumed complete)*
    2.  Backend: Install the necessary Google client library (`pip install googlemaps` or use `requests`). *(Completed)*
    3.  Backend: Implement `/autocomplete_location` using Google Places Autocomplete API. *(Completed)*
    4.  Backend: Implement `/geocode` using Google Geocoding API. *(Completed)*
    5.  Frontend: Implement the improved Autocomplete input component, connecting it to the new backend endpoints. *(Completed)*
    6.  Frontend/Backend: Refine error handling and user feedback. *(Completed)*
*   **Status:** Complete

---

## 2. Optimize Restaurant Loading Experience

*   **Problem:** Clicking "Find Restaurants" triggers a potentially long background process (up to 20 seconds) fetching data from the Yelp API, with no visual feedback to the user, making the app feel unresponsive or broken.
*   **Goal:** Provide immediate feedback upon clicking the button and reduce the perceived wait time before the user can start interacting with restaurant cards.
*   **Potential Solutions & Implementation:**
    *   **Frontend (Immediate Feedback):**
        *   Add a loading state to the "Find Restaurants" button itself (e.g., replace text with a spinner, disable the button) immediately upon click.
        *   Display a full-page or section-specific loading indicator (e.g., skeleton screen, centered spinner with text like "Finding vegan spots near you...") on the MatchPage as soon as navigation occurs.
    *   **Frontend/Backend (Progressive Loading - Choose One):**
        *   **Option A (Frontend Waits for First Card):** Keep fetching all restaurants at once in the backend. The frontend shows the loading indicator until the *first* restaurant's data is available. Render the first swipe card, allowing interaction, while the rest of the data might still be arriving or processing in the background state management. *Requires careful state management.*
        *   **Option B (Backend Pagination):** Modify the backend `/restaurants` endpoint to support pagination (e.g., using `limit` and `offset` parameters, compatible with Yelp API if possible). The frontend initially requests a small batch (e.g., 5-10 restaurants). Once the user swipes through most of them, trigger a request for the next batch. *This is more complex, requiring backend changes and more sophisticated frontend logic.*
    *   **Backend (`/restaurants` Optimization):**
        *   Review the Yelp API call: Are we requesting unnecessary data fields?
        *   Ensure backend processing after the API call is efficient.
*   **Action Steps:**
    1.  Implement immediate frontend loading indicators (button state, loading screen). *(Completed)*
    2.  Investigate Yelp API pagination capabilities. *(Completed - Yelp supports offset/limit)*
    3.  Decide between Progressive Loading Option A (simpler) or B (more complex but potentially smoother UX). *(Decision: Start with Option A - Render page after full fetch. Revisit Option B if needed.)*
    4.  Implement the chosen loading strategy. *(Completed - Initial loading indicator covers Option A basic need)*
*   **Status:** Complete (Initial implementation). Further optimization (Option B) deferred.

---

## 3. Implement Advanced Filtering & Sorting

*   **Goal:** Allow users to refine the list of fetched restaurants based on criteria like Yelp rating, price range, and sort order (e.g., by distance, rating).
*   **Potential Solutions & Implementation:**
    *   **Backend (`/restaurants`):**
        *   **API Data Check:** Verified Yelp API supports `price` filtering and `sort_by` (rating, distance, etc.), but not direct `min_rating` filtering.
        *   **Endpoint Parameters:** Added optional `price`, `sort_by`, `min_rating` to request model.
        *   **Logic:** Pass `price` and `sort_by` to Yelp API. Filter results by `min_rating` in backend after fetch.
    *   **Frontend:**
        *   **UI Elements:** Added `Rating`, `ToggleButtonGroup`, and `Select` components to `SetupPage` for user input.
        *   **API Call:** Updated frontend (`SetupPage` -> `App.jsx` -> API call) to send filter/sort parameters to backend.
        *   **State Management:** Added state in `SetupPage` to manage filter/sort selections.
*   **Action Steps:**
    1.  Confirm available data fields (rating, price) in the Yelp API response. *(Completed)*
    2.  Design and implement UI elements for filters and sorting. *(Completed)*
    3.  Add corresponding query parameters and filtering/sorting logic to the backend endpoint. *(Completed)*
    4.  Connect frontend UI state to the API call parameters. *(Completed)*
*   **Status:** Complete

---

## 4. Enhance Restaurant Details Display

*   **Goal:** Provide users with more context about each restaurant directly on the swipe cards or results page, such as opening hours, review snippets, or menu highlights.
*   **Chosen API:** Yelp Fusion API (`/businesses/{id}` for details like photos/hours, `/businesses/{id}/reviews` for review excerpts).
*   **Potential Solutions & Implementation:**
    *   **Backend:**
        *   **API Data Check:** Yelp Details API provides `photos` (array), `hours`, `price`, etc. Yelp Reviews API provides up to 3 review excerpts (`text`). Menu data is unreliable via API.
        *   **Data Fetching Strategy:** Fetch details **on-demand** from the frontend to avoid slowing initial load.
        *   **New Endpoint:** Create `GET /restaurant-details/{business_id}`.
            *   Takes Yelp business ID as path parameter.
            *   Calls Yelp's `/v3/businesses/{id}` and `/v3/businesses/{id}/reviews`.
            *   Combines relevant data (e.g., `photos`, `hours`, `reviews` array) into a single response.
            *   Handles potential errors from Yelp API calls.
    *   **Frontend (`MatchPage.jsx` -> `RestaurantCard.jsx`):**
        *   Refactored `MatchPage` to use `RestaurantCard`.
        *   Added Info icon button to `RestaurantCard`.
        *   Trigger: Calls `/restaurant-details/{business_id}` when Info icon is clicked.
        *   State: Manages loading/error/data state within `RestaurantCard`.
        *   UI Design: Displays fetched details (photos, collapsible hours, reviews) within the card. Handles stale data when restaurant changes.
*   **Action Steps:**
    1.  Research Yelp API capabilities. *(Completed)*
    2.  Decide on data fetching strategy. *(Completed - On-demand)*
    3.  Implement backend endpoint `/restaurant-details/{business_id}`. *(Completed)*
    4.  Implement frontend logic in `RestaurantCard.jsx` to call endpoint and display details. *(Completed)*
    5.  Refactor `MatchPage.jsx` to use `RestaurantCard`. *(Completed)*
    6.  Fix stale data bug and improve hours UI. *(Completed)*
*   **Status:** Complete

---

## 5. Integrate Map View

*   **Goal:** Provide a visual representation of the mutually liked restaurants on a map, likely on the results page.
*   **Potential Solutions & Implementation:**
    *   **Frontend:**
        *   **Library Selection:** Choose a suitable React map library:
            *   `react-leaflet`: Open source, uses Leaflet.js. Good customization.
            *   `@vis.gl/react-google-maps`: Official Google Maps component. Requires API key, potential costs.
            *   `react-map-gl`: From Uber/Vis.gl, works well with Mapbox. Requires Mapbox token.
        *   **Component Implementation:**
            *   Create a new map component.
            *   Integrate this component into the `ResultsPage`.
            *   Obtain the list of mutually liked restaurants (which should include coordinates obtained from Yelp).
            *   Use the map library to display the map centered appropriately and add markers for each matched restaurant.
            *   Implement marker popups/tooltips showing the restaurant name and maybe a link to Yelp or its details.
    *   **Backend:** Likely no changes needed, assuming coordinates (`latitude`, `longitude`) are already being fetched and returned for each restaurant.
*   **Action Steps:**
    1.  Select and install a map library.
    2.  Create a map component.
    3.  Integrate the map into the `ResultsPage`.
    4.  Pass matched restaurant data (with coordinates) to the map component for rendering markers.

---

## 5a. Enhance Match Page UI/UX

*   **Goal:** Improve the visual presentation of the match page card area and incorporate visual feedback for superlikes made by the other player.
*   **Problem:** The current `MatchPage.jsx` card display is basic. If Player 1 superlikes a restaurant, Player 2 currently has no visual cue of this when the same card appears.
*   **Implementation Plan:**
    *   **`App.jsx`:** 
        *   Pass data to `MatchPage` to indicate if the current restaurant was superliked by the *other* player (e.g., if current player is P2, pass P1's superlikes).
    *   **`MatchPage.jsx`:**
        *   Receive this new prop.
        *   Adjust the main card area or the `RestaurantCard` component it renders to visually indicate if the *other* player superliked the current restaurant (e.g., a special border, a badge, or an icon on the card itself).
        *   General UI/styling improvements for the card presentation on `MatchPage`.
*   **Status:** Complete

---

## 6. Implement Session Sharing via Invite Link

*   **Goal:** Enable multiple users (up to 10) on different devices/browsers to participate in the same matching session simultaneously, initiated via a shared link.
*   **Problem:** Currently, the app seems designed for two players on the *same* device. Sharing requires significant architectural changes for state synchronization and group consensus.
*   **Detailed Implementation Plan:**
    *   **Backend Architecture:**
        *   **Session State:** Design a comprehensive session model to store all necessary data:
            ```python
            # Session model structure
            session = {
                "id": "unique_session_id",                # Random UUID for the session
                "created_at": "2025-05-12T21:16:07Z",     # ISO timestamp
                "setup": {
                    "location": "Miami, FL",              # The search location
                    "lat": 25.7617,                       # Latitude
                    "lng": -80.1918,                      # Longitude
                    "radius": 5000,                       # Search radius in meters
                    "price": "1,2,3,4",                   # Price filter
                    "min_rating": 4.0,                    # Rating filter
                    "sort_by": "best_match"               # Sort criteria
                },
                "players": {
                    "player_1": {                         # Dictionary of players keyed by ID
                        "id": "p1_unique_id",             # Random UUID for the player
                        "name": "Alice",                  # Player name
                        "connected": True,                # WebSocket connection status
                        "ready": True,                    # Player ready to start swiping
                        "swipes": {                       # Player's swipe decisions
                            "biz_id_1": "like",
                            "biz_id_2": "dislike",
                            "biz_id_3": "superlike"
                        },
                        "current_index": 5,               # Current restaurant index for this player
                        "is_host": True                   # Whether this player is the session host
                    },
                    "player_2": {
                        "id": "p2_unique_id",
                        "name": "Bob",
                        # Same structure as player_1
                        "is_host": False
                    },
                    # More players can be added (up to 10)
                },
                "max_players": 10,                        # Maximum number of players allowed
                "restaurants": [                          # Array of restaurant objects from Yelp
                    { "id": "biz_id_1", ... },
                    { "id": "biz_id_2", ... },
                    # More restaurants...
                ],
                "matches": {                              # Dictionary tracking votes per restaurant
                    "biz_id_1": {
                        "likes": ["p1_unique_id", "p2_unique_id"],  # Players who liked
                        "superlikes": ["p3_unique_id"],             # Players who superliked
                        "dislikes": ["p4_unique_id"]                # Players who disliked
                    },
                    # More restaurants with vote tallies...
                },
                "consensus_threshold": 0.5,               # Percentage of likes needed to be a match (configurable)
                "mode": "freeform",                       # "turn-based" or "freeform" swiping mode
                "status": "active"                        # Session status (active, completed, expired)
            }
            ```

        *   **Storage Implementation:**
            *   Use an in-memory dictionary initially for development simplicity:
                ```python
                # Global dictionary to store all active sessions
                sessions = {}
                
                # Function to find a session by ID
                def get_session(session_id):
                    return sessions.get(session_id)
                
                # Function to create a new session
                def create_session(host_name, location, lat, lng, radius, max_players=10, consensus_threshold=0.5, mode="freeform", **filters):
                    session_id = str(uuid.uuid4())
                    player_id = str(uuid.uuid4())
                    
                    # Initialize session structure
                    sessions[session_id] = {
                        "id": session_id,
                        "created_at": datetime.now().isoformat(),
                        "setup": {
                            "location": location,
                            "lat": lat,
                            "lng": lng,
                            "radius": radius,
                            "price": filters.get("price", "1,2,3,4"),
                            "min_rating": filters.get("min_rating", 0),
                            "sort_by": filters.get("sort_by", "best_match")
                        },
                        "players": {
                            player_id: {
                                "id": player_id,
                                "name": host_name,
                                "connected": False,
                                "ready": False,
                                "swipes": {},
                                "current_index": 0,
                                "is_host": True
                            }
                        },
                        "max_players": max_players,
                        "restaurants": [],
                        "matches": {},
                        "consensus_threshold": consensus_threshold,
                        "mode": mode,
                        "status": "waiting_for_players"
                    }
                    return session_id, player_id
                ```
            *   Add session cleanup to prevent memory leaks (e.g., delete sessions inactive for 24+ hours)
            *   Consider moving to Redis or a database like MongoDB later for persistence and scale

        *   **WebSocket Communication:**
            *   Use FastAPI's built-in WebSocket support:
                ```python
                @app.websocket("/ws/{session_id}/{player_id}")
                async def websocket_endpoint(websocket: WebSocket, session_id: str, player_id: str):
                    await websocket.accept()
                    
                    # Add connection to session
                    session = get_session(session_id)
                    if not session:
                        await websocket.send_json({"type": "error", "message": "Session not found"})
                        await websocket.close()
                        return
                        
                    # Authenticate player and update connection status
                    # ...
                    
                    try:
                        # Listen for messages
                        while True:
                            data = await websocket.receive_json()
                            
                            # Handle different message types
                            if data.get("action") == "swipe":
                                # Process swipe action
                                await process_swipe(session_id, player_id, data.get("restaurant_id"), data.get("decision"))
                                
                                # Notify players of updated state
                                await broadcast_state_update(session_id)
                                
                            elif data.get("action") == "finish_turn":
                                # Handle turn change
                                # ...
                    except WebSocketDisconnect:
                        # Handle disconnection
                        if session:
                            # Mark player as disconnected
                            # ...
                ```

            *   Define message protocols for client-server communication:
                * **Client → Server**:
                    * `{"action": "swipe", "restaurant_id": "...", "decision": "like|dislike|superlike"}`
                    * `{"action": "finish_turn"}`
                    * `{"action": "restart"}`
                * **Server → Client**:
                    * `{"type": "state_update", "data": {...}}` - Full or partial session state
                    * `{"type": "player_joined", "player_id": "...", "player_name": "..."}`
                    * `{"type": "turn_change", "current_turn": "player1|player2"}`
                    * `{"type": "match_found", "restaurant_id": "..."}`
                    * `{"type": "error", "message": "..."}`

        *   **HTTP Endpoints:**
            *   **`POST /sessions/create`** - Create a new session with Player 1's info:
                ```python
                @app.post("/sessions/create")
                async def create_session_endpoint(request: CreateSessionRequest):
                    # Request model contains player name, location details, filters
                    session_id, player_id = create_session(request.player_name, request.location, request.lat, request.lng, request.radius, ...)
                    
                    # Fetch restaurants async (don't wait) to populate the session
                    background_tasks.add_task(fetch_restaurants_for_session, session_id)
                    
                    # Return session info with URL to share
                    return {
                        "session_id": session_id,
                        "player_id": player_id,
                        "invite_url": f"{FRONTEND_URL}/join?session={session_id}"
                    }
                ```
            
            *   **`POST /sessions/{session_id}/join`** - Second player joins the session:
                ```python
                @app.post("/sessions/{session_id}/join")
                async def join_session_endpoint(session_id: str, request: JoinSessionRequest):
                    session = get_session(session_id)
                    if not session:
                        raise HTTPException(status_code=404, detail="Session not found")
                        
                    # Check if session is full
                    if len(session["players"]) >= session["max_players"]:
                        raise HTTPException(status_code=400, detail="Session is full")
                        
                    # Add new player to session
                    player_id = str(uuid.uuid4())
                    session["players"][player_id] = {
                        "id": player_id,
                        "name": request.player_name,
                        "connected": False,
                        "ready": False,
                        "swipes": {},
                        "current_index": 0,
                        "is_host": False
                    }
                    
                    return {
                        "session_id": session_id,
                        "player_id": player_id
                    }
                ```
                
            *   **`GET /sessions/{session_id}/state`** - Get the current session state:
                ```python
                @app.get("/sessions/{session_id}/state")
                async def get_session_state(session_id: str, player_id: str):
                    session = get_session(session_id)
                    if not session:
                        raise HTTPException(status_code=404, detail="Session not found")
                        
                    # Validate player belongs to session
                    # ...
                    
                    # Return sanitized session state (don't reveal other player's specific swipes)
                    return {
                        "id": session["id"],
                        "setup": session["setup"],
                        "players": {
                            "player1": {
                                "name": session["players"]["player1"]["name"],
                                "connected": session["players"]["player1"]["connected"],
                                "ready": session["players"]["player1"]["ready"],
                                "swipe_count": len(session["players"]["player1"]["swipes"])
                            },
                            "player2": { # Similar structure, if player2 exists }
                        },
                        "restaurant_count": len(session["restaurants"]),
                        "current_turn": session["current_turn"],
                        "status": session["status"],
                        "matches": session["matches"] if all players finished else [] # Only show matches if both done
                    }
                ```

        *   **Notification System:**
            *   Implement a function to broadcast updates to connected clients:
                ```python
                # Store active WebSocket connections
                active_connections = {}  # Map of (session_id, player_id) to WebSocket
                
                async def broadcast_state_update(session_id):
                    session = get_session(session_id)
                    if not session:
                        return
                        
                    # For each connected player in this session
                    for player_key in ["player1", "player2"]:
                        if player_key not in session["players"]:
                            continue
                            
                        player = session["players"][player_key]
                        conn_key = (session_id, player["id"])
                        
                        if conn_key in active_connections:
                            websocket = active_connections[conn_key]
                            try:
                                # Send customized state update (sanitized for this player)
                                await websocket.send_json({
                                    "type": "state_update",
                                    "data": get_player_view(session, player_key)
                                })
                            except Exception:
                                # Handle disconnection
                                pass
                ```

    *   **Frontend Implementation:**
        *   **Routing & New Pages:**
            *   Add routes for session creation and joining:
                ```jsx
                <Route path="/create-session" element={<CreateSessionPage />} />
                <Route path="/join" element={<JoinSessionPage />} />
                ```
            
            *   Update the existing landing page to offer both options:
                ```jsx
                <Button onClick={() => navigate('/create-session')}>
                  Start New Session
                </Button>
                <Button onClick={() => navigate('/join')}>
                  Join Existing Session
                </Button>
                ```
                
        *   **WebSocket Client:**
            *   Create a WebSocket connection handler:
                ```jsx
                function useSessionWebSocket(sessionId, playerId) {
                  const [connection, setConnection] = useState(null);
                  const [isConnected, setIsConnected] = useState(false);
                  const [lastMessage, setLastMessage] = useState(null);
                  
                  useEffect(() => {
                    if (!sessionId || !playerId) return;
                    
                    const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
                    const wsURL = API_BASE_URL.replace('http', 'ws') + `/ws/${sessionId}/${playerId}`;
                    const ws = new WebSocket(wsURL);
                    
                    ws.onopen = () => {
                      setIsConnected(true);
                      setConnection(ws);
                    };
                    
                    ws.onmessage = (event) => {
                      const message = JSON.parse(event.data);
                      setLastMessage(message);
                      
                      // Handle different message types
                      switch (message.type) {
                        case 'state_update':
                          // Update app state with new session data
                          break;
                        case 'player_joined':
                          // Handle new player notification
                          break;
                        // etc.
                      }
                    };
                    
                    ws.onclose = () => {
                      setIsConnected(false);
                    };
                    
                    return () => {
                      ws.close();
                    };
                  }, [sessionId, playerId]);
                  
                  const sendMessage = useCallback((data) => {
                    if (connection && isConnected) {
                      connection.send(JSON.stringify(data));
                    }
                  }, [connection, isConnected]);
                  
                  return { isConnected, lastMessage, sendMessage };
                }
                ```
                
        *   **Session Context:**
            *   Create a React context to manage session state:
                ```jsx
                const SessionContext = createContext(null);
                
                function SessionProvider({ children }) {
                  const [sessionId, setSessionId] = useState(null);
                  const [playerId, setPlayerId] = useState(null);
                  const [playerName, setPlayerName] = useState('');
                  const [isHost, setIsHost] = useState(false);
                  const [sessionState, setSessionState] = useState(null);
                  const [players, setPlayers] = useState({});
                  const [currentRestaurant, setCurrentRestaurant] = useState(null);
                  const [matchedRestaurants, setMatchedRestaurants] = useState([]);
                  
                  // Setup WebSocket connection using the custom hook
                  const { isConnected, lastMessage, sendMessage } = useSessionWebSocket(sessionId, playerId);
                  
                  // Effect to handle incoming WebSocket messages
                  useEffect(() => {
                    if (!lastMessage) return;
                    
                    // Update state based on message type
                    switch (lastMessage.type) {
                      case 'state_update':
                        setSessionState(lastMessage.data);
                        setPlayers(lastMessage.data.players || {});
                        // Set current restaurant if needed
                        break;
                      case 'player_joined':
                        // Update players list
                        break;
                      case 'match_found':
                        // Add to matches list and show notification
                        break;
                      case 'player_left':
                        // Update players list
                        break;
                      // Handle other message types
                    }
                  }, [lastMessage]);
                  
                  // Session creation - for the host
                  const createSession = async (playerName, location, lat, lng, radius, filters, options = {}) => {
                    try {
                      const response = await axios.post(`${API_BASE_URL}/sessions/create`, {
                        player_name: playerName,
                        location,
                        lat,
                        lng,
                        radius,
                        ...filters,
                        max_players: options.maxPlayers || 10,
                        consensus_threshold: options.consensusThreshold || 0.5,
                        mode: options.mode || 'freeform'
                      });
                      
                      setSessionId(response.data.session_id);
                      setPlayerId(response.data.player_id);
                      setPlayerName(playerName);
                      setIsHost(true);
                      
                      return response.data;
                    } catch (error) {
                      console.error('Failed to create session:', error);
                      throw error;
                    }
                  };
                  
                  // Join existing session - for non-host players
                  const joinSession = async (sessionId, playerName) => {
                    try {
                      const response = await axios.post(`${API_BASE_URL}/sessions/${sessionId}/join`, {
                        player_name: playerName
                      });
                      
                      setSessionId(sessionId);
                      setPlayerId(response.data.player_id);
                      setPlayerName(playerName);
                      setIsHost(false);
                      
                      return response.data;
                    } catch (error) {
                      console.error('Failed to join session:', error);
                      throw error;
                    }
                  };
                  
                  // Other methods like swipe, etc.
                  
                  return (
                    <SessionContext.Provider value={{
                      sessionId,
                      playerId,
                      playerName,
                      isHost,
                      sessionState,
                      players,
                      currentRestaurant,
                      matchedRestaurants,
                      isConnected,
                      createSession,
                      joinSession,
                      // Other methods
                    }}>
                      {children}
                    </SessionContext.Provider>
                  );
                }
                ```
                
        *   **UI Changes:**
            *   Create a **CreateSessionPage** that extends the existing SetupPage:
                *   Form for host name, location, radius, and filters
                *   Additional options for group settings:
                    *   Maximum number of players (2-10)
                    *   Consensus threshold (e.g., 50%, 66%, 75%, 100%)
                    *   Swiping mode: Turn-based or Freeform (everyone swipes at their own pace)
                *   Button to create session
                *   Display for the invite link once created
            
            *   Create a **JoinSessionPage** with:
                *   Form for player name
                *   Display of session details and current players
                *   "Join Session" button
            
            *   Create a **WaitingRoom** component:
                *   Shows all connected players
                *   Indicates who is ready
                *   Host has options to start the session or remove players
                *   Countdown timer once all players are ready
            
            *   Update **MatchPage** to:
                *   Show all players and their progress
                *   Display real-time updates for matches and player actions
                *   In turn-based mode: clearly indicate whose turn it is
                *   In freeform mode: allow anyone to swipe anytime
                *   Add "Ready for Results" button once a player finishes swiping
            
            *   Update **ResultsPage** to show:
                *   Consensus-based match results with vote counts
                *   Which players liked/superliked each match
                *   Option to sort by popularity
            
        *   **Navigation Flow:**
            *   **Player 1 Flow:**
                1.  Home page → "Start New Session"
                2.  Fill in details (name, location, filters) and create session
                3.  Share the generated invite link with Player 2
                4.  Wait for Player 2 to join (see indicator)
                5.  Take turns swiping on restaurants
                6.  See matches in real-time
            
            *   **Player 2 Flow:**
                1.  Open the invite link → JoinSessionPage
                2.  Enter name and join
                3.  Take turns swiping on restaurants
                4.  See matches in real-time
            
*   **Step-by-Step Implementation Approach:**
    1.  **Backend Foundation:**
        *   Implement the basic session data structure and in-memory storage
        *   Create the HTTP endpoints (`/sessions/create`, `/sessions/{id}/join`)
        *   Set up WebSocket endpoint infrastructure with basic connect/disconnect
    
    2.  **Frontend Skeleton:**
        *   Create new pages and routes
        *   Implement the SessionContext and provider
        *   Build basic UI for creating and joining sessions
    
    3.  **Core Communication:**
        *   Implement WebSocket message handlers (backend)
        *   Connect frontend to WebSockets and handle state updates
        *   Test basic session creation and joining
    
    4.  **Turn-Based Interaction:**
        *   Implement turn management in the backend
        *   Update frontend to respect whose turn it is
        *   Add controls to finish turn and change to the other player
    
    5.  **Real-Time Updates:**
        *   Refine the notifications system
        *   Add UI indicators for real-time events
        *   Implement graceful handling of disconnections/reconnections
    
    6.  **Polishing:**
        *   Add loading states and error handling
        *   Enhance the invite link sharing experience (copy button, etc.)
        *   Implement session cleanup and expiration logic
    
*   **Considerations & Potential Challenges:**
    *   **Session Management Complexity:** Supporting up to 10 players increases state complexity and synchronization challenges.
    *   **Consensus Algorithm:** Determining what constitutes a "match" with multiple players needs careful consideration. Options include:
        *   Simple majority (>50% positive votes)
        *   Super majority (e.g., ≥66% or ≥75% positive votes)
        *   Unanimous consensus (everyone must like)
        *   Veto system (no one can dislike)
        *   Weighted voting (superlikes count more than regular likes)
    *   **UI Space Constraints:** Displaying information about multiple players and their votes requires careful UI design, especially on mobile.
    *   **Turn Management:** In turn-based mode, handling player absence/disconnection becomes more important.
    *   **Server Load:** With up to 10 WebSocket connections per session and more complex state, server resource usage increases.
    *   **Connection Management:** More robust reconnection handling is needed with more participants.
    *   **Testing Complexity:** Testing scenarios with many players increases exponentially.

*   **Status:** In Progress

---

## Suggested Prioritization

1.  **High Priority (Core UX):**
    *   Improve Location Input UX (#1)
    *   Optimize Restaurant Loading Experience (#2)
2.  **Medium Priority (Enhancements):**
    *   Implement Advanced Filtering & Sorting (#3)
    *   Enhance Restaurant Details Display (#4)
3.  **Lower Priority / Larger Effort:**
    *   Integrate Map View (#5) - *Relatively standalone.*
    *   Implement Session Sharing via Invite Link (#6) - *Major feature, build upon stable core.*

--- 