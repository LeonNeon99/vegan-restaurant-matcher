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

## 6. Implement Session Sharing via Invite Link

*   **Goal:** Enable two users on different devices/browsers to participate in the same matching session simultaneously, initiated via a shared link.
*   **Problem:** Currently, the app seems designed for two players on the *same* device. Sharing requires significant architectural changes for state synchronization.
*   **Potential Solutions & Implementation:**
    *   **Architecture:** This requires moving from a purely client-side or simple request-response model to a stateful backend with real-time communication.
    *   **Backend:**
        *   **Session Management:**
            *   Generate unique session IDs upon creation.
            *   Store session state: player names, location/radius, list of potential restaurants, individual swipes (who swiped what), mutual matches. Choose a storage mechanism:
                *   In-memory dictionary (simple, but state lost on restart).
                *   Redis (good for caching/temporary state).
                *   Database (more persistent).
        *   **Real-time Communication:** Use WebSockets (e.g., FastAPI's `WebSocket` support) for bi-directional communication between clients and the server within a session. Alternatively, use Server-Sent Events (SSE) for server-to-client updates or client polling (less efficient).
        *   **New Endpoints:**
            *   `/sessions/create`: Creates a new session, stores initial data, returns session ID (part of invite link).
            *   `/sessions/{session_id}/join`: Allows a second player to join.
            *   `/sessions/{session_id}/state`: Endpoint to get the current state (possibly handled via WebSocket messages).
            *   WebSocket endpoint (`/ws/{session_id}`): Handles actions like swipes, sends updates to connected clients (e.g., "Player 1 swiped like", "New match found", "It's Player 2's turn").
        *   **Turn Management:** Implement logic to handle whose turn it is to swipe.
    *   **Frontend:**
        *   **UI Flow:**
            *   Modify startup: "Start New Session" (generates/displays invite link) vs. "Join Session" (prompts for link/ID).
            *   Connect to the WebSocket endpoint upon joining/creating a session.
            *   Send actions (swipes) via WebSocket.
            *   Listen for messages from the server (state updates, turn changes, new matches) and update the UI accordingly.
            *   Store `session_id` in state/context.
            *   Disable/enable swipe actions based on whose turn it is.
*   **Action Steps:**
    1.  **Design Backend:** Plan session state structure, choose storage, design API/WebSocket communication flow.
    2.  **Implement Backend:** Build session management, state storage, WebSocket handlers, and turn logic.
    3.  **Design Frontend:** Plan UI changes for creating/joining, real-time updates, turn indication.
    4.  **Implement Frontend:** Integrate WebSocket client, handle server messages, update UI based on real-time state. *This is a substantial feature.*

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