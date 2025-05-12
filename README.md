# Vegan Restaurant Matcher

A modern, full-stack web app for matching vegan restaurants, inspired by apps like Bumble.

- **Frontend:** Vite + React + Material UI (MUI)
- **Backend:** FastAPI (Python) with Yelp & OpenCage API integration
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
  - Enter two player names, location (with autocomplete), and search radius
  - Fetch vegan restaurants near the location (Yelp API)
  - Players swipe/like/dislike restaurants in turns (MatchPage)
  - ResultsPage shows mutual likes with details and Yelp links
  - Option to restart the search

- **Backend:**
  - `/geocode` — Geocodes a location string (OpenCage API)
  - `/autocomplete_location` — Location autocomplete (OpenCage API)
  - `/restaurants` — Returns vegan restaurants for given lat/lng/radius (Yelp API)
  - CORS enabled for frontend-backend communication

- **Frontend:**
  - Responsive, modern UI (Material UI)
  - Autocomplete for locations
  - Error handling and loading states
  - Results page with mutual likes and "View on Yelp" links

---

## Deployment

- **Frontend:** Deployed to Netlify ([example](https://vegan-restaurant-matcher.windsurf.build))
- **Backend:** Deployed to Render ([example](https://vegan-restaurant-matcher.onrender.com))
- **Environment Variables:**
  - Backend: `.env` file at project root
  - Frontend: `/frontend/.env.production` (set `VITE_API_URL` to backend URL)

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
- **Yelp API:** [Get one here](https://www.yelp.com/developers/v3/manage_app)
- **OpenCage API:** [Get one here](https://opencagedata.com/api)

Add both keys to your `.env` file in the project root:
```
YELP_API_KEY=your_yelp_api_key_here
OPENCAGE_API_KEY=your_opencage_api_key_here
```

---

## Development Workflow Advice

- **Quick Changes:**
  - You can push changes directly to your main branch and redeploy (Netlify/Render will auto-build)
  - For critical production apps, it’s best to use a feature branch or fork, test locally, then merge and deploy
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

## Features
- Player setup with names, location autocomplete, and search radius.
- Swipeable/like/dislike cards for vegan restaurants (Bumble-style UI).
- Gallery for multiple restaurant images.
- Results screen for mutual likes.
- Beautiful, modern, mobile-friendly design.

---

## Next Steps
- [ ] Scaffold the frontend (Vite + React + MUI)
- [x] Scaffold the backend (FastAPI)
- [ ] Connect frontend to backend endpoints
- [ ] Polish UI/UX

---

Questions? Open an issue or contact the maintainer!
