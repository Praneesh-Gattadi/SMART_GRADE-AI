"""Updated Database Models with QuestionBank"""
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text, Boolean, JSON
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from datetime import datetime
import bcrypt
from cryptography.fernet import Fernet
import os

# Initialize Fernet encryption for API keys
# In production, this must be a fixed key from environment variables
ENCRYPTION_KEY = os.getenv("ENCRYPTION_KEY", Fernet.generate_key().decode('utf-8'))
if isinstance(ENCRYPTION_KEY, str):
    ENCRYPTION_KEY = ENCRYPTION_KEY.encode('utf-8')
fernet = Fernet(ENCRYPTION_KEY)

Base = declarative_base()

class Institution(Base):
    __tablename__ = 'institutions'
    
    id = Column(Integer, primary_key=True)
    name = Column(String(100), nullable=False)
    subdomain = Column(String(50), unique=True, nullable=False) # e.g., "sivasivani"
    type = Column(String(20), nullable=False) # "School" or "College"
    logo_url = Column(String(255), nullable=True)
    theme_color = Column(String(20), nullable=True) # Hex color override
    created_at = Column(DateTime, default=datetime.utcnow)
    is_active = Column(Boolean, default=True)
    
    # Global Institutional API Keys
    groq_api_key = Column(String(255), nullable=True)
    mistral_api_key = Column(String(255), nullable=True)
    gemini_api_key = Column(String(255), nullable=True)
    openai_api_key = Column(String(500), nullable=True)
    anthropic_api_key = Column(String(500), nullable=True)
    
    # Relationships
    users = relationship('User', back_populates='institution')

    @property
    def has_admin(self) -> bool:
        """Check if this institution has an administrator account registered"""
        return any(user.role == 'institution_admin' for user in self.users)

    def _encrypt_key(self, api_key: str) -> str:
        """Helper to encrypt an API key"""
        if not api_key:
            return api_key
        return fernet.encrypt(api_key.encode()).decode()
        
    def _decrypt_key(self, encrypted_key: str) -> str:
        """Helper to decrypt an API key"""
        if not encrypted_key:
            return encrypted_key
        try:
            return fernet.decrypt(encrypted_key.encode()).decode()
        except Exception:
            return ""

    @property
    def get_groq_api_key(self):
        return self._decrypt_key(self.groq_api_key)

    @property
    def get_mistral_api_key(self):
        return self._decrypt_key(self.mistral_api_key)

    @property
    def get_gemini_api_key(self):
        return self._decrypt_key(self.gemini_api_key)

    @property
    def get_openai_api_key(self):
        return self._decrypt_key(self.openai_api_key)

    @property
    def get_anthropic_api_key(self):
        return self._decrypt_key(self.anthropic_api_key)

