"""Authentication API endpoints for Google OAuth.






































































































































































































































































































































- [ ] Document JWT secret in secure password manager- [ ] Monitor cookie behavior in browser DevTools- [ ] Test cross-subdomain authentication- [ ] Update CORS origins for all subdomains- [ ] Add all subdomains to Google OAuth allowed origins- [ ] Set `COOKIE_SECURE=true` (HTTPS only)- [ ] Set `COOKIE_DOMAIN=.preprabbit.in`- [ ] Use **same** JWT secret across all services- [ ] Generate strong `JWT_SECRET_KEY` (32+ chars)## Production Checklist---4. **No Data Loss**: Progress is preserved by user_id3. **Cookie Migration**: Users re-login once, then seamless everywhere2. **Token Migration**: Existing tokens expire naturally (7 days)1. **Database Migration**: Users table remains sameIf you already have users on `spark.preprabbit.in`:## Migration Notes---- Navigate to any subdomain while staying logged in- Shows progress across all topics- `preprabbit.in` → Central hub### Single Sign-On (SSO) Dashboard- Cross-platform learning paths- "Completed 10 tutorials across PrepRabbit"- Earn badges across all platforms### Unified Achievements```}  }    "azure": {...}    "python": {...},    "spark": {...},  "progress": {  "user": {...},{GET /api/auth/me# Fetch user progress from ALL platforms```python### Cross-Platform Progress## Future Enhancements---- Frontend uses `credentials: 'include'` in fetch- `allow_credentials=True` in FastAPI CORS middleware- All subdomains listed in `CORS_ORIGINS`**Check**:### CORS Errors- Cookie is being sent with request (`credentials: 'include'`)- Token hasn't expired (check `SESSION_EXPIRE_MINUTES`)- All backends use **identical** `JWT_SECRET_KEY`**Check**:### JWT Verification Fails- Browser allows third-party cookies- `COOKIE_SECURE=true` in production- All subdomains use HTTPS in production- `COOKIE_DOMAIN=.preprabbit.in` (note the leading dot)**Check**:### Cookie Not Shared Across Subdomains## Troubleshooting---   ```   4. Check browser cookies (.preprabbit.in domain)   3. Verify auto-login works   2. Open python.preprabbit.in in same browser   1. Login on spark.preprabbit.in   ```4. Test:3. Deploy Python frontend to `python.preprabbit.in`2. Deploy Spark frontend to `spark.preprabbit.in`1. Deploy auth backend to `api.spark.preprabbit.in`### Production Testing```COOKIE_DOMAIN=.local```bashUpdate cookie domain:```127.0.0.1 api.local127.0.0.1 python.local127.0.0.1 spark.local```Edit `/etc/hosts`:### Local Testing (localhost subdomains)## Testing Multi-Subdomain Auth---```);    ...    completed_lessons JSON,    user_id VARCHAR PRIMARY KEY,CREATE TABLE python_progress (-- python.preprabbit.in database);    ...    completed_tutorials JSON,    user_id VARCHAR PRIMARY KEY,CREATE TABLE spark_progress (-- spark.preprabbit.in database```sql### Per-Subdomain Progress```);    created_at TIMESTAMP    provider VARCHAR NOT NULL,     -- "google"    picture VARCHAR,    name VARCHAR NOT NULL,    email VARCHAR UNIQUE NOT NULL,    id VARCHAR PRIMARY KEY,        -- google_123456789CREATE TABLE users (-- User table (shared identity)```sql### Centralized User Service## Database Schema (Recommended)---- Maintain separate databases per topic- Implement cross-platform achievements- Share user profile (name, email, picture)- Track its own progress (e.g., Spark tutorials vs Python tutorials)Each subdomain can:### Progress Tracking**One login, all platforms**5. Visit **databricks.preprabbit.in** → Already logged in ✅4. Visit **azure.preprabbit.in** → Already logged in ✅3. Visit **python.preprabbit.in** → Already logged in ✅2. Complete OAuth flow once1. Visit **spark.preprabbit.in** → Click "Sign in with Google"### From User Perspective## User Experience---```token_data = verify_token(cookie_token)# All backends verify the same token```pythonEach backend service validates tokens using shared `JWT_SECRET_KEY`:### JWT Token Validation- Shares only user identity- Can have different feature sets- Manages its own data/progress- Has its own backend serviceWhile auth is shared, each subdomain:### Subdomain Isolation```COOKIE_SAMESITE=lax           # CSRF protectionCOOKIE_HTTPONLY=true           # Prevents JavaScript access (XSS protection)COOKIE_SECURE=true            # HTTPS only (prevents MITM)COOKIE_DOMAIN=.preprabbit.in  # Shared across subdomains```bash### Cookie Protection## Security Considerations---3. Should be automatically logged in (cookie shared)2. Navigate to `python.preprabbit.in`1. Login on `spark.preprabbit.in`### 4. Test Cross-Subdomain AuthUpdate `CORS_ORIGINS` and `ALLOWED_REDIRECT_DOMAINS` to include new subdomain.### 3. Update All Existing Services```https://python.preprabbit.in```Add to **Authorized JavaScript Origins**:### 2. Update Google OAuth```ALLOWED_REDIRECT_DOMAINS=...existing...,python.preprabbit.in# Add to allowed redirectsCORS_ORIGINS=...existing...,https://python.preprabbit.in# Add to CORS originsJWT_SECRET_KEY=<same-as-spark-backend># Ensure backend uses SAME JWT_SECRET_KEY```bash### 1. Deploy New Service (e.g., python.preprabbit.in)## Adding a New Subdomain---```NEXT_PUBLIC_API_URL=https://api.spark.preprabbit.in# Each subdomain points to the shared auth service```bash### Frontend (Next.js for each subdomain)```ALLOWED_REDIRECT_DOMAINS=spark.preprabbit.in,python.preprabbit.in,azure.preprabbit.in,databricks.preprabbit.in,preprabbit.inFRONTEND_URL=https://spark.preprabbit.in# Redirect validationCORS_ORIGINS=https://spark.preprabbit.in,https://python.preprabbit.in,https://azure.preprabbit.in,https://databricks.preprabbit.in,https://preprabbit.in# CORS (all PrepRabbit subdomains)COOKIE_SAMESITE=laxCOOKIE_SECURE=trueCOOKIE_DOMAIN=.preprabbit.in# Cookie configuration (shared across subdomains)SESSION_EXPIRE_MINUTES=10080JWT_SECRET_KEY=your-shared-secret-key# JWT (MUST BE IDENTICAL across all services)GOOGLE_CLIENT_SECRET=your-secretGOOGLE_CLIENT_ID=your-id.apps.googleusercontent.com# Google OAuth (same for all services)```bash### Backend (.env for all services)```python -c "import secrets; print(secrets.token_urlsafe(32))"# Generate once, use everywhere:```bash**All backend services MUST use the same `JWT_SECRET_KEY`**### Shared JWT Secret (CRITICAL)## Environment Configuration---```http://localhost:3000https://preprabbit.inhttps://databricks.preprabbit.inhttps://azure.preprabbit.inhttps://python.preprabbit.inhttps://spark.preprabbit.in```### Authorized JavaScript Origins```http://localhost:8000/api/auth/callbackhttps://api.spark.preprabbit.in/api/auth/callback```Add these to your Google OAuth Client:### Authorized Redirect URIs## Google OAuth Configuration---5. User seamlessly authenticated everywhere4. Cookie automatically available on **all** `*.preprabbit.in` subdomains3. Backend sets HttpOnly cookie with `domain=.preprabbit.in`2. Redirected to Google OAuth (via `api.spark.preprabbit.in`)1. User logs in on **any** PrepRabbit subdomain### How It Works- **JWT Secret**: Same across all backend services- **Cookie Domain**: `.preprabbit.in` (shared across all subdomains)- **Domain**: `api.spark.preprabbit.in` (serves as auth provider for all subdomains)### Centralized Auth Service## Architecture---**One login = Access to all PrepRabbit learning platforms**- (future subdomains)- databricks.preprabbit.in- azure.preprabbit.in- python.preprabbit.in  - spark.preprabbit.inPrepRabbit uses **centralized authentication** that works across all subdomains:## OverviewEndpoints:
- GET /auth/login - Initiate Google OAuth flow
- GET /auth/callback - Handle OAuth callback
- POST /auth/verify - Verify JWT token
- POST /auth/logout - Logout user (client-side token removal)
- GET /auth/me - Get current user info
"""

