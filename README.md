# Vegan Restaurant Matcher

A modern, full-stack web app for matching vegan restaurants, inspired by apps like Bumble.

- **Frontend:** Vite + React + Material UI (MUI) + Google Maps
- **Backend:** FastAPI (Python) with Yelp & Google Maps Platform API integration
- **Deployment:** Netlify (frontend) & Render (backend)

---

## Project Structure

```
/Python Matchmaker/
  ├── frontend/         # React + Vite + MUI app (UI/UX)
  ├── main.py           # FastAPI backend (root-level)
  ├── requirements.txt  # Backend dependencies
  ├── startup.sh        # Backend startup script for deployment
  ├── render.yaml       # Render.com deployment config
  ├── .env              # Backend environment variables (not tracked)
  └── ...               # Other config files
```

---

## Features

- **User Flow:**
  - Enter two player names, location (with Google Places autocomplete), search radius, and optional filters (price, rating, sort order).
  - Fetch vegan restaurants near the location (Yelp API).
  - Players swipe/like/dislike/superlike restaurants in turns (`MatchPage`) with enhanced UI.
  - `RestaurantCard` shows details (photos, hours, reviews, map) on demand.
  - `ResultsPage` shows mutual likes with enhanced card layout and superlike indicators.
  - Option to restart the search.

- **Backend:**
  - `/geocode` — Geocodes a location string using Google Geocoding API.
  - `/autocomplete_location` — Location autocomplete using Google Places API.
  - `/restaurants` — Returns vegan restaurants for given lat/lng/radius (Yelp API), supporting filtering (price, min_rating) and sorting (distance, rating).
  - `/restaurant-details/{business_id}` — Returns details (photos, hours, reviews) for a specific restaurant from Yelp.
  - CORS enabled for frontend-backend communication.

- **Frontend:**
  - Responsive, modern UI (Material UI).
  - Google Places Autocomplete for locations.
  - Filtering/sorting options on setup page.
  - Swipeable `RestaurantCard` component showing core info, with expandable details (photos, hours, reviews, Google Map).
  - Visual indicator on `MatchPage` if the other player superliked the current card.
  - Enhanced `ResultsPage` with grid layout, restaurant cards, and superlike indicators.
  - Error handling and loading states.
  - Results page with mutual likes and "View on Yelp" links.

---

## Deployment

- **Frontend:** Deployed to Netlify ([example](https://vegan-restaurant-matcher.windsurf.build))
- **Backend:** Deployed to Render ([example](https://vegan-restaurant-matcher.onrender.com))
- **Environment Variables:**
  - **Backend (`.env` file at project root):**
    - `YELP_API_KEY`: Your Yelp Fusion API key.
    - `GOOGLE_MAPS_API_KEY`: Your Google Cloud API key (enabled for Places API, Geocoding API).
  - **Frontend (`/frontend/.env.production` or similar):**
    - `VITE_API_URL`: The URL of your deployed backend (e.g., `https://your-backend.onrender.com`).
    - `VITE_GOOGLE_MAPS_API_KEY`: Your Google Cloud API key (enabled for Maps JavaScript API). Needs `VITE_` prefix.

---

## Local Development

### Backend (FastAPI)
```sh
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
# Add your API keys to .env
uvicorn main:app --reload
```

### Frontend (React + Vite)
```sh
cd frontend
npm install
npm run dev
```

---

## API Keys
- **Yelp API:** [Get one here](https://www.yelp.com/developers/v3/manage_app). Used by the backend.
- **Google Maps Platform API Key:** [Setup instructions here](https://developers.google.com/maps/gmp-get-started). You need a single key with the following APIs enabled in your Google Cloud Project:
    - **Places API** (for backend autocomplete)
    - **Geocoding API** (for backend geocoding)
    - **Maps JavaScript API** (for frontend map display)
  Ensure you have billing enabled on the project and restrict the key appropriately.

Add the keys to your environment:
1.  **Backend:** Create a `.env` file in the project root:
    ```
    YELP_API_KEY=your_yelp_api_key_here
    GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here
    ```
    *(Ensure `.env` is in `.gitignore`)*.
2.  **Frontend:** Create a `.env` file in the `/frontend` directory (e.g., `.env.development` or `.env.local` for local testing):
    ```
    VITE_GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here
    VITE_API_URL=http://127.0.0.1:8000 # Or your backend dev server URL
    ```

---

## Development Workflow Advice

- **Quick Changes:**
  - You can push changes directly to your main branch and redeploy (Netlify/Render will auto-build)
  - For critical production apps, it's best to use a feature branch or fork, test locally, then merge and deploy
- **Recommended:**
  - Create a feature branch or fork for major changes
  - Test locally (`npm run dev` for frontend, `uvicorn main:app --reload` for backend)
  - Merge to main when ready, then push to trigger deployment
- **Hotfixes:**
  - For small fixes, you can push directly to main and redeploy

---

## Contact & Contributions
Feel free to fork, open issues, or contribute!

---

## Development Roadmap

See `DEVELOPMENT_PIPELINE.md` for the detailed feature roadmap and current progress.

---

Questions? Open an issue or contact the maintainer!
