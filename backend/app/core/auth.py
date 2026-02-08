"""Authentication utilities for Google OAuth and JWT.

Handles:
- Google OAuth client configuration
- JWT token generation and validation
- User session management
"""

import os
from datetime import datetime, timedelta
from typing import Optional

from authlib.integrations.starlette_client import OAuth
from jose import JWTError, jwt
from pydantic import BaseModel


# JWT Configuration
SECRET_KEY = os.getenv("JWT_SECRET_KEY", "dev-secret-key-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("SESSION_EXPIRE_MINUTES", "10080"))  # 7 days default


class TokenData(BaseModel):
    """JWT token payload."""
    email: str
    name: str
    picture: Optional[str] = None
    exp: datetime


# OAuth Configuration
oauth = OAuth()

oauth.register(
    name='google',
    client_id=os.getenv('GOOGLE_CLIENT_ID'),
    client_secret=os.getenv('GOOGLE_CLIENT_SECRET'),
    server_metadata_url='https://accounts.google.com/.well-known/openid-configuration',
    client_kwargs={
        'scope': 'openid email profile'
    }
)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Create JWT access token.
    
    Args:
        data: Dictionary containing user data (email, name, picture)
        expires_delta: Custom expiration time (defaults to ACCESS_TOKEN_EXPIRE_MINUTES)
    
    Returns:
        Encoded JWT token string
    """
    to_encode = data.copy()
    
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    
    return encoded_jwt


def verify_token(token: str) -> Optional[TokenData]:
    """Verify and decode JWT token.
    
    Args:
        token: JWT token string
    
    Returns:
        TokenData if valid, None if invalid/expired
    """
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("email")
        name: str = payload.get("name")
        picture: Optional[str] = payload.get("picture")
        exp_timestamp: int = payload.get("exp")
        
        if email is None or name is None:
            return None
        
        exp = datetime.fromtimestamp(exp_timestamp)
        
        return TokenData(email=email, name=name, picture=picture, exp=exp)
    except JWTError:
        return None


def get_google_oauth_client():
    """Get configured Google OAuth client."""
    return oauth.google