from fastapi import APIRouter, Request, HTTPException, Depends, Cookie
from fastapi.responses import RedirectResponse, JSONResponse
from typing import Optional

from app.core.auth import (
    get_google_oauth_client,
    create_access_token,
    verify_token,
)
from app.services.user_storage import UserStorageService
from app.models.user import User


router = APIRouter(prefix="/api/auth", tags=["authentication"])

# Frontend URLs for redirects (supports multiple PrepRabbit subdomains)
import os
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")
ALLOWED_REDIRECT_DOMAINS = os.getenv("ALLOWED_REDIRECT_DOMAINS", "localhost:3000").split(",")
COOKIE_DOMAIN = os.getenv("COOKIE_DOMAIN", None)  # e.g., ".preprabbit.in"
COOKIE_SECURE = os.getenv("COOKIE_SECURE", "false").lower() == "true"
COOKIE_SAMESITE = os.getenv("COOKIE_SAMESITE", "lax")
# Public base URL for OAuth callbacks (Docker internal hostnames aren't reachable by Google)
BACKEND_PUBLIC_URL = os.getenv("BACKEND_PUBLIC_URL", "http://localhost:8000")


@router.get("/login")
async def login(request: Request):
    """Initiate Google OAuth login flow.
    
    Redirects user to Google's OAuth consent screen.
    """
    google = get_google_oauth_client()
    # Use public URL instead of request.url_for() which may resolve to Docker internal hostname
    redirect_uri = f"{BACKEND_PUBLIC_URL}/api/auth/callback"
    
    return await google.authorize_redirect(request, redirect_uri)


