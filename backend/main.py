"""
SmartGrade AI - FastAPI Backend
Production-Ready API with JWT Authentication
"""
import sys
import os
from dotenv import load_dotenv

# Add parent directory to Python path
parent_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, parent_dir)

# Load environment variables
load_dotenv(os.path.join(parent_dir, 'backend', '.env'), override=True)

from fastapi import FastAPI, Depends, HTTPException, status, UploadFile, File, Form
from fastapi.staticfiles import StaticFiles
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from typing import Optional, List
from datetime import datetime, timedelta
import bcrypt
# Passlib 1.7.4 + bcrypt 4.0+ / Python 3.12 workaround
if not hasattr(bcrypt, "__about__"):
    class About:
        __version__ = getattr(bcrypt, "__version__", "4.0.0")
    bcrypt.__about__ = About()

from passlib.context import CryptContext
import jwt
import re
from pydantic import BaseModel, EmailStr

# Import existing modules
from database.db import get_session, init_db
from database.models import User, Student, Evaluation, QuestionBank, Institution
from evaluator import AnswerEvaluator
from utils import extract_text_from_pdf, extract_text_from_image, extract_text_from_file
from rubric_generator import generate_rubric
from batch_processor import process_batch_async, extract_exams_from_zip
from worker import celery_app
from celery.result import AsyncResult

try:
    from backend.rag_engine import store_knowledge_base, retrieve_relevant_context
except ImportError:
    from rag_engine import store_knowledge_base, retrieve_relevant_context

# =============================================================================
# CONFIGURATION
# =============================================================================

SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-change-in-production-use-env-variable")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", 60 * 24 * 7))  # 7 days

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")

# =============================================================================
# PYDANTIC MODELS (Request/Response Schemas)
# =============================================================================

class UserSignup(BaseModel):
    username: str
    email: EmailStr
    password: str
    full_name: Optional[str] = None
    school_name: Optional[str] = None
    school_type: Optional[str] = None # 'School' or 'College'
    otp_code: str
    invite_code: Optional[str] = None # For joining institutions
    subdomain: Optional[str] = None # For making administrator

class UserLogin(BaseModel):
    username: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str
    user: dict

class SendOTPRequest(BaseModel):
    mobile_number: str

class SendSignupOTPRequest(BaseModel):
    email: EmailStr

class ProfileUpdate(BaseModel):
    full_name: Optional[str] = None
    email: Optional[str] = None
    mobile_number: Optional[str] = None
    current_password: Optional[str] = None
    new_password: Optional[str] = None
    otp_code: Optional[str] = None
    school_name: Optional[str] = None
    school_type: Optional[str] = None
    subject: Optional[str] = None

class UserResponse(BaseModel):
    id: int
    username: str
    email: str
    full_name: Optional[str] = None
    mobile_number: Optional[str] = None
    role: str
    school_name: Optional[str] = None
    school_type: Optional[str] = None
    subject: Optional[str] = None
    avatar_url: Optional[str] = None
    default_provider: Optional[str] = None
    default_model: Optional[str] = None
    default_strictness: Optional[str] = None
    grade_a_threshold: Optional[int] = None
    grade_b_threshold: Optional[int] = None
    grade_c_threshold: Optional[int] = None
    grade_d_threshold: Optional[int] = None
    institution_id: Optional[int] = None
    groq_api_key: Optional[str] = None
    mistral_api_key: Optional[str] = None
    gemini_api_key: Optional[str] = None
    openai_api_key: Optional[str] = None
    anthropic_api_key: Optional[str] = None

    class Config:
        from_attributes = True

class InstitutionCreate(BaseModel):
    name: str
    subdomain: str
    type: str # "School" or "College"
    logo_url: Optional[str] = None
    theme_color: Optional[str] = None

class InstitutionResponse(BaseModel):
    id: int
    name: str
    subdomain: str
    type: str
    is_active: bool
    has_admin: bool

    class Config:
        from_attributes = True

class StudentCreate(BaseModel):
    roll_number: str
    full_name: str
    email: Optional[str] = None
    class_section: Optional[str] = None

class StudentEdit(BaseModel):
    full_name: Optional[str] = None
    email: Optional[str] = None
    class_section: Optional[str] = None
    roll_number: Optional[str] = None

class StudentResponse(BaseModel):
    id: int
    roll_number: str
    full_name: str
    email: Optional[str]
    class_section: Optional[str]
    
    class Config:
        from_attributes = True

class APIKeysUpdate(BaseModel):
    groq_key: Optional[str] = None
    mistral_key: Optional[str] = None
    gemini_key: Optional[str] = None
    openai_key: Optional[str] = None
    anthropic_key: Optional[str] = None

class PreferencesUpdate(BaseModel):
    default_provider: Optional[str] = None
    default_model: Optional[str] = None
    default_strictness: Optional[str] = None
    grade_a: Optional[int] = None
    grade_b: Optional[int] = None
    grade_c: Optional[int] = None
    grade_d: Optional[int] = None

class EvaluationRequest(BaseModel):
    question_text: Optional[str] = None
    answer_text: Optional[str] = None
    student_name: Optional[str] = None
    provider: str = "Groq"
    model: str = "llama-3.3-70b-versatile"
    strictness: str = "Moderate"
    partial_credit: bool = True
    api_key: str
    grade_thresholds: Optional[dict] = {
        'A': 85, 'B': 70, 'C': 55, 'D': 40
    }

class EvaluationResponse(BaseModel):
    id: int
    student_name: Optional[str]
    total_earned: float
    total_max: float
    percentage: float
    grade: str
    grade_name: str
    ai_confidence: float
    overall_feedback: Optional[str]
    questions_results: list
    created_at: datetime
    
    class Config:
        from_attributes = True

class EvaluationUpdateRequest(BaseModel):
    total_earned: Optional[float] = None
    total_max: Optional[float] = None
    percentage: Optional[float] = None
    grade: Optional[str] = None
    grade_name: Optional[str] = None
    overall_feedback: Optional[str] = None
    questions_results: Optional[list] = None

class AnalyticsResponse(BaseModel):
    total_evaluations: int
    total_students: int
    average_score: float
    grade_distribution: dict
    recent_evaluations: List[dict]
    performance_trends: List[dict]

# =============================================================================
# FASTAPI APP INITIALIZATION
# =============================================================================

app = FastAPI(
    title="SmartGrade AI API",
    description="AI-Powered Answer Sheet Evaluation System",
    version="2.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc"
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static files uploads directory
os.makedirs("uploads", exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# Initialize database on startup
@app.on_event("startup")
async def startup_event():
    init_db()
    print("Database initialized")
    print("SmartGrade AI API is running")
    print("API Docs: http://localhost:8000/api/docs")

# =============================================================================
# AUTHENTICATION UTILITIES
# =============================================================================

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash"""
    try:
        return pwd_context.verify(plain_password, hashed_password)
    except Exception as e:
        print(f"Password verification error: {e}")
        return False

def get_password_hash(password: str) -> str:
    """Hash a password"""
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    """Create a JWT access token"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_session)
) -> User:
    """Get current authenticated user from JWT token"""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: int = payload.get("user_id")
        if user_id is None:
            raise credentials_exception
    except jwt.PyJWTError:
        raise credentials_exception
    
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise credentials_exception
    if not user.is_active or (user.role == 'faculty' and user.institution_id is None):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your faculty account has been removed or deactivated by your institution administrator."
        )
    return user

# =============================================================================
# AUTHENTICATION ENDPOINTS
# =============================================================================

@app.post("/auth/signup/send-otp")
async def send_signup_otp(request: SendSignupOTPRequest):
    """Generate and send email OTP for signup verification"""
    import random
    import smtplib
    from email.message import EmailMessage
    import asyncio
    
    try:
        email = request.email.strip()
        if not email:
            raise HTTPException(status_code=400, detail="Email is required")
            
        # Generate dynamic 6-digit code
        code = str(random.randint(100000, 999999))
        otp_store[email] = code  # Store by email in the existing in-memory store
        
        SMTP_HOST = os.getenv("SMTP_HOST")
        SMTP_PORT = os.getenv("SMTP_PORT", "587")
        SMTP_USER = os.getenv("SMTP_USER")
        SMTP_PASSWORD = os.getenv("SMTP_PASSWORD")
        
        if SMTP_HOST and SMTP_USER and SMTP_PASSWORD:
            try:
                msg = EmailMessage()
                msg.set_content(f"Hello,\n\nYour SmartGrade Signup verification code is: {code}\n\nThis code is required to complete your registration.\n\nThank you!")
                msg['Subject'] = 'SmartGrade - Signup Verification Code'
                msg['From'] = SMTP_USER
                msg['To'] = email
                
                import ssl
                context = ssl.create_default_context()
                
                def dispatch_email():
                    with smtplib.SMTP(SMTP_HOST, int(SMTP_PORT)) as server:
                        server.starttls(context=context)
                        server.login(SMTP_USER, SMTP_PASSWORD)
                        server.send_message(msg)
                
                await asyncio.to_thread(dispatch_email)
                return {"message": f"Verification code sent to your email ({email})", "code_dev": code}
            except Exception as e:
                print(f"SMTP Signup Dispatch Fail: {e}")
                
        return {"message": "OTP sent successfully (Simulated)", "code_dev": code}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/auth/signup", response_model=Token, status_code=status.HTTP_201_CREATED)
