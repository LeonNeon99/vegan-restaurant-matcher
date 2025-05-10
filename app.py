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
# OpenCage Geocoding API endpoint (recommended for production use)
OPENCAGE_API_URL = "https://api.opencagedata.com/geocode/v1/json"

# --- Helper Functions ---
def geocode_location(location_text):
    """
    Geocode a location string to (lat, lon) using OpenCage Geocoding API.
    Requires an API key set in Streamlit secrets as OPENCAGE_API_KEY.
    """
    import os
    OPENCAGE_API_KEY = os.environ.get("OPENCAGE_API_KEY") or st.secrets.get("OPENCAGE_API_KEY", None)
    if not OPENCAGE_API_KEY:
        st.error("OpenCage API key not set. Please add it to Streamlit secrets as OPENCAGE_API_KEY.")
        return None, None
    params = {"q": location_text, "key": OPENCAGE_API_KEY, "limit": 1}
    try:
        resp = requests.get(OPENCAGE_API_URL, params=params, timeout=8)
        resp.raise_for_status()
        data = resp.json()
        if data["results"]:
            lat = data["results"][0]["geometry"]["lat"]
            lon = data["results"][0]["geometry"]["lng"]
            return lat, lon
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

def get_location_suggestions(query, api_key):
    """Fetch location suggestions from OpenCage API for autocomplete."""
    if not query or not api_key or len(query) < 2:
        return []
    url = "https://api.opencagedata.com/geocode/v1/json"
    params = {"q": query, "key": api_key, "limit": 5, "no_annotations": 1, "language": "en"}
    try:
        resp = requests.get(url, params=params, timeout=6)
        resp.raise_for_status()
        data = resp.json()
        suggestions = []
        for result in data.get("results", []):
            formatted = result.get("formatted")
            if formatted:
                suggestions.append(formatted)
        return suggestions
    except Exception:
        return []

def render_setup_screen():
    st.markdown("""
        <style>
        .setup-title { font-family: 'Montserrat', 'Lato', 'Roboto', sans-serif; font-size:2.2rem; font-weight:700; color:#fff; margin-bottom:0.6em; }
        .setup-label { font-family: 'Montserrat', 'Lato', 'Roboto', sans-serif; font-size:1.1rem; font-weight:600; color:#fff; margin-bottom:0.25em; }
        .setup-input, .stTextInput input, .stTextInput label, .stSelectbox label, .stSlider label, .stSlider .css-1cpxqw2, .stSlider .css-14xtw13 { color: #fff !important; }
        .setup-tip { color:#eee; font-size:0.98rem; margin-top:1.5em; }
        section.main > div { background: #222 !important; }
        </style>
    """, unsafe_allow_html=True)
    st.markdown('<div class="setup-title">Setup: Enter Details</div>', unsafe_allow_html=True)
    col1, col2 = st.columns(2)
    with col1:
        st.markdown('<div class="setup-label">Player 1 Name</div>', unsafe_allow_html=True)
        player1 = st.text_input(" ", key="player1_name_input", value=st.session_state.player1_name, label_visibility="collapsed")
        st.markdown('<div class="setup-label">Player 2 Name</div>', unsafe_allow_html=True)
        player2 = st.text_input("  ", key="player2_name_input", value=st.session_state.player2_name, label_visibility="collapsed")
        st.markdown('<div class="setup-label">Yelp API Key</div>', unsafe_allow_html=True)
        api_key = st.text_input(" ", type="password", key="api_key_input", value=st.session_state.api_key, label_visibility="collapsed")
    with col2:
        st.markdown('<div class="setup-label">Location (City, Street, or Zip)</div>', unsafe_allow_html=True)
        opencage_key = st.secrets.get("OPENCAGE_API_KEY", "")
        location_query = st.text_input("Type location...", key="location_input", value=st.session_state.search_location_text, label_visibility="collapsed")
        suggestions = get_location_suggestions(location_query, opencage_key)
        location = location_query
        if suggestions:
            location = st.selectbox("Suggestions:", suggestions, index=0, key="location_suggestion")
        st.markdown('<div class="setup-label">Search Radius</div>', unsafe_allow_html=True)
        radius = st.slider(" ", min_value=1, max_value=25, value=3, step=1, format="%d km", label_visibility="collapsed")
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
        return
    st.markdown("""
    <hr style='margin-top:2rem;margin-bottom:2rem;'>
    <div class='setup-tip'>
    <b>Tip:</b> Get your Yelp API key at <a href='https://www.yelp.com/developers/v3/manage_app' target='_blank'>Yelp Developers</a>.<br>
    <b>Autocomplete:</b> Start typing a city, street, or zip code and pick from the dropdown.
    </div>
    """, unsafe_allow_html=True)

