"""Database connection and session management"""
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, scoped_session
from contextlib import contextmanager
import os
from pathlib import Path

# Database path
BASE_DIR = Path(__file__).parent.parent
DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{BASE_DIR.as_posix()}/smartgrade.db")

# Handle deprecated postgres:// scheme often provided by cloud hosts
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

# SQLite requires specific connection args; Postgres does not
connect_args = {}
if DATABASE_URL.startswith("sqlite"):
    connect_args["check_same_thread"] = False

# Create engine
engine = create_engine(DATABASE_URL, connect_args=connect_args, echo=False)
Session = scoped_session(sessionmaker(bind=engine))

def init_db():
    """Initialize database tables and handle simple column migrations"""
    from database.models import Base
    Base.metadata.create_all(engine)
    
    # Auto-add missing columns to SQLite database if needed
    try:
        from sqlalchemy import inspect, text
        inspector = inspect(engine)
        if inspector.has_table('institutions'):
            columns = [c['name'] for c in inspector.get_columns('institutions')]
            with engine.connect() as conn:
                if 'anthropic_api_key' not in columns:
                    conn.execute(text("ALTER TABLE institutions ADD COLUMN anthropic_api_key VARCHAR(500)"))
                    conn.commit()
                if 'openai_api_key' not in columns:
                    conn.execute(text("ALTER TABLE institutions ADD COLUMN openai_api_key VARCHAR(500)"))
                    conn.commit()
    except Exception as e:
        print(f"Migration check info: {e}")
        
    print("Database initialized successfully!")

@contextmanager
def get_db():
    """Context manager for database sessions"""
    session = Session()
    try:
        yield session
        session.commit()
    except Exception as e:
        session.rollback()
        raise e
    finally:
        session.close()

def get_session():
    """Get a database session (for FastAPI Depends)"""
    session = Session()
    try:
        yield session
    finally:
        session.close()