@router.get("/callback")
async def auth_callback(request: Request):
    """Handle OAuth callback from Google.
    
    1. Exchange authorization code for access token
    2. Fetch user info from Google
    3. Create or update user in database
    4. Generate JWT token
    5. Redirect to frontend with token
    """
    try:
        google = get_google_oauth_client()
        token = await google.authorize_access_token(request)
        
        # Get user info from Google
        user_info = token.get('userinfo')
        if not user_info:
            raise HTTPException(status_code=400, detail="Failed to get user info from Google")
        
        # Extract user data
        email = user_info.get('email')
        name = user_info.get('name')
        picture = user_info.get('picture')
        google_id = user_info.get('sub')
        
        if not email or not name or not google_id:
            raise HTTPException(status_code=400, detail="Incomplete user information from Google")
        
        # Create user ID with provider prefix
        user_id = f"google_{google_id}"
        
        # Store/update user in database
        storage = UserStorageService()
        existing_user = storage.get_user(user_id)
        
        if not existing_user:
            # Create new user
            user = User(
                id=user_id,
                email=email,
                name=name,
                picture=picture,
                provider="google"
            )
            storage.create_user(user)
        else:
            # User exists, potentially update profile info
            # (in case name/picture changed on Google side)
            pass
        
        storage.close()
        
        # Create JWT token
        token_data = {
            "email": email,
            "name": name,
            "picture": picture,
            "user_id": user_id
        }
        access_token = create_access_token(token_data)
        
        # Determine redirect URL (support multiple subdomains)
        # Check if there's a state parameter with redirect URL
        redirect_domain = request.query_params.get("state", FRONTEND_URL)
        
        # Validate redirect domain for security
        is_valid_redirect = False
        for allowed_domain in ALLOWED_REDIRECT_DOMAINS:
            if allowed_domain in redirect_domain or redirect_domain == FRONTEND_URL:
                is_valid_redirect = True
                break
        
        if not is_valid_redirect:
            redirect_domain = FRONTEND_URL
        
        # Create response with redirect
        redirect_url = f"{redirect_domain}/auth/callback?token={access_token}"
        response = RedirectResponse(url=redirect_url)
        
        # Set cookie for cross-subdomain auth
        response.set_cookie(
            key="auth_token",
            value=access_token,
            domain=COOKIE_DOMAIN,  # e.g., ".preprabbit.in" for all subdomains
            secure=COOKIE_SECURE,  # True in production (HTTPS only)
            httponly=True,  # Prevent JavaScript access
            samesite=COOKIE_SAMESITE,  # "lax" or "strict"
            max_age=60 * 60 * 24 * 7,  # 7 days
        )
        
        return response
        
    except Exception as e:
        # Log error and redirect to frontend with error
        print(f"OAuth callback error: {e}")
        return RedirectResponse(url=f"{FRONTEND_URL}?auth_error=oauth_failed")


@router.post("/verify")
async def verify(auth_token: Optional[str] = Cookie(None)):
    """Verify JWT token and return user info.
    
    Args:
        auth_token: JWT token from Cookie (shared across subdomains)
    
    Returns:
        User info if token is valid
    
    Raises:
        401 if token is invalid or expired
    """
    if not auth_token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    token_data = verify_token(auth_token)
    
    if not token_data:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    
    return {
        "email": token_data.email,
        "name": token_data.name,
        "picture": token_data.picture,
        "exp": token_data.exp
    }


@router.post("/logout")
async def logout():
    """Logout endpoint (client handles token removal)."""
    return {"message": "Logged out successfully"}


@router.get("/me")
async def get_current_user(auth_token: Optional[str] = Cookie(None)):
    """Get current authenticated user info.
    
    Args:
        auth_token: JWT token from Cookie (shared across subdomains)
    
    Returns:
        User info with progress
    
    Raises:
        401 if not authenticated
    """
    if not auth_token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    token_data = verify_token(auth_token)
    
    if not token_data:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    
    # Get user from database
    storage = UserStorageService()
    user = storage.get_user_by_email(token_data.email)
    storage.close()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Get user progress
    from app.models.user_progress import get_user_progress
    progress = get_user_progress(user.id)
    
    return {
        "user": user.model_dump(),
        "progress": progress.model_dump()
    }