async def signup(user_data: UserSignup, db: Session = Depends(get_session)):
    """
    Register a new user account
    
    - **username**: Unique username (3-30 characters)
    - **email**: Valid email address
    - **password**: Strong password (6+ characters minimum)
    - **otp_code**: Verification Code sent to email
    - **school_name**: Custom School/College triggers
    """
    # Verify OTP
    stored_code = otp_store.get(user_data.email)
    if not stored_code or stored_code != user_data.otp_code:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired verification code"
        )
    # Check if username exists
    if db.query(User).filter(User.username == user_data.username).first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already registered"
        )
    
    # Check if email exists
    if db.query(User).filter(User.email == user_data.email).first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Validate password strength (reduced from 8 to 6 for easier testing)
    if len(user_data.password) < 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must be at least 6 characters"
        )
    
    # Create new user with hashed password
    hashed_password = get_password_hash(user_data.password)
    
    # 1. Expand Multi-Tenancy Invite Mapping
    assigned_institution_id = None
    assigned_role = "teacher"
    
    from database.models import Institution # For safety loaded inline
    
    if user_data.invite_code:
        assigned_institution_id = invite_store.get(user_data.invite_code)
        if not assigned_institution_id:
            raise HTTPException(status_code=400, detail="Invalid or expired invite code")
        assigned_role = "faculty"
        print(f"User joining institution_id: {assigned_institution_id} as faculty")
    elif user_data.subdomain:
        inst = db.query(Institution).filter(Institution.subdomain == user_data.subdomain.strip().lower()).first()
        if not inst:
            raise HTTPException(status_code=404, detail="Institution not found")
            
        # Check if any admin exists
        admin_count = db.query(User).filter(User.institution_id == inst.id, User.role == "institution_admin").count()
        if admin_count == 0:
            assigned_institution_id = inst.id
            assigned_role = "institution_admin"
            print(f"User becoming Admin for institution: {inst.name}")
        else:
            raise HTTPException(status_code=400, detail="Institution already has an administrator account")
        
    new_user = User(
        username=user_data.username,
        email=user_data.email,
        full_name=user_data.full_name or user_data.username,
        school_name=user_data.school_name,
        school_type=user_data.school_type,
        role=assigned_role,
        institution_id=assigned_institution_id,
        password_hash=hashed_password  # Set directly during initialization
    )
    
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    print(f"New user created: {new_user.email}")
    
    # Create access token
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"user_id": new_user.id},
        expires_delta=access_token_expires
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": new_user.id,
            "username": new_user.username,
            "email": new_user.email,
            "full_name": new_user.full_name,
            "school_name": new_user.school_name,
            "school_type": new_user.school_type,
            "role": new_user.role,
            "institution_id": new_user.institution_id
        }
    }

@app.post("/auth/login", response_model=Token)
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_session)
):
    """
    Login with email/username and password
    
    ⚠️ IMPORTANT: The 'username' field accepts BOTH email and username
    Returns JWT access token for authenticated requests
    """
    # Try to find user by EMAIL first (frontend sends email as username)
    user = db.query(User).filter(User.email == form_data.username).first()
    
    # If not found by email, try by username
    if not user:
        user = db.query(User).filter(User.username == form_data.username).first()
    
    # If still not found or password is wrong
    if not user:
        print(f"Login failed: User not found with email/username: {form_data.username}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Verify password
    if not verify_password(form_data.password, user.password_hash):
        print(f"Login failed: Incorrect password for user: {user.email}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Check if account is active
    if not user.is_active or (user.role == 'faculty' and user.institution_id is None):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your faculty account has been removed or deactivated by your institution administrator. Access denied."
        )
    
    print(f"Login successful: {user.email}")
    
    # Update last login
    user.last_login = datetime.utcnow()
    db.commit()
    
    # Create access token
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"user_id": user.id},
        expires_delta=access_token_expires
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "full_name": user.full_name,
            "school_name": user.school_name,
            "school_type": user.school_type,
            "role": user.role,
            "institution_id": user.institution_id,
            "groq_api_key": user.get_groq_api_key or "",
            "mistral_api_key": user.get_mistral_api_key or "",
            "gemini_api_key": user.get_gemini_api_key or "",
            "default_provider": user.default_provider,
            "default_model": user.default_model,
            "grade_thresholds": {
                'A': user.grade_a_threshold,
                'B': user.grade_b_threshold,
                'C': user.grade_c_threshold,
                'D': user.grade_d_threshold
            }
        }
    }

@app.get("/auth/me")
async def get_me(current_user: User = Depends(get_current_user)):
    """Get current authenticated user information with global institution API key resolution"""
    inst = current_user.institution
    return {
        "id": current_user.id,
        "username": current_user.username,
        "email": current_user.email,
        "full_name": current_user.full_name,
        "mobile_number": current_user.mobile_number,
        "role": current_user.role,
        "school_name": current_user.school_name,
        "school_type": current_user.school_type,
        "subject": current_user.subject,
        "avatar_url": current_user.avatar_url,
        "default_provider": current_user.default_provider,
        "default_model": current_user.default_model,
        "default_strictness": current_user.default_strictness,
        "grade_a_threshold": current_user.grade_a_threshold,
        "grade_b_threshold": current_user.grade_b_threshold,
        "grade_c_threshold": current_user.grade_c_threshold,
        "grade_d_threshold": current_user.grade_d_threshold,
        "institution_id": current_user.institution_id,
        "groq_api_key": current_user.get_groq_api_key or (inst.get_groq_api_key if inst else "") or "",
        "mistral_api_key": current_user.get_mistral_api_key or (inst.get_mistral_api_key if inst else "") or "",
        "gemini_api_key": current_user.get_gemini_api_key or (inst.get_gemini_api_key if inst else "") or "",
        "openai_api_key": current_user.get_openai_api_key or (inst.get_openai_api_key if inst else "") or "",
        "anthropic_api_key": current_user.get_anthropic_api_key or (inst.get_anthropic_api_key if inst else "") or ""
    }

@app.put("/settings/api-keys")
async def update_user_api_keys(
    data: APIKeysUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_session)
):
    """Update user-specific API keys with encryption"""
    current_user.set_keys(
        groq=data.groq_key,
        mistral=data.mistral_key,
        gemini=data.gemini_key,
        openai=data.openai_key,
        anthropic=data.anthropic_key
    )
    db.commit()
    return {"message": "API keys updated successfully"}

@app.put("/settings/preferences")
async def update_user_preferences(
    data: PreferencesUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_session)
):
    """Update user grading thresholds & default provider preferences"""
    if data.default_provider is not None:
        current_user.default_provider = data.default_provider
    if data.default_model is not None:
        current_user.default_model = data.default_model
    if data.default_strictness is not None:
        current_user.default_strictness = data.default_strictness
    if data.grade_a is not None:
        current_user.grade_a_threshold = data.grade_a
    if data.grade_b is not None:
        current_user.grade_b_threshold = data.grade_b
    if data.grade_c is not None:
        current_user.grade_c_threshold = data.grade_c
    if data.grade_d is not None:
        current_user.grade_d_threshold = data.grade_d
    db.commit()
    return {"message": "Preferences updated successfully"}

@app.post("/auth/logout")
async def logout(current_user: User = Depends(get_current_user)):
    """Logout (client should discard the token)"""
    return {"message": "Successfully logged out"}

# In-memory OTP store for mock verification (mobile_number -> code)
otp_store = {}

@app.post("/auth/send-otp")
async def send_otp(request: SendOTPRequest, current_user: User = Depends(get_current_user)):
    """Generate and send mock or real email OTP for verification"""
    import random
    import smtplib
    from email.message import EmailMessage
    import traceback
    import asyncio
    
    try:
        mobile = request.mobile_number.strip()
        if not mobile:
            raise HTTPException(status_code=400, detail="Mobile number is required")
            
        # Generate dynamic 6-digit code
        code = str(random.randint(100000, 999999))
        otp_store[mobile] = code
        
        # SMTP Fallback Email Dispatch Logic
        SMTP_HOST = os.getenv("SMTP_HOST")
        SMTP_PORT = os.getenv("SMTP_PORT", "587")
        SMTP_USER = os.getenv("SMTP_USER")
        SMTP_PASSWORD = os.getenv("SMTP_PASSWORD")
        
        if SMTP_HOST and SMTP_USER and SMTP_PASSWORD:
            try:
                msg = EmailMessage()
                msg.set_content(f"Hello {current_user.full_name or current_user.username},\n\nYour SmartGrade verification code is: {code}\n\nThis code is required to authorize updates (such as adding a mobile number) on your account.\n\nThank you!")
                msg['Subject'] = 'SmartGrade - Account Verification Code'
                msg['From'] = SMTP_USER
                msg['To'] = current_user.email
                
                import ssl
                context = ssl.create_default_context()
                
                def dispatch_email():
                    with smtplib.SMTP(SMTP_HOST, int(SMTP_PORT)) as server:
                        server.starttls(context=context)
                        server.login(SMTP_USER, SMTP_PASSWORD)
                        server.send_message(msg)

                await asyncio.to_thread(dispatch_email)
                return {"message": f"Verification code sent to your email ({current_user.email})", "code_dev": code}
            except Exception as e:
                print(f"SMTP Dispatch Fail: {e}")
                
        return {"message": "OTP sent successfully (Simulated)", "code_dev": code}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) # Code returned for easy dev testing

