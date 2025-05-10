# Vegan Restaurant Matcher - Application Design (Version 2)

## 1. Introduction

This document outlines the revised design for the two-player vegan restaurant matcher application, incorporating user feedback for a Bumble-style UI/UX and location-based filtering. The application will be built using Streamlit and Python, with Yelp Fusion as the primary API for fetching restaurant data.

## 2. Core Requirements from User Feedback

1.  **Location-Based Filtering:**
    *   The application should prioritize displaying restaurants nearest to the user or within a user-selectable range.
    *   Users will input a central location (e.g., "New York", "90210") and select a search radius (e.g., 1km, 5km, 10km, or equivalent in miles) from a predefined list or a slider.
    *   The Yelp API's `latitude`, `longitude`, and `radius` parameters will be used. If a city name is given, it will first be geocoded (internally or via a simple lookup if Yelp supports city names directly with radius) to get coordinates for the radius search.

2.  **Bumble-style UI/UX (Conceptual Adaptation for Streamlit):**
    *   **Restaurant Card Display (Main View):**
        *   Each restaurant will be presented as a visually distinct card.
        *   **Primary Information:** Prominently display one main image of the restaurant, its name, primary cuisine style/categories (e.g., "Vegan", "Italian"), Yelp rating, and distance from the search center (if feasible to calculate/display simply).
    *   **Image Carousel/Gallery:**
        *   Clicking the main image or a dedicated icon on the card will open/expand an image gallery showing up to 5 photos of the restaurant if available from the API.
    *   **Detailed Information (Accessible via scroll or expander):**
        *   Below the primary card view, or within an expandable section, more details will be available: full address, phone number, a direct link to the restaurant's Yelp page (for menu, more reviews, directions), and potentially key tags/attributes (e.g., "Good for groups", "Outdoor seating") if provided by the API.
    *   **Like/Dislike Mechanism:**
        *   Instead of swipe gestures (which are not native to Streamlit and complex to implement reliably), prominent, visually appealing "Like" (e.g., a green heart icon button) and "Dislike" (e.g., a red 'X' icon button) buttons will be clearly associated with each restaurant card.
        *   The application will present restaurants one by one, or a few at a time in a scrollable list, for each player.
    *   **Overall Aesthetics & Color Scheme:** Aim for a modern, clean, and engaging UI. The color scheme will be updated to something more contemporary and neutral, moving away from default Streamlit themes or overly bright colors. Specific color palettes will be chosen during implementation, focusing on good contrast and readability.

3.  **Two-Player Workflow Adaptation:**
    *   The core two-player concept remains: each player independently likes/dislikes restaurants from the same fetched list.
    *   Clear visual cues will indicate whose turn it is.
    *   Mutual likes will be displayed on the results screen.

## 3. Revised Application Flow

1.  **Setup Screen:**
    *   Player 1 & Player 2 enter their names.
    *   Input for location: Text input for "City, State" or "Zip Code".
    *   Input for search radius: A `st.selectbox` or `st.slider` for selecting a radius (e.g., 1, 3, 5, 10 miles/km).
    *   "Find Restaurants" button.

2.  **Matching Screen (Iterative for each player):**
    *   Header: "Player X's Turn - Picking in [Location] (within [Radius])".
    *   Restaurants are displayed one by one, or in a vertically scrollable list of cards.
    *   **Restaurant Card:**
        *   Main image (clickable for gallery).
        *   Name, cuisine, rating, distance (if calculated).
        *   Like/Dislike icon buttons.
        *   An expander or "More Info" button to show detailed information (address, phone, Yelp link, additional attributes).
    *   Navigation: "Next Restaurant" button if displaying one by one, or users scroll through the list.
    *   "I'm Done with My Choices" button for the current player.

3.  **Transition Screen (Optional, if needed):**
    *   Briefly shows "Switching to Player Y..." or similar to manage the transition.

4.  **Results Screen:**
    *   Displays restaurants liked by both players, with their key details and images.
    *   If no mutual likes, an appropriate message is shown.
    *   Option to "Start New Search".

## 4. Data Structures (Refined)

