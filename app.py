"""
Vegan Restaurant Matcher Streamlit App
"""
import streamlit as st
import requests

# --- Configuration & Constants ---
import streamlit as st
import requests
import math

YELP_API_BASE_URL = "https://api.yelp.com/v3/businesses/search"
YELP_GEOCODE_API = "https://nominatim.openstreetmap.org/search"

# --- Helper Functions ---
def geocode_location(location_text):
    """Geocode a location string to (lat, lon) using OpenStreetMap Nominatim."""
    try:
        params = {"q": location_text, "format": "json"}
        resp = requests.get(YELP_GEOCODE_API, params=params, timeout=8)
        resp.raise_for_status()
        data = resp.json()
        if data:
            return float(data[0]["lat"]), float(data[0]["lon"])
    except Exception as e:
        st.error(f"Geocoding failed: {e}")
    return None, None

def fetch_yelp_data(api_key, lat, lon, radius_m, search_terms="vegan,vegetarian restaurants"):
    """Fetches restaurant data from Yelp Fusion API using lat/lon and radius (meters)."""
    if not api_key:
        st.error("API Key is missing. Please configure it to fetch data.")
        return []
    headers = {"Authorization": f"Bearer {api_key}"}
    params = {
        "latitude": lat,
        "longitude": lon,
        "radius": int(radius_m),
        "term": search_terms,
        "categories": "vegan,vegetarian",
        "limit": 20
    }
    try:
        response = requests.get(YELP_API_BASE_URL, headers=headers, params=params, timeout=10)
        response.raise_for_status()
        data = response.json()
        restaurants = []
        if "businesses" in data:
            for biz in data["businesses"]:
                address_parts = biz.get("location", {}).get("display_address", [])
                formatted_address = ", ".join(address_parts) if address_parts else "Address not available"
                restaurants.append({
                    "id": biz.get("id"),
                    "name": biz.get("name", "Name not available"),
                    "address": formatted_address,
                    "phone": biz.get("display_phone", "Phone not available"),
                    "rating": biz.get("rating", 0.0),
                    "categories": [cat["title"] for cat in biz.get("categories", [])],
                    "image_url": biz.get("image_url"),
                    "yelp_url": biz.get("url", "#"),
                    "review_count": biz.get("review_count", 0),
                    "distance": biz.get("distance", None),
                    "photos": biz.get("photos", []),
                })
        return restaurants
    except Exception as e:
        st.error(f"Yelp API error: {e}")
        return []

def km_to_miles(km):
    return km * 0.621371

def meters_to_km(m):
    return m / 1000

def meters_to_miles(m):
    return m / 1609.34

# --- Main Application Logic ---
def main():
    st.set_page_config(page_title="Vegan Restaurant Matcher", layout="wide")
    st.markdown("""
        <style>
        .restaurant-card {background: #f8f9fa; border-radius: 12px; padding: 1.5rem; margin-bottom: 1.5rem; box-shadow: 0 2px 8px #0001;}
        .like-btn {color: #27ae60 !important; font-size: 1.7rem !important;}
        .dislike-btn {color: #c0392b !important; font-size: 1.7rem !important;}
        </style>
    """, unsafe_allow_html=True)
    st.title("🍽️ Vegan Restaurant Matcher")

    # --- Session State Initialization ---
    ss = st.session_state
    if "app_stage" not in ss: ss.app_stage = "setup"
    if "player1_name" not in ss: ss.player1_name = ""
    if "player2_name" not in ss: ss.player2_name = ""
    if "search_location_text" not in ss: ss.search_location_text = ""
    if "search_radius_km" not in ss: ss.search_radius_km = 3.0
    if "api_key" not in ss: ss.api_key = ""
    if "restaurants_data" not in ss: ss.restaurants_data = []
    if "player1_likes" not in ss: ss.player1_likes = set()
    if "player2_likes" not in ss: ss.player2_likes = set()
    if "current_index" not in ss: ss.current_index = 0
    if "error_message" not in ss: ss.error_message = ""
    if "geocoded" not in ss: ss.geocoded = (None, None)
    if "radius_unit" not in ss: ss.radius_unit = "km"

    # --- UI Routing ---
    if ss.app_stage == "setup":
        render_setup_screen()
    elif ss.app_stage == "player1_matching":
        render_matching_screen("Player 1", ss.player1_name, "player1_likes")
    elif ss.app_stage == "player2_matching":
        render_matching_screen("Player 2", ss.player2_name, "player2_likes")
    elif ss.app_stage == "results":
        render_results_screen()
    if ss.error_message:
        st.error(ss.error_message)
        ss.error_message = ""

def render_setup_screen():
    st.header("Setup: Enter Details")
    col1, col2 = st.columns(2)
    with col1:
        player1 = st.text_input("Player 1 Name", key="player1_name_input", value=st.session_state.player1_name)
        player2 = st.text_input("Player 2 Name", key="player2_name_input", value=st.session_state.player2_name)
    with col2:
        location = st.text_input("Location (City, State or Zip)", key="location_input", value=st.session_state.search_location_text)
        radius = st.slider("Search Radius", min_value=1, max_value=25, value=3, step=1, format="%d km")
        api_key = st.text_input("Yelp API Key", type="password", key="api_key_input", value=st.session_state.api_key)
    if st.button("Find Restaurants", type="primary"):
        if not all([player1.strip(), player2.strip(), location.strip(), api_key.strip()]):
            st.error("Please fill in all fields and provide your Yelp API Key.")
            return
        lat, lon = geocode_location(location)
        if lat is None or lon is None:
            st.error("Could not geocode the location. Please check your input.")
            return
        st.session_state.player1_name = player1.strip()
        st.session_state.player2_name = player2.strip()
        st.session_state.search_location_text = location.strip()
        st.session_state.search_radius_km = float(radius)
        st.session_state.api_key = api_key.strip()
        st.session_state.geocoded = (lat, lon)
        st.session_state.restaurants_data = fetch_yelp_data(api_key, lat, lon, float(radius)*1000)
        if not st.session_state.restaurants_data:
            st.error("No restaurants found for this location/radius.")
            return
        st.session_state.player1_likes = set()
        st.session_state.player2_likes = set()
        st.session_state.current_index = 0
        st.session_state.app_stage = "player1_matching"
    st.markdown("""
    <hr style='margin-top:2rem;margin-bottom:2rem;'>
    <div style='color:#888;font-size:0.95rem;'>
    <b>Tip:</b> Get your Yelp API key at <a href='https://www.yelp.com/developers/v3/manage_app' target='_blank'>Yelp Developers</a>.
    </div>
    """, unsafe_allow_html=True)