@app.post("/auth/update-profile")
async def update_profile(
    profile: ProfileUpdate, 
    db: Session = Depends(get_session), 
    current_user: User = Depends(get_current_user)
):
    """Update user profile details and password"""
    # 1. Update Full Name
    if profile.full_name is not None:
        current_user.full_name = profile.full_name
        
    # 2. Safe Email Update (uniqueness)
    if profile.email is not None and profile.email != current_user.email:
        existing = db.query(User).filter(User.email == profile.email).first()
        if existing:
            raise HTTPException(status_code=400, detail="Email is already taken")
        current_user.email = profile.email
        
    # 3. Mobile Number with OTP Verification
    if profile.mobile_number is not None and profile.mobile_number != current_user.mobile_number:
        if not profile.otp_code:
            raise HTTPException(status_code=400, detail="OTP verification is required item to update mobile number")
        cached_otp = otp_store.get(profile.mobile_number.strip())
        if cached_otp != profile.otp_code:
            raise HTTPException(status_code=400, detail="Invalid or expired OTP code")
        current_user.mobile_number = profile.mobile_number.strip()
        # Consume OTP
        otp_store.pop(profile.mobile_number.strip(), None)
        
    # 4. Password Updating
    if profile.new_password:
        current_user.set_password(profile.new_password)
        
    # 5. School Name and Subject Updates
    if profile.school_name is not None:
        current_user.school_name = profile.school_name
    if profile.school_type is not None:
        current_user.school_type = profile.school_type
    if profile.subject is not None:
        current_user.subject = profile.subject
        
    db.commit()
    db.refresh(current_user)
    return {"message": "Profile updated successfully"}

class ResetPasswordOTPRequest(BaseModel):
    email: str

class ResetPasswordConfirmRequest(BaseModel):
    email: str
    otp_code: str
    new_password: str

@app.post("/auth/password-reset/send-otp")
async def send_reset_password_otp(request: ResetPasswordOTPRequest, db: Session = Depends(get_session)):
    """Generate and send email OTP to reset password"""
    import random
    import smtplib
    from email.message import EmailMessage
    import asyncio
    
    email = request.email.strip()
    if not email:
        raise HTTPException(status_code=400, detail="Email address is required")
        
    user = db.query(User).filter(User.email == email).first()
    if not user:
        user = db.query(User).filter(User.username == email).first()
    if not user:
        raise HTTPException(status_code=404, detail="No account registered with this email or username")
        
    code = str(random.randint(100000, 999999))
    otp_store[user.email] = code
    
    # SMTP Email Dispatch
    SMTP_HOST = os.getenv("SMTP_HOST")
    SMTP_PORT = os.getenv("SMTP_PORT", "587")
    SMTP_USER = os.getenv("SMTP_USER")
    SMTP_PASSWORD = os.getenv("SMTP_PASSWORD")
    
    if SMTP_HOST and SMTP_USER and SMTP_PASSWORD:
        try:
            msg = EmailMessage()
            msg.set_content(f"Hello {user.full_name or user.username},\n\nYour SmartGrade Password Reset Verification Code is: {code}\n\nEnter this 6-digit code to update your account password.\n\nThank you!")
            msg['Subject'] = 'SmartGrade - Password Reset Code'
            msg['From'] = SMTP_USER
            msg['To'] = user.email
            
            import ssl
            context = ssl.create_default_context()
            
            def dispatch_email():
                with smtplib.SMTP(SMTP_HOST, int(SMTP_PORT)) as server:
                    server.starttls(context=context)
                    server.login(SMTP_USER, SMTP_PASSWORD)
                    server.send_message(msg)

            await asyncio.to_thread(dispatch_email)
            return {"message": f"Password reset OTP sent to your registered Gmail ({user.email})", "code_dev": code}
        except Exception as e:
            print(f"SMTP Reset Dispatch Fail: {e}")
            
    return {"message": f"Password reset OTP sent to {user.email}", "code_dev": code}

