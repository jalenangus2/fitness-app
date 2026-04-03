"""Run this script to create an admin user directly in the database."""
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Patch bcrypt compatibility
import bcrypt
if not hasattr(bcrypt, '__about__'):
    import types
    bcrypt.__about__ = types.SimpleNamespace(__version__=bcrypt.__version__)

from passlib.context import CryptContext
from backend.database import engine, Base, SessionLocal
from backend.models.user import User

Base.metadata.create_all(bind=engine)

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

db = SessionLocal()

username = "admin"
email = "admin@lifeos.app"
password = "admin123"

existing = db.query(User).filter(User.username == username).first()
if existing:
    print(f"User '{username}' already exists. You can log in with:")
else:
    user = User(
        email=email,
        username=username,
        hashed_password=pwd_context.hash(password),
    )
    db.add(user)
    db.commit()
    print(f"Created user successfully!")

print(f"  Username: {username}")
print(f"  Password: {password}")
db.close()
