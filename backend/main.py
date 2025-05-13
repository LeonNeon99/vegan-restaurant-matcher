import os # Add os import
import uuid
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, Request, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Dict, List, Optional, Any, Set
import httpx
import asyncio
import logging

# ... (existing Pydantic models: Player, Restaurant, SessionSetup, Session, etc.) ...
# Ensure these are defined or imported if they were moved

# Environment variable for frontend URL (default for local dev)
FRONTEND_URL = os.getenv('FRONTEND_URL', 'http://localhost:5173')

# ... (rest of the app setup, sessions, active_connections, helpers like get_session etc.) ...

@app.post("/sessions/create", response_model=SessionCreationResponse)
async def http_create_session(session_setup: SessionSetup, request: Request):
    session_id = uuid.uuid4()
    session_id_str = str(session_id)

    # Determine client host for a more dynamic default if FRONTEND_URL is not explicitly set to a public one.
    # This is a fallback for a smarter local development experience but env var is preferred for prod.
    # client_host = request.headers.get('origin') or f"http://{request.client.host}:{request.client.port}"
    # Effective frontend_base_url, prioritizing the environment variable.
    # For invite links, always better to use a configured public URL.
    effective_frontend_url = FRONTEND_URL 
    # if FRONTEND_URL == 'http://localhost:5173' and client_host and not client_host.startswith('http://localhost'):
    #     # If default FRONTEND_URL is used but client is non-localhost, consider client's origin
    #     # This might be useful if accessing local backend from a mobile device on same network via IP
    #     pass # Potentially use client_host if logic for this is desired, but can be tricky

    session_data = {
        "id": session_id_str,
        "setup": session_setup.model_dump(),
        "status": "waiting_for_players",
        "players": {},
        "restaurants": [],
        "matches": {},
        "max_players": session_setup.max_players,
        "consensus_threshold": session_setup.consensus_threshold,
        "mode": session_setup.mode,
        "host_id": None, # Will be set when host connects via WebSocket
        "current_turn_player_id": None,
        "invite_url": f"{effective_frontend_url}/join?session={session_id_str}"
    }
    new_session = Session(**session_data)

    host_player_id = str(uuid.uuid4())
    new_session.players[host_player_id] = Player(
        id=host_player_id, 
        name=session_setup.host_name, 
        is_host=True, 
        connected=False, # Host connects via WS separately
        ready=False, 
        current_index=0
    )
    new_session.host_id = host_player_id
    
    sessions[session_id_str] = new_session
    logger.info(f"Session created: {session_id_str} by host {session_setup.host_name}. Invite: {new_session.invite_url}")

    # Asynchronously fetch restaurants after session creation
    asyncio.create_task(fetch_restaurants_for_session(session_id_str))

    return SessionCreationResponse(
        message="Session created successfully",
        session_id=session_id_str,
        player_id=host_player_id, # This is the host's player ID
        invite_url=new_session.invite_url
    )

# ... (rest of your backend code: /join, /state, /ws, etc.) ... 