@app.post("/auth/password-reset/verify-otp")
async def verify_reset_password_otp(request: ResetPasswordConfirmRequest, db: Session = Depends(get_session)):
    """Verify OTP code before allowing new password entry"""
    email = request.email.strip()
    user = db.query(User).filter(User.email == email).first()
    if not user:
        user = db.query(User).filter(User.username == email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    cached_code = otp_store.get(user.email)
    if not cached_code or cached_code != request.otp_code.strip():
        raise HTTPException(status_code=400, detail="Invalid or expired OTP code")
        
    return {"message": "OTP verified successfully. Please enter your new password."}

@app.post("/auth/password-reset/confirm")
async def confirm_reset_password(request: ResetPasswordConfirmRequest, db: Session = Depends(get_session)):
    """Reset user password after OTP verification"""
    email = request.email.strip()
    user = db.query(User).filter(User.email == email).first()
    if not user:
        user = db.query(User).filter(User.username == email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    cached_code = otp_store.get(user.email)
    if not cached_code or cached_code != request.otp_code.strip():
        raise HTTPException(status_code=400, detail="Invalid or expired OTP code")
        
    if not request.new_password or len(request.new_password) < 8:
        raise HTTPException(status_code=400, detail="New password must be at least 8 characters long")
        
    import re
    if not re.search(r'[A-Z]', request.new_password):
        raise HTTPException(status_code=400, detail="Password must contain at least 1 uppercase letter")
    if not re.search(r'[a-z]', request.new_password):
        raise HTTPException(status_code=400, detail="Password must contain at least 1 lowercase letter")
    if not re.search(r'[0-9]', request.new_password):
        raise HTTPException(status_code=400, detail="Password must contain at least 1 number")
    if not re.search(r'[!@#$%^&*()_+\-=\[\]{};\':"\\|,.<>\/?]', request.new_password):
        raise HTTPException(status_code=400, detail="Password must contain at least 1 special character")
        
    user.set_password(request.new_password)
    db.commit()
    
    # Consume OTP
    otp_store.pop(user.email, None)
    return {"message": "Password updated successfully! Please log in with your new password."}

@app.post("/auth/update-avatar")
async def update_avatar(
    file: UploadFile = File(...),
    db: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """Upload and save profile avatar picture"""
    import shutil
    from pathlib import Path
    
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Uploaded file must be an image")
        
    static_dir = Path("uploads/avatars")
    static_dir.mkdir(parents=True, exist_ok=True)
    
    ext = file.filename.split(".")[-1]
    filename = f"user_{current_user.id}.{ext}"
    file_path = static_dir / filename
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    avatar_url = f"/uploads/avatars/{filename}"
    current_user.avatar_url = avatar_url
    db.commit()
    
    return {"message": "Avatar updated successfully", "avatar_url": avatar_url}

# =============================================================================
# STUDENT MANAGEMENT ENDPOINTS
# =============================================================================

class StudentCreateSchema(BaseModel):
    roll_number: Optional[str] = None
    full_name: str
    email: Optional[str] = None
    class_section: Optional[str] = None

class StudentBulkSchema(BaseModel):
    students: List[StudentCreateSchema]

@app.get("/students")
async def get_students(current_user: User = Depends(get_current_user), db: Session = Depends(get_session)):
    """Retrieve all students for current teacher or whole institution if admin"""
    if current_user.role in ["institution_admin", "admin"] and current_user.institution_id:
        faculty_ids = [u.id for u in db.query(User).filter(User.institution_id == current_user.institution_id).all()]
        students_db = db.query(Student).filter(
            Student.teacher_id.in_(faculty_ids),
            Student.is_active == True
        ).order_by(Student.created_at.desc()).all()
    else:
        students_db = db.query(Student).filter(
            Student.teacher_id == current_user.id,
            Student.is_active == True
        ).order_by(Student.created_at.desc()).all()
    
    student_list = []
    for s in students_db:
        evals = s.evaluations or []
        avg_score = 0
        if evals:
            avg_score = round(sum(e.percentage or 0 for e in evals) / len(evals), 1)
        student_list.append({
            "id": s.id,
            "teacher_id": s.teacher_id,
            "roll_number": s.roll_number or "",
            "full_name": s.full_name,
            "email": s.email or "",
            "class_section": s.class_section or "Default",
            "created_at": s.created_at.isoformat() if s.created_at else datetime.utcnow().isoformat(),
            "is_active": s.is_active,
            "evaluation_count": len(evals),
            "average_score": avg_score
        })
    return {"students": student_list}

@app.post("/students")
async def create_student(data: StudentCreateSchema, current_user: User = Depends(get_current_user), db: Session = Depends(get_session)):
    """Create new individual student record"""
    if not data.full_name or not data.full_name.strip():
        raise HTTPException(status_code=400, detail="Full name is required")
        
    new_roll = (data.roll_number or "").strip() or f"STU{int(datetime.utcnow().timestamp()) % 10000:04d}"
    new_student = Student(
        teacher_id=current_user.id,
        full_name=data.full_name.strip(),
        roll_number=new_roll,
        email=(data.email or "").strip() or None,
        class_section=(data.class_section or "").strip() or "Default"
    )
    db.add(new_student)
    db.commit()
    db.refresh(new_student)
    return {
        "id": new_student.id,
        "teacher_id": new_student.teacher_id,
        "roll_number": new_student.roll_number,
        "full_name": new_student.full_name,
        "email": new_student.email or "",
        "class_section": new_student.class_section,
        "created_at": new_student.created_at.isoformat() if new_student.created_at else datetime.utcnow().isoformat(),
        "is_active": new_student.is_active,
        "evaluation_count": 0,
        "average_score": 0
    }

@app.post("/students/bulk")
async def bulk_create_students(payload: StudentBulkSchema, current_user: User = Depends(get_current_user), db: Session = Depends(get_session)):
    """Bulk import student records"""
    added_count = 0
    for item in payload.students:
        if not item.full_name or not item.full_name.strip():
            continue
        new_roll = (item.roll_number or "").strip() or f"STU{int(datetime.utcnow().timestamp()) % 10000:04d}"
        st = Student(
            teacher_id=current_user.id,
            full_name=item.full_name.strip(),
            roll_number=new_roll,
            email=(item.email or "").strip() or None,
            class_section=(item.class_section or "").strip() or "Default"
        )
        db.add(st)
        added_count += 1
    db.commit()
    return {"message": f"Successfully imported {added_count} students", "count": added_count}

@app.put("/students/{student_id}")
async def update_student(student_id: int, data: StudentCreateSchema, current_user: User = Depends(get_current_user), db: Session = Depends(get_session)):
    """Update student record details"""
    st = db.query(Student).filter(Student.id == student_id, Student.teacher_id == current_user.id).first()
    if not st:
        raise HTTPException(status_code=404, detail="Student not found")
    st.full_name = data.full_name.strip()
    if data.roll_number: st.roll_number = data.roll_number.strip()
    if data.email: st.email = data.email.strip()
    if data.class_section: st.class_section = data.class_section.strip()
    db.commit()
    db.refresh(st)
    evals = st.evaluations or []
    avg_score = round(sum(e.percentage or 0 for e in evals)/len(evals), 1) if evals else 0
    return {
        "id": st.id,
        "teacher_id": st.teacher_id,
        "roll_number": st.roll_number,
        "full_name": st.full_name,
        "email": st.email or "",
        "class_section": st.class_section,
        "created_at": st.created_at.isoformat() if st.created_at else datetime.utcnow().isoformat(),
        "is_active": st.is_active,
        "evaluation_count": len(evals),
        "average_score": avg_score
    }

@app.delete("/students/{student_id}")
async def delete_student(student_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_session)):
    """Archive/delete student record"""
    st = db.query(Student).filter(Student.id == student_id, Student.teacher_id == current_user.id).first()
    if not st:
        raise HTTPException(status_code=404, detail="Student not found")
    st.is_active = False
    db.commit()
    return {"status": "success", "message": "Student record archived"}

@app.post("/students/{student_id}/alert")
async def send_student_alert(student_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_session)):
    """Send student academic status update alert email"""
    st = db.query(Student).filter(Student.id == student_id, Student.teacher_id == current_user.id).first()
    if not st:
        raise HTTPException(status_code=404, detail="Student not found")
    return {"status": "success", "message": f"Alert dispatched to {st.full_name}"}

# =============================================================================
# INSTITUTION ENDPOINTS
# =============================================================================

# In-memory store for institution invites (invite_code -> institution_id)
invite_store = {}

@app.post("/api/institutions/create", response_model=InstitutionResponse)
async def create_institution(request: InstitutionCreate, db: Session = Depends(get_session)):
    """Register a new institution with subdomain slug setups"""
    from database.models import Institution
    existing = db.query(Institution).filter(Institution.subdomain == request.subdomain.strip().lower()).first()
    if existing:
        raise HTTPException(status_code=400, detail="Subdomain is already taken by another center")
        
    clean_name = re.sub(r'\b([A-Z])([A-Z])([a-z]+)\b', lambda m: m.group(1) + m.group(2).lower() + m.group(3), request.name.strip())

    new_inst = Institution(
        name=clean_name,
        subdomain=request.subdomain.strip().lower(),
        type=request.type,
        logo_url=request.logo_url,
        theme_color=request.theme_color
    )
    db.add(new_inst)
    db.commit()
    db.refresh(new_inst)
    return new_inst

@app.get("/api/institutions/details/{subdomain:path}", response_model=InstitutionResponse)
async def get_institution_details(subdomain: str, db: Session = Depends(get_session)):
    """Fetch details of an institution for white-labeled logins"""
    from database.models import Institution
    raw_sub = subdomain.strip().lower()
    clean_sub = raw_sub.replace("https://", "").replace("http://", "").strip("/")
    
    institution = db.query(Institution).filter(
        (Institution.subdomain == raw_sub) |
        (Institution.subdomain == clean_sub) |
        (Institution.subdomain == f"https://{clean_sub}") |
        (Institution.subdomain == f"http://{clean_sub}")
    ).first()
    
    if not institution:
        raise HTTPException(status_code=404, detail="Institution not found")
    return institution

@app.get("/api/institutions/search")
async def search_institutions(q: str = "", db: Session = Depends(get_session)):
    """Search institutions by name for picker continuous loaded."""
    from database.models import Institution
    if len(q) < 2:
        return []
    results = db.query(Institution).filter(Institution.name.ilike(f"%{q}%")).limit(10).all()
    return [{"id": i.id, "name": i.name, "subdomain": i.subdomain, "logo_url": i.logo_url, "has_admin": i.has_admin} for i in results]

@app.post("/api/institutions/{subdomain}/invite")
async def generate_invite(subdomain: str, db: Session = Depends(get_session)):
    """Generate invite links for faculty onboarding"""
    from database.models import Institution
    institution = db.query(Institution).filter(Institution.subdomain == subdomain.strip().lower()).first()
    if not institution:
        raise HTTPException(status_code=404, detail="Institution not found")
        
    import uuid
    code = str(uuid.uuid4())[:8]
    invite_store[code] = institution.id
    
    return {
        "invite_code": code, 
        "link": f"http://localhost:5173/signup?org={subdomain}&ref={code}"
    }

@app.post("/api/admin/invite")
async def generate_invite_secure(current_user: User = Depends(get_current_user), db: Session = Depends(get_session)):
    """Generate invite link for the administrator's own institution"""
    if current_user.role not in ["institution_admin", "admin"]:
        raise HTTPException(status_code=403, detail="Only institution administrators can generate invites")
        
    from database.models import Institution
    institution = db.query(Institution).filter(Institution.id == current_user.institution_id).first()
    if not institution:
        raise HTTPException(status_code=404, detail="Institution not found")
        
    import uuid
    code = str(uuid.uuid4())[:8].upper()
    invite_store[code] = institution.id
    
    return {
        "invite_code": code, 
        "link": f"http://localhost:5173/signup?org={institution.subdomain}&ref={code}"
    }

@app.get("/api/admin/faculty", response_model=List[UserResponse])
async def list_faculty(current_user: User = Depends(get_current_user), db: Session = Depends(get_session)):
    """List all faculty members for the logged-in administrator's institution"""
    if current_user.role not in ["institution_admin", "admin"]:
        raise HTTPException(status_code=403, detail="Only institution administrators can view faculty lists")
        
    results = db.query(User).filter(
        User.institution_id == current_user.institution_id,
        User.role == "faculty",
        User.is_active == True
    ).all()
    return results

@app.delete("/api/admin/faculty/{faculty_id}")
async def delete_faculty(faculty_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_session)):
    """Delete a faculty member from the institution and revoke access"""
    if current_user.role not in ["institution_admin", "admin"]:
        raise HTTPException(status_code=403, detail="Only institution administrators can delete faculty")
        
    f_user = db.query(User).filter(
        User.id == faculty_id, 
        User.institution_id == current_user.institution_id
    ).first()
    
    if not f_user:
        raise HTTPException(status_code=404, detail="Faculty member not found or not in your institution")
        
    # Mark user as inactive & revoke institution access immediately
    f_user.is_active = False
    f_user.institution_id = None
    
    try:
        db.delete(f_user)
        db.commit()
    except Exception:
        db.rollback()
        # Fallback to soft-delete if foreign keys prevent hard delete
        f_user.is_active = False
        f_user.institution_id = None
        db.commit()
        
    return {"message": "Faculty account removed and access revoked successfully"}

# Pydantic Model for Update
from pydantic import BaseModel, HttpUrl

class InstitutionSettingsUpdate(BaseModel):
    logo_url: Optional[str] = None
    theme_color: Optional[str] = None
    groq_api_key: Optional[str] = None
    mistral_api_key: Optional[str] = None
    gemini_api_key: Optional[str] = None
    openai_api_key: Optional[str] = None
    anthropic_api_key: Optional[str] = None