*   `st.session_state.app_stage`: (String) "setup", "player1_matching", "player2_matching", "results".
*   `st.session_state.player1_name`, `st.session_state.player2_name`: (String)
*   `st.session_state.search_location_text`: (String) User-entered location string.
*   `st.session_state.search_radius_km`: (Float) User-selected radius in kilometers (Yelp API typically uses meters for radius).
*   `st.session_state.api_key`: (String) Yelp API Key.
*   `st.session_state.restaurants_data`: (List of Dictionaries) All restaurants fetched. Each dict: `id`, `name`, `image_url` (primary), `photos` (list of additional photo URLs, if Yelp provides this directly or via a secondary call), `address`, `phone`, `rating`, `review_count`, `categories` (list of strings), `yelp_url`, `distance` (from search center, if available/calculated).
*   `st.session_state.player1_likes`: (Set of Strings) Restaurant IDs liked by Player 1.
*   `st.session_state.player2_likes`: (Set of Strings) Restaurant IDs liked by Player 2.
*   `st.session_state.current_restaurant_index_p1`: (Integer) Index for Player 1 in `restaurants_data`.
*   `st.session_state.current_restaurant_index_p2`: (Integer) Index for Player 2 in `restaurants_data`.
*   `st.session_state.error_message`: (String).

## 5. UI/UX Design Considerations (Streamlit Components)

*   **Main Layout:** `st.set_page_config(layout="centered")` might be more appropriate for a card-based, focused UI, but "wide" can also work if information density is high.
*   **Restaurant Card:** `st.container()` with custom CSS for styling (borders, shadows for a card feel if possible, or using Streamlit's native card component if available and suitable). `st.image()` for the main picture. `st.subheader()` for name. `st.markdown()` or `st.caption()` for categories, rating, distance. `st.columns()` for Like/Dislike buttons.
*   **Image Carousel/Gallery:**
    *   The Yelp Business Details endpoint (`/businesses/{id}`) provides a `photos` field which is a list of photo URLs. This will be used.
    *   Implementation: When a user clicks the main image or a gallery icon:
        *   A modal (`st.dialog`) could display the gallery.
        *   Inside the modal: display the current main image larger, with small clickable thumbnails for the other images below it. Clicking a thumbnail updates the main image in the modal.
        *   Alternatively, a simpler approach within an `st.expander` on the main page: show the primary image, and if other images exist, list them as smaller `st.image` elements below it, perhaps horizontally scrollable if Streamlit supports that easily within an expander or if a custom component is considered (though we aim for standard components first).
*   **Like/Dislike Buttons:** Use `st.button` with icons (e.g., emojis ❤️, ❌ or custom SVG icons if supported well). Button states (e.g., a liked item showing a filled heart) will be managed by checking if the item is in the player's like set and re-rendering.
*   **Location Input:** `st.text_input` for location. `st.slider` or `st.selectbox` for radius.
*   **Color Scheme:** Research modern UI color palettes. For example, a base of off-white/light grey, with accent colors for primary actions (like button) and highlights. Avoid overly saturated colors. Example accents: a muted teal or a sophisticated blue.

## 6. API Integration (Yelp Fusion) - Adjustments

*   **Location & Radius:**
    *   The `/businesses/search` endpoint accepts `latitude`, `longitude`, and `radius` (in meters, max 40,000 which is ~25 miles).
    *   If the user provides a city name/zip, we may need a preliminary step to geocode this into latitude/longitude. Yelp's API itself might handle common city names directly with a location parameter, but for precise radius searches, coordinates are better. We will prioritize using Yelp's direct location string input first and see its effectiveness with the radius parameter.
    *   The `distance` field for each business is returned by Yelp API when searching with lat/long, which is ideal for display.
*   **Fetching Multiple Images:**
    *   The Business Search endpoint (`/businesses/search`) returns an `image_url` (primary image).
    *   To get multiple photos for the carousel (up to 3 as per Yelp's business details documentation, though sometimes more are available), a separate call to the Business Details endpoint (`/businesses/{id}`) for *each* restaurant might be necessary if the search result doesn't include a list of photos. This has significant implications for API call limits (500/day). 
    *   **Strategy:** Initially, use the single `image_url` from the search. For the 