class User(Base):
    __tablename__ = 'users'
    
    id = Column(Integer, primary_key=True)
    institution_id = Column(Integer, ForeignKey('institutions.id'), nullable=True) # Link to Institution
    username = Column(String(50), unique=True, nullable=False)
    email = Column(String(120), unique=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(20), default='teacher')
    full_name = Column(String(100))
    mobile_number = Column(String(20), nullable=True)
    school_name = Column(String(100), nullable=True)
    school_type = Column(String(20), nullable=True) # "School" or "College"
    subject = Column(String(50), nullable=True)
    avatar_url = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    last_login = Column(DateTime)
    is_active = Column(Boolean, default=True)
    
    # API Keys
    groq_api_key = Column(String(255))
    mistral_api_key = Column(String(255))
    gemini_api_key = Column(String(255))
    openai_api_key = Column(String(500))
    anthropic_api_key = Column(String(500))
    
    # Preferences
    default_provider = Column(String(20), default='Groq')
    default_model = Column(String(100), default='llama-3.3-70b-versatile')
    default_strictness = Column(String(20), default='Moderate')
    grade_a_threshold = Column(Integer, default=85)
    grade_b_threshold = Column(Integer, default=70)
    grade_c_threshold = Column(Integer, default=55)
    grade_d_threshold = Column(Integer, default=40)
    
    # Relationships
    evaluations = relationship('Evaluation', back_populates='teacher', foreign_keys='Evaluation.teacher_id')
    students = relationship('Student', back_populates='teacher')
    question_banks = relationship('QuestionBank', back_populates='creator')
    institution = relationship('Institution', back_populates='users')
    
    
    def set_password(self, password):
        """Hash password using bcrypt"""
        self.password_hash = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    
    def check_password(self, password):
        """Verify password against hash"""
        return bcrypt.checkpw(password.encode('utf-8'), self.password_hash.encode('utf-8'))
        
    def _encrypt_key(self, api_key: str) -> str:
        """Helper to encrypt an API key"""
        if not api_key:
            return api_key
        return fernet.encrypt(api_key.encode()).decode()
        
    def _decrypt_key(self, encrypted_key: str) -> str:
        """Helper to decrypt an API key"""
        if not encrypted_key:
            return encrypted_key
        try:
            return fernet.decrypt(encrypted_key.encode()).decode()
        except Exception:
            # Fallback if decryption fails (e.g. key changed)
            return ""

    @property
    def get_groq_api_key(self):
        return self._decrypt_key(self.groq_api_key)
        
    @property
    def get_mistral_api_key(self):
        return self._decrypt_key(self.mistral_api_key)
        
    @property
    def get_gemini_api_key(self):
        return self._decrypt_key(self.gemini_api_key)

    @property
    def get_openai_api_key(self):
        return self._decrypt_key(self.openai_api_key)

    @property
    def get_anthropic_api_key(self):
        return self._decrypt_key(self.anthropic_api_key)
        
    def set_keys(self, groq=None, mistral=None, gemini=None, openai=None, anthropic=None):
        if groq is not None:
            self.groq_api_key = self._encrypt_key(groq)
        if mistral is not None:
            self.mistral_api_key = self._encrypt_key(mistral)
        if gemini is not None:
            self.gemini_api_key = self._encrypt_key(gemini)
        if openai is not None:
            self.openai_api_key = self._encrypt_key(openai)
        if anthropic is not None:
            self.anthropic_api_key = self._encrypt_key(anthropic)

class Student(Base):
    __tablename__ = 'students'
    
    id = Column(Integer, primary_key=True)
    teacher_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    roll_number = Column(String(50))
    full_name = Column(String(100), nullable=False)
    email = Column(String(120))
    class_section = Column(String(50))
    created_at = Column(DateTime, default=datetime.utcnow)
    is_active = Column(Boolean, default=True)
    
    teacher = relationship('User', back_populates='students')
    evaluations = relationship('Evaluation', back_populates='student')

class Evaluation(Base):
    __tablename__ = 'evaluations'
    
    id = Column(Integer, primary_key=True)
    teacher_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    student_id = Column(Integer, ForeignKey('students.id'))
    student_name = Column(String(100))
    
    # Evaluation details
    total_earned = Column(Float, nullable=False)
    total_max = Column(Float, nullable=False)
    percentage = Column(Float)
    grade = Column(String(2))
    grade_name = Column(String(20))
    
    # Settings used
    provider = Column(String(20))
    model = Column(String(100))
    strictness = Column(String(20))
    partial_credit = Column(Boolean)
    used_reference = Column(Boolean, default=False)
    detailed_rubric = Column(Boolean, default=False)
    
    # AI metadata
    ai_confidence = Column(Integer)
    overall_feedback = Column(Text)
    
    # Detailed results (JSON)
    questions_results = Column(JSON)
    sheet_image_path = Column(Text, nullable=True)
    
    # Review status
    status = Column(String(20), default='completed')
    reviewed_by = Column(Integer, ForeignKey('users.id'))
    review_notes = Column(Text)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    reviewed_at = Column(DateTime)
    
    # Relationships
    teacher = relationship('User', back_populates='evaluations', foreign_keys=[teacher_id])
    student = relationship('Student', back_populates='evaluations')

class QuestionBank(Base):
    """NEW in Phase 2: Question Bank for reusable question papers"""
    __tablename__ = 'question_banks'
    
    id = Column(Integer, primary_key=True)
    creator_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    title = Column(String(200), nullable=False)
    subject = Column(String(100))
    topic = Column(String(100))
    total_marks = Column(Integer)
    question_text = Column(Text, nullable=False)
    reference_answers = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, onupdate=datetime.utcnow)
    is_public = Column(Boolean, default=False)
    usage_count = Column(Integer, default=0)
    
    # Relationship
    creator = relationship('User', back_populates='question_banks')