@app.put("/api/admin/institution")
async def update_institution_settings(
    data: InstitutionSettingsUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_session)
):
    """Update general institution settings & configuration (Admin view) and propagate API keys to faculty"""
    if current_user.role not in ["institution_admin", "admin"]:
        raise HTTPException(status_code=403, detail="Only institution administrators can modify settings")
        
    from database.models import Institution, User
    institution = None
    if current_user.institution_id:
        institution = db.query(Institution).filter(Institution.id == current_user.institution_id).first()
        
    if not institution:
        inst_name = current_user.school_name or "Siva Sivani Degree College"
        sub_slug = re.sub(r'[^a-zA-Z0-9]', '', inst_name.lower())[:20] or "sivasivani"
        institution = db.query(Institution).filter(Institution.subdomain == sub_slug).first()
        if not institution:
            institution = Institution(
                name=inst_name,
                subdomain=sub_slug,
                type=current_user.school_type or "College"
            )
            db.add(institution)
            db.commit()
            db.refresh(institution)
        current_user.institution_id = institution.id
        db.commit()
        
    if data.logo_url is not None:
        institution.logo_url = data.logo_url
    if data.theme_color is not None:
        institution.theme_color = data.theme_color
        
    # Encrypt keys before storing on institution
    if data.groq_api_key is not None:
        institution.groq_api_key = institution._encrypt_key(data.groq_api_key.strip())
    if data.mistral_api_key is not None:
        institution.mistral_api_key = institution._encrypt_key(data.mistral_api_key.strip())
    if data.gemini_api_key is not None:
        institution.gemini_api_key = institution._encrypt_key(data.gemini_api_key.strip())
    if data.openai_api_key is not None:
        institution.openai_api_key = institution._encrypt_key(data.openai_api_key.strip())
    if data.anthropic_api_key is not None:
        institution.anthropic_api_key = institution._encrypt_key(data.anthropic_api_key.strip())
        
    # Also save keys directly on current Admin user
    current_user.set_keys(
        groq=data.groq_api_key.strip() if data.groq_api_key is not None else None,
        mistral=data.mistral_api_key.strip() if data.mistral_api_key is not None else None,
        gemini=data.gemini_api_key.strip() if data.gemini_api_key is not None else None,
        openai=data.openai_api_key.strip() if data.openai_api_key is not None else None,
        anthropic=data.anthropic_api_key.strip() if data.anthropic_api_key is not None else None
    )

    # Propagate the updated API keys to ALL faculty members in this organization!
    faculties = db.query(User).filter(User.institution_id == institution.id).all()
    for faculty in faculties:
        faculty.set_keys(
            groq=data.groq_api_key.strip() if data.groq_api_key is not None else None,
            mistral=data.mistral_api_key.strip() if data.mistral_api_key is not None else None,
            gemini=data.gemini_api_key.strip() if data.gemini_api_key is not None else None,
            openai=data.openai_api_key.strip() if data.openai_api_key is not None else None,
            anthropic=data.anthropic_api_key.strip() if data.anthropic_api_key is not None else None
        )

    db.commit()
    return {"message": "Institution settings updated and API keys updated for all faculties in your organisation"}

@app.get("/api/admin/institution")
async def get_institution_settings(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_session)
):
    """Get general institution settings & configuration (Admin view)"""
    from database.models import Institution
    institution = None
    if current_user.institution_id:
        institution = db.query(Institution).filter(Institution.id == current_user.institution_id).first()
        
    if not institution:
        inst_name = current_user.school_name or "Siva Sivani Degree College"
        sub_slug = re.sub(r'[^a-zA-Z0-9]', '', inst_name.lower())[:20] or "sivasivani"
        institution = db.query(Institution).filter(Institution.subdomain == sub_slug).first()
        if not institution:
            institution = Institution(
                name=inst_name,
                subdomain=sub_slug,
                type=current_user.school_type or "College"
            )
            db.add(institution)
            db.commit()
            db.refresh(institution)
        current_user.institution_id = institution.id
        db.commit()
        
    res = {
        "id": institution.id,
        "name": institution.name,
        "subdomain": institution.subdomain,
        "type": institution.type,
        "logo_url": institution.logo_url or "",
        "theme_color": institution.theme_color or "#4f46e5"
    }
    
    # Only return keys to administrators
    if current_user.role in ["institution_admin", "admin"]:
        res["groq_api_key"] = institution._decrypt_key(institution.groq_api_key) if institution.groq_api_key else (current_user.get_groq_api_key or "")
        res["mistral_api_key"] = institution._decrypt_key(institution.mistral_api_key) if institution.mistral_api_key else (current_user.get_mistral_api_key or "")
        res["gemini_api_key"] = institution._decrypt_key(institution.gemini_api_key) if institution.gemini_api_key else (current_user.get_gemini_api_key or "")
        res["openai_api_key"] = institution._decrypt_key(institution.openai_api_key) if institution.openai_api_key else (current_user.get_openai_api_key or "")
        res["anthropic_api_key"] = institution._decrypt_key(institution.anthropic_api_key) if institution.anthropic_api_key else (current_user.get_anthropic_api_key or "")

    return res

def extract_header_metadata(text: str) -> dict:
    meta = {}
    if not text:
        return meta
    
    # Extract Name
    name_match = re.search(r'(?:Name|Student Name|Full Name|Student)\s*[:=\-]\s*([^\n\r,;]+)', text, re.IGNORECASE)
    if name_match:
        meta['student_name'] = name_match.group(1).strip()
        
    # Extract Roll No / ID
    roll_match = re.search(r'(?:Roll\s*(?:No|Num|Number)?|Reg\s*(?:No|Num|Number)?|ID|Registration)\s*[:=\-]\s*([A-Za-z0-9_\-]+)', text, re.IGNORECASE)
    if roll_match:
        meta['roll_number'] = roll_match.group(1).strip()
        
    # Extract Email
    email_match = re.search(r'([a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+)', text)
    if email_match:
        meta['email'] = email_match.group(1).strip()
        
    # Extract Class Section
    sec_match = re.search(r'(?:Class\s*Section|Section|Class|Sec|Dept|Branch)\s*[:=\-]\s*([A-Za-z0-9_\-\s]+)', text, re.IGNORECASE)
    if sec_match:
        meta['class_section'] = sec_match.group(1).strip()
        
    return meta