def render_matching_screen(player_label, player_name, likes_key):
    st.header(f"{player_label}'s Turn - Picking in {st.session_state.search_location_text} (within {st.session_state.search_radius_km} km)")
    restaurants = st.session_state.restaurants_data
    likes = st.session_state[likes_key]
    idx = st.session_state.current_index
    total = len(restaurants)

    if total == 0:
        st.error("No restaurants to display. Please restart.")
        return
    if idx >= total:
        # End of list for this player
        if st.button("I'm Done with My Choices"):
            st.session_state.current_index = 0
            if st.session_state.app_stage == "player1_matching":
                st.session_state.app_stage = "player2_matching"
            else:
                st.session_state.app_stage = "results"
        return

    biz = restaurants[idx]
    with st.container():
        st.markdown(f"<div class='restaurant-card'>", unsafe_allow_html=True)
        # Main image and gallery
        if biz.get("image_url"):
            if st.button("View Gallery", key=f"gallery_{biz['id']}"):
                st.image([biz["image_url"]] + biz.get("photos", []), width=350, caption=["Main"] + [f"Photo {i+1}" for i in range(len(biz.get("photos", [])))] )
            else:
                st.image(biz["image_url"], width=350)
        st.markdown(f"### {biz['name']}")
        st.markdown(f"**Cuisine:** {', '.join(biz['categories']) if biz['categories'] else 'N/A'}")
        st.markdown(f"**Rating:** {biz['rating']} ⭐ ({biz['review_count']} reviews)")
        if biz.get("distance") is not None:
            st.markdown(f"**Distance:** {meters_to_km(biz['distance']):.2f} km ({meters_to_miles(biz['distance']):.2f} mi)")
        # Like/Dislike buttons
        c1, c2 = st.columns([1,1])
        with c1:
            if st.button("❤️ Like", key=f"like_{biz['id']}"):
                likes.add(biz['id'])
                st.session_state.current_index += 1
                st.experimental_rerun()
        with c2:
            if st.button("❌ Dislike", key=f"dislike_{biz['id']}"):
                st.session_state.current_index += 1
                st.experimental_rerun()
        # More info expander
        with st.expander("More Info"):
            st.markdown(f"**Address:** {biz['address']}")
            st.markdown(f"**Phone:** {biz['phone']}")
            st.markdown(f"[View on Yelp]({biz['yelp_url']})")
        st.markdown("</div>", unsafe_allow_html=True)
    # Navigation
    if idx < total-1:
        st.button("Next Restaurant", key=f"next_{biz['id']}", on_click=lambda: setattr(st.session_state, 'current_index', idx+1))
    if st.button("I'm Done with My Choices"):
        st.session_state.current_index = 0
        if st.session_state.app_stage == "player1_matching":
            st.session_state.app_stage = "player2_matching"
        else:
            st.session_state.app_stage = "results"

def render_results_screen():
    st.header("Mutual Likes")
    p1_likes = st.session_state.player1_likes
    p2_likes = st.session_state.player2_likes
    mutual = set(p1_likes) & set(p2_likes)
    restaurants = {r['id']: r for r in st.session_state.restaurants_data}
    if mutual:
        for rid in mutual:
            biz = restaurants[rid]
            with st.container():
                st.markdown(f"<div class='restaurant-card'>", unsafe_allow_html=True)
                st.image(biz["image_url"], width=350)
                st.markdown(f"### {biz['name']}")
                st.markdown(f"**Cuisine:** {', '.join(biz['categories']) if biz['categories'] else 'N/A'}")
                st.markdown(f"**Rating:** {biz['rating']} ⭐ ({biz['review_count']} reviews)")
                if biz.get("distance") is not None:
                    st.markdown(f"**Distance:** {meters_to_km(biz['distance']):.2f} km ({meters_to_miles(biz['distance']):.2f} mi)")
                st.markdown(f"**Address:** {biz['address']}")
                st.markdown(f"[View on Yelp]({biz['yelp_url']})")
                st.markdown("</div>", unsafe_allow_html=True)
    else:
        st.warning("No mutual likes this round. Try again!")
    if st.button("Start New Search"):
        reset_app_state()
        st.error(st.session_state.error_message)
        st.session_state.error_message = ""

def reset_app_state():
    for key in [
        "app_stage", "player1_name", "player2_name", "search_location_text", "search_radius_km", "api_key", "restaurants_data", "player1_likes", "player2_likes", "current_index", "error_message", "geocoded", "radius_unit"
    ]:
        if key in st.session_state:
            del st.session_state[key]
    st.experimental_rerun()
    # Keep API key if entered previously, or clear if desired
    # st.session_state.api_key_input = "" 

if __name__ == "__main__":
    main()