def render_matching_screen(player_label, player_name, likes_key):
    st.markdown("""
        <style>
        body { font-family: 'Montserrat', 'Lato', 'Roboto', sans-serif; background: #181818 !important; }
        .centered-card {
            display: flex; flex-direction: column; align-items: center; justify-content: center;
            min-height: 60vh;
        }
        .bumble-card {
            background: #232323;
            border-radius: 32px;
            box-shadow: 0 8px 32px #0005;
            width: 400px;
            padding: 0;
            margin: 0 auto 14px auto;
            position: relative;
            overflow: hidden;
        }
        .gallery-container {
            display: flex; align-items: center; justify-content: center; height: 240px; background: #111; position: relative;
        }
        .gallery-arrow {
            color: #FFDE59; background: transparent; border: none; font-size: 2.2rem; cursor: pointer; z-index: 2; margin: 0 8px; padding: 0 8px;
        }
        .gallery-arrow:disabled { opacity: 0.3; cursor: default; }
        .gallery-img {
            width: 320px; height: 220px; object-fit: cover; border-radius: 18px; box-shadow: 0 2px 16px #0006; margin: 0 12px;
        }
        .card-content {
            padding: 18px 24px 10px 24px;
        }
        .card-title {
            font-size: 2rem; font-weight: bold; color: #fff;
        }
        .card-sub {
            color: #fff; margin-bottom: 10px; font-size: 1.08rem;
        }
        .action-row {
            display: flex; justify-content: space-evenly; margin: 18px 0 8px 0;
        }
        .action-btn {
            background: #232323;
            border-radius: 50%;
            width: 68px; height: 68px;
            display: flex; align-items: center; justify-content: center;
            box-shadow: 0 2px 8px #0002;
            font-size: 2.2rem;
            border: 4px solid #FFDE59;
            transition: box-shadow 0.2s, border-color 0.2s;
            margin: 0 18px;
            cursor: pointer;
            color: #fff;
        }
        .action-btn.like { border-color: #27ae60; color: #27ae60; }
        .action-btn.dislike { border-color: #e74c3c; color: #e74c3c; }
        .action-btn:hover { box-shadow: 0 6px 24px #0003; }
        .bumble-yellow { color: #FFDE59; }
        </style>
    """, unsafe_allow_html=True)
    restaurants = st.session_state.restaurants_data
    likes = set(st.session_state[likes_key])
    idx = st.session_state.current_index
    total = len(restaurants)

    st.markdown(f"<div style='text-align:center; margin-bottom:0.6rem;'><span style='font-size:1.6rem;font-weight:600; color:#fff;'>🐝 {player_label}'s Turn</span><br><span style='color:#FFDE59;font-size:1.05rem;'>Picking in <b>{st.session_state.search_location_text}</b> (within <b>{st.session_state.search_radius_km} km</b>)</span></div>", unsafe_allow_html=True)

    if total == 0:
        st.error("No restaurants to display. Please restart.")
        return
    if idx >= total:
        if st.button("I'm Done with My Choices", key="done_choices"):
            st.session_state.current_index = 0
            if st.session_state.app_stage == "player1_matching":
                st.session_state.app_stage = "player2_matching"
            else:
                st.session_state.app_stage = "results"
            st.experimental_rerun()
        return

    biz = restaurants[idx]
    # --- Image Gallery State ---
    gallery_key = f"gallery_idx_{biz['id']}"
    if gallery_key not in st.session_state:
        st.session_state[gallery_key] = 0
    images = biz.get("photos") or ([biz["image_url"]] if biz.get("image_url") else [])
    images = images[:5] if images else ["https://via.placeholder.com/320x220?text=No+Image"]
    gallery_idx = st.session_state[gallery_key]
    gallery_idx = max(0, min(gallery_idx, len(images)-1))
    st.session_state[gallery_key] = gallery_idx

    st.markdown('<div class="centered-card">', unsafe_allow_html=True)
    st.markdown('<div class="bumble-card">', unsafe_allow_html=True)
    # --- Gallery with Arrows (top of card, minimal margin) ---
    st.markdown('<div class="gallery-container">', unsafe_allow_html=True)
    gallery_cols = st.columns([1,6,1], gap="small")
    with gallery_cols[0]:
        if st.button("⟵", key=f"gallery_left_{biz['id']}", disabled=(gallery_idx==0)):
            st.session_state[gallery_key] = max(0, gallery_idx-1)
            st.experimental_rerun()
    with gallery_cols[1]:
        st.image(images[gallery_idx], use_column_width=True, output_format="JPEG", caption=None)
    with gallery_cols[2]:
        if st.button("⟶", key=f"gallery_right_{biz['id']}", disabled=(gallery_idx==len(images)-1)):
            st.session_state[gallery_key] = min(len(images)-1, gallery_idx+1)
            st.experimental_rerun()
    st.markdown('</div>', unsafe_allow_html=True)
    # --- Card Content (minimal vertical space) ---
    st.markdown(f'''
        <div class="card-content" style="padding-top:10px; padding-bottom:8px;">
            <div class="card-title">{biz["name"]}</div>
            <div class="card-sub">{', '.join(biz['categories']) if biz['categories'] else 'N/A'}</div>
            <div class="card-sub">⭐ {biz['rating']} ({biz['review_count']} reviews)</div>
            {f'<div class="card-sub">📍 {meters_to_km(biz["distance"]):.2f} km ({meters_to_miles(biz["distance"]):.2f} mi)</div>' if biz.get('distance') is not None else ''}
        </div>
    ''', unsafe_allow_html=True)
    st.markdown('</div>', unsafe_allow_html=True)
    # --- Action Row ---
    st.markdown('<div class="action-row">', unsafe_allow_html=True)
    c1, c2, c3 = st.columns([1,1,1])
    with c1:
        if st.button("❌", key=f"dislike_{biz['id']}"):
            st.session_state.current_index += 1
            st.session_state[gallery_key] = 0
            return
    with c2:
        if st.button("ℹ️", key=f"info_{biz['id']}"):
            st.session_state[f"show_info_{biz['id']}"] = not st.session_state.get(f"show_info_{biz['id']}", False)
    with c3:
        if st.button("💛", key=f"like_{biz['id']}"):
            likes.add(biz['id'])
            st.session_state[likes_key] = likes
            st.session_state.current_index += 1
            st.session_state[gallery_key] = 0
            return
    st.markdown('</div>', unsafe_allow_html=True)
    # --- Info Expander (custom) ---
    if st.session_state.get(f"show_info_{biz['id']}", False):
        st.markdown(f"<div style='margin: 0 auto 18px auto; max-width: 370px; background: #191919; border-radius:18px; padding:16px 18px; color:#fff; font-size:1.04rem;'>", unsafe_allow_html=True)
        st.markdown(f"**Address:** {biz['address']}")
        st.markdown(f"**Phone:** {biz['phone']}")
        st.markdown(f"[View on Yelp]({biz['yelp_url']})")
        st.markdown("</div>", unsafe_allow_html=True)
    st.markdown('</div>', unsafe_allow_html=True)
    # --- Progress Dots ---
    dots = ''.join([f"<span style='font-size:2.2rem; color:{'#FFDE59' if i==idx else '#444'};'>•</span>" for i in range(total)])
    st.markdown(f"<div style='text-align:center; margin-top:1.1rem;'>{dots}</div>", unsafe_allow_html=True)
    if st.button("I'm Done with My Choices", key="done_choices_bottom"):
        st.session_state.current_index = 0
        if st.session_state.app_stage == "player1_matching":
            st.session_state.app_stage = "player2_matching"
        else:
            st.session_state.app_stage = "results"
        st.experimental_rerun()

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