@app.post("/evaluate", response_model=dict)
async def evaluate_answer(
    question_file: Optional[UploadFile] = File(None),
    answer_file: Optional[UploadFile] = File(None),
    answer_key_file: Optional[UploadFile] = File(None), # added
    kb_files: List[UploadFile] = File(None), # Knowledge base files
    question_text: Optional[str] = Form(None),
    answer_text: Optional[str] = Form(None),
    custom_rubric: Optional[str] = Form(None), # Custom JSON rubric string
    student_name: Optional[str] = Form(None),
    provider: str = Form("Groq"),
    model: str = Form("llama-3.3-70b-versatile"),
    strictness: str = Form("Moderate"),
    partial_credit: bool = Form(True),
    api_key: str = Form(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_session)
):
    """
    Evaluate answer sheet using AI
    
    Accepts either file uploads or text input for questions and answers
    """
    
    # Extract knowledge base text if any
    kb_text = ""
    if kb_files:
        for f in kb_files:
            file_bytes = await f.read()
            if f.filename.endswith('.pdf'):
                kb_text += extract_text_from_pdf(file_bytes) + "\n\n"
            else:
                kb_text += file_bytes.decode('utf-8', errors='ignore') + "\n\n"
    
    # Extract custom rubric
    rubric_obj = None
    if custom_rubric:
        try:
           rubric_obj = json.loads(custom_rubric)
        except:
           pass
    
    # Fallback API key for Vision OCR if needed (checking all saved keys)
    inst = current_user.institution
    effective_api_key = api_key if api_key and api_key.strip() not in ["", "undefined", "null"] else (
        current_user.get_groq_api_key or
        current_user.get_gemini_api_key or
        current_user.get_openai_api_key or
        current_user.get_mistral_api_key or
        current_user.get_anthropic_api_key or
        (inst.get_groq_api_key if inst else "") or
        (inst.get_gemini_api_key if inst else "") or
        (inst.get_openai_api_key if inst else "") or
        (inst.get_mistral_api_key if inst else "") or
        (inst.get_anthropic_api_key if inst else "")
    )

    # Extract question text
    if question_file:
        q_bytes = await question_file.read()
        extracted_q = extract_text_from_file(q_bytes, question_file.filename, api_key=effective_api_key)
        if extracted_q:
            question_text = extracted_q
    
    # Extract answer text
    sheet_image_path = None
    if answer_file:
        file_bytes = await answer_file.read()
        
        # Save file for Manual Review Workspace
        os.makedirs("uploads", exist_ok=True)
        img_ext = answer_file.filename.split('.')[-1] if '.' in answer_file.filename else "docx"
        img_filename = f"uploads/eval_{int(datetime.utcnow().timestamp())}.{img_ext}"
        with open(img_filename, "wb") as buffer:
            buffer.write(file_bytes)
        sheet_image_path = f"/{img_filename}"
        
        extracted_a = extract_text_from_file(file_bytes, answer_file.filename, api_key=effective_api_key, context=question_text)
        if extracted_a:
            answer_text = extracted_a
            
    # Extract Answer Key text
    reference_answers = ""
    if answer_key_file:
        k_bytes = await answer_key_file.read()
        extracted_k = extract_text_from_file(k_bytes, answer_key_file.filename, api_key=effective_api_key)
        if extracted_k:
            reference_answers = extracted_k
    
    if not question_text or not answer_text:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Both question and answer are required"
        )
        
    # --- RAG VECTOR SEARCH ---
    # Instead of passing a massive 50-page PDF to the LLM directly, we Vectorize it 
    # and retrieve only the top 3 relevant chunks based on the student's answer.
    gemini_key = current_user.get_gemini_api_key
    final_kb_context = kb_text
    
    if kb_text.strip() and gemini_key:
        try:
            session_id = store_knowledge_base(kb_text, gemini_key)
            search_query = f"Question: {question_text}\nStudent Answer: {answer_text}"
            final_kb_context = retrieve_relevant_context(search_query, session_id, gemini_key)
            print(f"RAG Retrieval Successful: Embedded {len(kb_text)} chars into vector DB. Retrieved relevant context.")
        except Exception as e:
            print(f"RAG Engine failed, falling back to raw text injection: {str(e)}")
            final_kb_context = kb_text
            
    # Robust multi-level API Key Resolution
    p_clean = (provider or "").strip().lower()
    inst = current_user.institution
    
    resolved_api_key = (api_key or "").strip()
    if resolved_api_key in ["", "undefined", "null"]:
        resolved_api_key = ""
        
    if not resolved_api_key:
        if p_clean == "groq":
            resolved_api_key = current_user.get_groq_api_key or (inst.get_groq_api_key if inst else "")
        elif p_clean == "mistral":
            resolved_api_key = current_user.get_mistral_api_key or (inst.get_mistral_api_key if inst else "")
        elif p_clean == "gemini":
            resolved_api_key = current_user.get_gemini_api_key or (inst.get_gemini_api_key if inst else "")
        elif p_clean == "openai":
            resolved_api_key = current_user.get_openai_api_key or (inst.get_openai_api_key if inst else "")
        elif p_clean == "anthropic":
            resolved_api_key = current_user.get_anthropic_api_key or (inst.get_anthropic_api_key if inst else "")

    # Universal Fallback: if selected provider key is still empty, check ANY available saved key
    if not resolved_api_key:
        resolved_api_key = (
            current_user.get_groq_api_key or current_user.get_gemini_api_key or
            current_user.get_mistral_api_key or current_user.get_openai_api_key or current_user.get_anthropic_api_key or
            (inst.get_groq_api_key if inst else "") or (inst.get_gemini_api_key if inst else "") or
            (inst.get_mistral_api_key if inst else "") or (inst.get_openai_api_key if inst else "") or
            (inst.get_anthropic_api_key if inst else "")
        )

    if not resolved_api_key:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No API Key found. Please enter and save an API key in Settings Workspace."
        )

    # Initialize evaluator
    evaluator = AnswerEvaluator(
        api_key=resolved_api_key,
        provider=provider,
        model=model,
        strictness=strictness,
        partial_credit=partial_credit,
        detailed_rubric=True if rubric_obj else False,
        reference_answers=reference_answers if reference_answers else None
    )
    
    # Perform evaluation
    try:
        result = evaluator.evaluate(
            question_paper=question_text,
            answer_sheet=answer_text,
            knowledge_base=final_kb_context,
            custom_rubric=rubric_obj
        )
        
        # Extract AI & Regex detected student identity details
        header_meta = extract_header_metadata(answer_text)
        
        ai_student_name = (result.get('student_name') or header_meta.get('student_name') or '').strip()
        ai_roll_number = (result.get('roll_number') or header_meta.get('roll_number') or '').strip()
        ai_email = (result.get('email') or header_meta.get('email') or '').strip()
        ai_class_section = (result.get('class_section') or header_meta.get('class_section') or '').strip()
        
        if not ai_class_section or ai_class_section.lower() in ['anonymous', 'none', 'null', 'n/a']:
            ai_class_section = "General Section"

        final_student_name = student_name or (ai_student_name if ai_student_name.lower() not in ['anonymous', 'none', 'null'] else '') or 'Student Record'
        
        # Match against database to automatically link Student ID across institution
        db_student = None
        if current_user.institution_id:
            accessible_teacher_ids = [u.id for u in db.query(User).filter(User.institution_id == current_user.institution_id).all()]
        else:
            accessible_teacher_ids = [current_user.id]

        if ai_roll_number and ai_roll_number.lower() not in ['anonymous', 'none', 'null', 'n/a']:
            db_student = db.query(Student).filter(
                Student.teacher_id.in_(accessible_teacher_ids),
                Student.roll_number.ilike(ai_roll_number)
            ).first()

        if not db_student and ai_email and '@' in ai_email:
            db_student = db.query(Student).filter(
                Student.teacher_id.in_(accessible_teacher_ids),
                Student.email.ilike(ai_email)
            ).first()

        if not db_student and final_student_name and final_student_name != 'Student Record':
            db_student = db.query(Student).filter(
                Student.teacher_id.in_(accessible_teacher_ids),
                Student.full_name.ilike(f"%{final_student_name}%")
            ).first()

        # Update existing student or auto-create new student & section
        if db_student:
            if not db_student.class_section or db_student.class_section == "Default":
                db_student.class_section = ai_class_section
            if not db_student.email and ai_email and '@' in ai_email:
                db_student.email = ai_email
            db.commit()
        else:
            new_roll = ai_roll_number if (ai_roll_number and ai_roll_number.lower() not in ['anonymous', 'none', 'null', 'n/a']) else f"STU{int(datetime.utcnow().timestamp()) % 10000:04d}"
            db_student = Student(
                teacher_id=current_user.id,
                full_name=final_student_name,
                roll_number=new_roll,
                email=ai_email if (ai_email and '@' in ai_email) else f"{new_roll.lower()}@college.edu",
                class_section=ai_class_section
            )
            db.add(db_student)
            db.commit()
            db.refresh(db_student)

        # Always recompute percentage & grade from actual scores — never trust AI-returned values
        _earned = round(float(result.get('total_earned', 0)), 1)
        _max    = float(result.get('total_max', 10)) or 10  # avoid divide by zero
        _pct    = round((_earned / _max) * 100, 1)

        # User-predefined Grade thresholds set in Settings (defaults: A=85%, B=70%, C=55%, D=40%)
        thresh_a = current_user.grade_a_threshold if current_user.grade_a_threshold is not None else 85
        thresh_b = current_user.grade_b_threshold if current_user.grade_b_threshold is not None else 70
        thresh_c = current_user.grade_c_threshold if current_user.grade_c_threshold is not None else 55
        thresh_d = current_user.grade_d_threshold if current_user.grade_d_threshold is not None else 40

        def compute_grade(pct):
            if pct >= thresh_a: return ("A", "Excellent")
            if pct >= thresh_b: return ("B", "Good")
            if pct >= thresh_c: return ("C", "Average")
            if pct >= thresh_d: return ("D", "Below Average")
            return ("F", "Needs Improvement")

        _grade, _grade_name = compute_grade(_pct)

        # Save to database
        evaluation = Evaluation(
            sheet_image_path=sheet_image_path,
            teacher_id=current_user.id,
            student_id=db_student.id if db_student else None,
            student_name=db_student.full_name if db_student else final_student_name,
            total_earned=_earned,
            total_max=int(_max),
            percentage=_pct,
            grade=_grade,
            grade_name=_grade_name,
            ai_confidence=result.get('ai_confidence', 85),
            overall_feedback=result.get('overall_feedback'),
            questions_results=result.get('questions', result.get('questions_results', []))
        )
        
        db.add(evaluation)
        db.commit()
        db.refresh(evaluation)
        
        return {
            "id": evaluation.id,
            "student_id": db_student.id if db_student else None,
            "student_name": evaluation.student_name,
            "roll_number": db_student.roll_number if db_student else ai_roll_number,
            "email": db_student.email if db_student else ai_email,
            "class_section": db_student.class_section if db_student else ai_class_section,
            "total_earned": evaluation.total_earned,
            "total_max": evaluation.total_max,
            "percentage": evaluation.percentage,
            "grade": evaluation.grade,
            "grade_name": evaluation.grade_name,
            "ai_confidence": evaluation.ai_confidence,
            "overall_feedback": evaluation.overall_feedback,
            "questions_results": evaluation.questions_results,
            "sheet_image_path": evaluation.sheet_image_path,
            "created_at": evaluation.created_at.isoformat() if evaluation.created_at else datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        import traceback
        tb = traceback.format_exc()
        print(f"[EVALUATE ERROR] {str(e)}\n{tb}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Evaluation failed: {str(e)}"
        )

@app.post("/evaluate/rubric")
async def api_generate_rubric(
    question_file: Optional[UploadFile] = File(None),
    question_text: Optional[str] = Form(None),
    model: str = Form("gemini-2.5-pro"),
    api_key: str = Form(...),
    current_user: User = Depends(get_current_user)
):
    """Generate a grading rubric from a question paper using Gemini."""
    if question_file:
        if question_file.filename.endswith('.pdf'):
            question_text = extract_text_from_pdf(await question_file.read())
        else:
            question_text = extract_text_from_image(await question_file.read())
            
    if not question_text:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Question text or file is required"
        )
        
    try:
        rubric = generate_rubric(question_text, api_key, model)
        if "error" in rubric:
            raise HTTPException(status_code=500, detail=rubric["error"])
        return rubric
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/evaluate/batch")
async def api_evaluate_batch(
    zip_file: UploadFile = File(...),
    question_file: Optional[UploadFile] = File(None),
    answer_key_file: Optional[UploadFile] = File(None), # added
    question_text: Optional[str] = Form(None),
    kb_files: List[UploadFile] = File(None),
    custom_rubric: Optional[str] = Form(None),
    provider: str = Form("Gemini"),
    model: str = Form("gemini-2.0-flash"),
    api_key: str = Form(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_session)
):
    """Evaluate a batch of student answers from a ZIP file in parallel."""
    if not zip_file.filename.endswith('.zip'):
        raise HTTPException(status_code=400, detail="Must upload a ZIP file")
        
    if question_file:
        file_bytes = await question_file.read()
        if question_file.filename.endswith('.pdf'):
            question_text = extract_text_from_pdf(file_bytes, api_key)
        else:
            question_text = extract_text_from_image(file_bytes, api_key)

    if not question_text:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Question text or file is required"
        )
        
    # Extract KB Text
    kb_text = ""
    if kb_files:
        for f in kb_files:
            file_bytes = await f.read()
            if f.filename.endswith('.pdf'):
                kb_text += extract_text_from_pdf(file_bytes) + "\n\n"
            else:
                kb_text += file_bytes.decode('utf-8', errors='ignore') + "\n\n"
                
    # Extract Answer Key text (New)
    reference_answers = ""
    if answer_key_file:
        file_bytes = await answer_key_file.read()
        if answer_key_file.filename.endswith('.pdf'):
            reference_answers = extract_text_from_pdf(file_bytes)
        else:
            reference_answers = extract_text_from_image(file_bytes)

    # Extract Custom Rubric
    rubric_obj = None
    if custom_rubric:
        try:
           rubric_obj = json.loads(custom_rubric)
        except:
           pass
           
    try:
        zip_bytes = await zip_file.read()
        exams = extract_exams_from_zip(zip_bytes, api_key)
        
        task_ids = process_batch_async(
            exams=exams,
            question_text=question_text,
            api_key=api_key,
            provider=provider,
            model=model,
            kb_text=kb_text,
            custom_rubric=rubric_obj,
            reference_answers=reference_answers # passed
        )
        return {"total_tasks": len(task_ids), "task_ids": task_ids}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/evaluate/task/{task_id}")
