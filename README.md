# Vegan Restaurant Matcher (Modern Version)

This project is a modern, full-stack web app for matching vegan restaurants, inspired by apps like Bumble. It uses:
- **Frontend:** Vite + React + MUI (Material UI)
- **Backend:** FastAPI (Python) for Yelp and OpenCage API integration

---

## Directory Structure

```
/Python Matchmaker/
  ├── frontend/    # React + Vite + MUI app (all UI/UX)
  └── backend/     # FastAPI app (Yelp & geocoding API endpoints)
```

---

## Getting Started

### 1. Backend (FastAPI)

1. **Setup:**
    ```sh
    cd backend
    python3 -m venv venv
    source venv/bin/activate
    pip install -r requirements.txt
    cp .env.example .env  # Add your API keys to .env
    ```
2. **Run:**
    ```sh
    uvicorn main:app --reload
    ```
3. **Endpoints:**
    - `POST /geocode` — `{ location: string }` → `{ lat, lng }`
    - `POST /restaurants` — `{ lat, lng, radius }` → `[restaurants]`

### 2. Frontend (Vite + React + MUI)

1. **Setup:**
    ```sh
    cd frontend
    npm install
    npm run dev
    ```
2. **Open:**
    - Visit [http://localhost:5173](http://localhost:5173) in your browser.

---

## API Keys
- **Yelp API:** [Get one here](https://www.yelp.com/developers/v3/manage_app)
- **OpenCage API:** [Get one here](https://opencagedata.com/api)

Add both keys to your `backend/.env` file:
```
YELP_API_KEY=your_yelp_api_key_here
OPENCAGE_API_KEY=your_opencage_api_key_here
```

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
