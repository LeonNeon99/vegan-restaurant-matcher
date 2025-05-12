#!/bin/bash
# Install dependencies explicitly
pip install fastapi uvicorn httpx python-dotenv pydantic

# Install remaining requirements
pip install -r requirements.txt

# Start the application
exec python -m uvicorn main:app --host 0.0.0.0 --port $PORT