async def get_task_status(task_id: str, current_user: User = Depends(get_current_user)):
    """Poll Celery task status for background grading."""
    task_result = AsyncResult(task_id, app=celery_app)
    
    response = {
        "task_id": task_id,
        "status": task_result.status,
    }
    
    if task_result.status == "SUCCESS":
        response["result"] = task_result.result
    elif task_result.status == "FAILURE":
        response["error"] = str(task_result.result)
        
    return response

@app.get("/evaluations")
async def get_evaluations(
    limit: int = 50,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_session)
):
    """Get all evaluations for current user or whole institution if admin"""
    if current_user.role in ["institution_admin", "admin"] and current_user.institution_id:
        faculty_ids = [u.id for u in db.query(User).filter(User.institution_id == current_user.institution_id).all()]
        active_student_ids = [s.id for s in db.query(Student.id).filter(Student.teacher_id.in_(faculty_ids), Student.is_active == True).all()]
        evaluations = db.query(Evaluation).filter(
            Evaluation.teacher_id.in_(faculty_ids),
            (Evaluation.student_id.in_(active_student_ids)) | (Evaluation.student_id == None)
        ).order_by(Evaluation.created_at.desc()).limit(limit).all()
    else:
        active_student_ids = [s.id for s in db.query(Student.id).filter(Student.teacher_id == current_user.id, Student.is_active == True).all()]
        evaluations = db.query(Evaluation).filter(
            Evaluation.teacher_id == current_user.id,
            (Evaluation.student_id.in_(active_student_ids)) | (Evaluation.student_id == None)
        ).order_by(Evaluation.created_at.desc()).limit(limit).all()
    
    return {
        "evaluations": [
            {
                "id": e.id,
                "student_name": e.student_name,
                "percentage": e.percentage,
                "grade": e.grade,
                "ai_confidence": e.ai_confidence,
                "student_section": e.student.class_section if e.student else "General Section",
                "created_at": e.created_at.isoformat()
            }
            for e in evaluations
        ]
    }

@app.get("/evaluations/{evaluation_id}", response_model=EvaluationResponse)
async def get_evaluation(
    evaluation_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_session)
):
    """Get specific evaluation details"""
    if current_user.role in ["institution_admin", "admin"] and current_user.institution_id:
        faculty_ids = [u.id for u in db.query(User).filter(User.institution_id == current_user.institution_id).all()]
        evaluation = db.query(Evaluation).filter(
            Evaluation.id == evaluation_id,
            Evaluation.teacher_id.in_(faculty_ids)
        ).first()
    else:
        evaluation = db.query(Evaluation).filter(
            Evaluation.id == evaluation_id,
            Evaluation.teacher_id == current_user.id
        ).first()
    
    if not evaluation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Evaluation not found"
        )
    
    return evaluation

@app.put("/evaluations/{evaluation_id}", response_model=EvaluationResponse)
async def update_evaluation(
    evaluation_id: int,
    request: EvaluationUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_session)
):
    """Update evaluation details manually (overrides)"""
    evaluation = db.query(Evaluation).filter(
        Evaluation.id == evaluation_id,
        Evaluation.teacher_id == current_user.id
    ).first()
    
    if not evaluation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Evaluation not found"
        )
    
    # Apply updates
    if request.total_earned is not None: evaluation.total_earned = request.total_earned
    if request.percentage is not None: evaluation.percentage = request.percentage
    if request.grade is not None: evaluation.grade = request.grade
    if request.grade_name is not None: evaluation.grade_name = request.grade_name
    if request.overall_feedback is not None: evaluation.overall_feedback = request.overall_feedback
    if request.questions_results is not None: evaluation.questions_results = request.questions_results
    
    db.commit()
    db.refresh(evaluation)
    return evaluation

# =============================================================================
# STUDENT MANAGEMENT ENDPOINTS
# =============================================================================

@app.get("/students")
async def get_students(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_session)
):
    """Get all students for current user or whole institution if admin"""
    if current_user.role in ["institution_admin", "admin"] and current_user.institution_id:
        faculty_ids = [u.id for u in db.query(User).filter(User.institution_id == current_user.institution_id).all()]
        students = db.query(Student).filter(
            Student.teacher_id.in_(faculty_ids),
            Student.is_active == True
        ).all()
    else:
        students = db.query(Student).filter(
            Student.teacher_id == current_user.id,
            Student.is_active == True
        ).all()
    
    # Calculate evaluation counts
    student_data = []
    for student in students:
        eval_count = db.query(Evaluation).filter(
            Evaluation.student_id == student.id
        ).count()
        
        avg_scores = db.query(Evaluation.percentage).filter(
            Evaluation.student_id == student.id
        ).all()
        avg_score = sum([s[0] for s in avg_scores]) / len(avg_scores) if avg_scores else 0
        
        student_data.append({
            "id": student.id,
            "roll_number": student.roll_number,
            "full_name": student.full_name,
            "email": student.email,
            "class_section": student.class_section,
            "evaluation_count": eval_count,
            "average_score": round(avg_score, 1)
        })
    
    return {"students": student_data}

@app.post("/students", response_model=StudentResponse, status_code=status.HTTP_201_CREATED)
async def create_student(
    student_data: StudentCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_session)
):
    """Create a new student"""
    
    # Check for duplicate roll number
    existing = db.query(Student).filter(
        Student.teacher_id == current_user.id,
        Student.roll_number == student_data.roll_number
    ).first()
    
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Student with roll number '{student_data.roll_number}' already exists"
        )
    
    new_student = Student(
        teacher_id=current_user.id,
        roll_number=student_data.roll_number,
        full_name=student_data.full_name,
        email=student_data.email,
        class_section=student_data.class_section
    )
    
    db.add(new_student)
    db.commit()
    db.refresh(new_student)
    
    return new_student

@app.delete("/students/{student_id}")
async def delete_student(
    student_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_session)
):
    """Delete (deactivate) a student"""
    student = db.query(Student).filter(
        Student.id == student_id,
        Student.teacher_id == current_user.id
    ).first()
    
    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Student not found"
        )
    
    student.is_active = False
    db.commit()
    
    return {"message": "Student deactivated successfully"}

@app.put("/students/{student_id}", response_model=StudentResponse)
async def update_student(
    student_id: int,
    student_data: StudentEdit,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_session)
):
    """Update a student's details"""
    student = db.query(Student).filter(
        Student.id == student_id,
        Student.teacher_id == current_user.id
    ).first()
    
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
        
    if student_data.full_name is not None:
         student.full_name = student_data.full_name
    if student_data.email is not None:
         student.email = student_data.email
    if student_data.class_section is not None:
         student.class_section = student_data.class_section
    if student_data.roll_number is not None:
         if student_data.roll_number != student.roll_number:
              existing = db.query(Student).filter(
                   Student.teacher_id == current_user.id,
                   Student.roll_number == student_data.roll_number
              ).first()
              if existing:
                   raise HTTPException(status_code=400, detail="Roll number already exists")
         student.roll_number = student_data.roll_number
         
    db.commit()
    db.refresh(student)
    return student

