from __future__ import annotations

import logging
from datetime import datetime, timezone

import firebase_admin
from firebase_admin import auth as firebase_auth, credentials

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel

from backend.adapters.database import get_db

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/auth", tags=["auth"])

if not firebase_admin._apps:
    import os
    sa_path = os.environ.get("GOOGLE_APPLICATION_CREDENTIALS", "")
    if sa_path and os.path.exists(sa_path):
        cred = credentials.Certificate(sa_path)
        firebase_admin.initialize_app(cred)
    else:
        firebase_admin.initialize_app()


def _verify_firebase_token(token: str) -> dict:
    try:
        decoded = firebase_auth.verify_id_token(token)
        return decoded
    except Exception as e:
        raise ValueError(f"Invalid Firebase token: {e}")


async def _ensure_user_in_db(decoded: dict) -> dict:
    uid = decoded["uid"]
    email = decoded.get("email", "")
    name = decoded.get("name", "") or decoded.get("email", "").split("@")[0]

    db = await get_db()
    cursor = await db.execute("SELECT id, name, email, created_at FROM users WHERE id = ?", (uid,))
    user = await cursor.fetchone()

    if user:
        return dict(user)

    now = datetime.now(timezone.utc).isoformat()
    await db.execute(
        "INSERT INTO users (id, name, email, password_hash, created_at) VALUES (?, ?, ?, ?, ?)",
        (uid, name, email, "firebase", now),
    )
    await db.commit()
    return {"id": uid, "name": name, "email": email, "created_at": now}


async def get_current_user(request: Request) -> dict:
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing authorization header")
    try:
        decoded = _verify_firebase_token(auth_header[7:])
    except ValueError as e:
        raise HTTPException(status_code=401, detail=str(e))
    return await _ensure_user_in_db(decoded)


async def get_optional_user(request: Request) -> dict | None:
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        return None
    try:
        decoded = _verify_firebase_token(auth_header[7:])
    except ValueError:
        return None
    return await _ensure_user_in_db(decoded)


class UserResponse(BaseModel):
    id: str
    name: str
    email: str
    created_at: str


@router.get("/me", response_model=UserResponse)
async def me(user: dict = Depends(get_current_user)):
    return UserResponse(**user)