@app.post("/students/{student_id}/alert")
async def trigger_student_alert(
    student_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_session)
):
    """Trigger a mock email alert to the student"""
    student = db.query(Student).filter(Student.id == student_id, Student.teacher_id == current_user.id).first()
    if not student:
         raise HTTPException(status_code=404, detail="Student not found")
    return {"message": f"Alert sent to {student.full_name}"}

# =============================================================================
# ANALYTICS ENDPOINTS
# =============================================================================

@app.get("/analytics", response_model=AnalyticsResponse)
async def get_analytics(
    days: int = 30,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_session)
):
    """Get analytics data for dashboard"""
    
    # Get evaluations from last N days
    cutoff_date = datetime.utcnow() - timedelta(days=days)
    
    if current_user.role in ["institution_admin", "admin"] and current_user.institution_id:
         # Aggregate for the entire institution (only active students)
         faculty_ids = [u.id for u in db.query(User).filter(User.institution_id == current_user.institution_id).all()]
         active_student_ids = [s.id for s in db.query(Student.id).filter(Student.teacher_id.in_(faculty_ids), Student.is_active == True).all()]
         evaluations = db.query(Evaluation).filter(
             Evaluation.teacher_id.in_(faculty_ids),
             Evaluation.created_at >= cutoff_date,
             (Evaluation.student_id.in_(active_student_ids)) | (Evaluation.student_id == None)
         ).all()
         
         total_students = db.query(Student).filter(
             Student.teacher_id.in_(faculty_ids),
             Student.is_active == True
         ).count()
    else:
         # Standard view for individual faculty (only active students)
         active_student_ids = [s.id for s in db.query(Student.id).filter(Student.teacher_id == current_user.id, Student.is_active == True).all()]
         evaluations = db.query(Evaluation).filter(
             Evaluation.teacher_id == current_user.id,
             Evaluation.created_at >= cutoff_date,
             (Evaluation.student_id.in_(active_student_ids)) | (Evaluation.student_id == None)
         ).all()
         
         total_students = db.query(Student).filter(
             Student.teacher_id == current_user.id,
             Student.is_active == True
         ).count()
    
    total_evaluations = len(evaluations)
    average_score = sum([e.percentage for e in evaluations]) / total_evaluations if evaluations else 0
    
    # Grade distribution
    grade_dist = {}
    for eval in evaluations:
        grade_dist[eval.grade] = grade_dist.get(eval.grade, 0) + 1
    
    # Recent evaluations enriched with Teacher Name
    recent = evaluations[:10]
    faculty_breakdown = []
    
    from collections import defaultdict
    f_stats = defaultdict(lambda: {"evaluations": 0, "scores": []})
    
    users_list = db.query(User).filter(User.institution_id == current_user.institution_id).all() if current_user.institution_id else []
    user_names = {u.id: u.full_name or u.username for u in users_list}

    recent_data = [
        {
            "id": e.id,
            "student_name": e.student_name,
            "grade": e.grade,
            "percentage": e.percentage,
            "created_at": e.created_at.isoformat(),
            "teacher_name": user_names.get(e.teacher_id, "Teacher")
        }
        for e in recent
    ]
    
    # Performance trends (group by date)
    trends = {}
    for eval in evaluations:
        date_key = eval.created_at.date().isoformat()
        if date_key not in trends:
            trends[date_key] = {"scores": [], "count": 0}
        trends[date_key]["scores"].append(eval.percentage)
        trends[date_key]["count"] += 1
        
        # Also build Faculty Stats on the fly
        if current_user.role in ["institution_admin", "admin"]:
            t_id = eval.teacher_id
            f_stats[t_id]["evaluations"] += 1
            f_stats[t_id]["scores"].append(eval.percentage)
    
    if current_user.role in ["institution_admin", "admin"]:
        for t_id, stats in f_stats.items():
            avg = sum(stats["scores"]) / len(stats["scores"]) if stats["scores"] else 0
            faculty_breakdown.append({
                "name": user_names.get(t_id, f"Teacher #{t_id}"),
                "evaluations": stats["evaluations"],
                "average_score": round(avg, 1)
            })

    trend_data = [
        {
            "date": date,
            "average_score": sum(data["scores"]) / len(data["scores"]),
            "count": data["count"]
        }
        for date, data in sorted(trends.items())
    ]
    
    return {
        "total_evaluations": total_evaluations,
        "total_students": total_students,
        "average_score": round(average_score, 1),
        "grade_distribution": grade_dist,
        "recent_evaluations": recent_data,
        "performance_trends": trend_data,
        "faculty_breakdown": faculty_breakdown
    }

@app.get("/api/admin/faculty/{faculty_id}/analytics")
async def get_faculty_analytics(
    faculty_id: int,
    days: int = 30,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_session)
):
    """Get analytics data for a specific faculty member (Admin view)"""
    if current_user.role not in ["institution_admin", "admin"]:
        raise HTTPException(status_code=403, detail="Only institution administrators can view faculty analytics")
        
    # Verify faculty belongs to the same institution
    f_user = db.query(User).filter(User.id == faculty_id, User.institution_id == current_user.institution_id).first()
    if not f_user:
        raise HTTPException(status_code=404, detail="Faculty member not found or not in your institution")
        
    cutoff_date = datetime.utcnow() - timedelta(days=days)
    evaluations = db.query(Evaluation).filter(Evaluation.teacher_id == faculty_id, Evaluation.created_at >= cutoff_date).all()
    
    total_evaluations = len(evaluations)
    total_students = db.query(Student).filter(Student.teacher_id == faculty_id, Student.is_active == True).count()
    average_score = sum([e.percentage for e in evaluations]) / total_evaluations if evaluations else 0
    
    grade_dist = {}
    for eval in evaluations:
        grade_dist[eval.grade] = grade_dist.get(eval.grade, 0) + 1
        
    recent_data = [{
        "id": e.id, "student_name": e.student_name, "grade": e.grade,
        "percentage": e.percentage, "created_at": e.created_at.isoformat()
    } for e in evaluations[:10]]
    
    trends = {}
    for eval in evaluations:
        date_key = eval.created_at.date().isoformat()
        if date_key not in trends:
            trends[date_key] = {"scores": [], "count": 0}
        trends[date_key]["scores"].append(eval.percentage)
        trends[date_key]["count"] += 1
        
    trend_data = [{
        "date": k, "average_score": sum(v["scores"]) / len(v["scores"]), "count": v["count"]
    } for k, v in sorted(trends.items())]
    
    return {
        "total_evaluations": total_evaluations,
        "total_students": total_students,
        "average_score": round(average_score, 1),
        "grade_distribution": grade_dist,
        "recent_evaluations": recent_data,
        "performance_trends": trend_data
    }

# =============================================================================
# SETTINGS ENDPOINTS
# =============================================================================

@app.put("/settings/api-keys")
async def update_api_keys(
    data: APIKeysUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_session)
):
    """Update user API keys"""
    if data.groq_key is not None:
        current_user.groq_api_key = current_user._encrypt_key(data.groq_key)
    if data.mistral_key is not None:
        current_user.mistral_api_key = current_user._encrypt_key(data.mistral_key)
    if data.gemini_key is not None:
        current_user.gemini_api_key = current_user._encrypt_key(data.gemini_key)
    if data.openai_key is not None:
        current_user.openai_api_key = current_user._encrypt_key(data.openai_key)
    if data.anthropic_key is not None:
        current_user.anthropic_api_key = current_user._encrypt_key(data.anthropic_key)
    
    db.commit()
    return {"message": "API keys updated successfully"}

@app.put("/settings/preferences")
async def update_preferences(
    data: PreferencesUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_session)
):
    """Update user preferences"""
    if data.default_provider:
        current_user.default_provider = data.default_provider
    if data.default_model:
        current_user.default_model = data.default_model
    if data.default_strictness:
        current_user.default_strictness = data.default_strictness
    if data.grade_a is not None:
        current_user.grade_a_threshold = data.grade_a
    if data.grade_b is not None:
        current_user.grade_b_threshold = data.grade_b
    if data.grade_c is not None:
        current_user.grade_c_threshold = data.grade_c
    if grade_d is not None:
        current_user.grade_d_threshold = grade_d
    
    db.commit()
    return {"message": "Preferences updated successfully"}

# =============================================================================
# HEALTH CHECK
# =============================================================================

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "version": "2.0.0",
        "timestamp": datetime.utcnow().isoformat()
    }

@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "SmartGrade AI API",
        "version": "2.0.0",
        "docs": "/api/docs"
    }

# =============================================================================
# ERROR HANDLERS
# =============================================================================

@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    """Global exception handler"""
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": str(exc)}
    )

# Run with: uvicorn main:app --reload --host 0.0.0.0 --port 8000
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
