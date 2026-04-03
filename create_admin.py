"""Run this script to create an admin user directly in the database."""
import bcrypt
from backend.database import engine, Base, SessionLocal
from backend.models.user import User

Base.metadata.create_all(bind=engine)

db = SessionLocal()

username = "admin"
email = "admin@lifeos.app"
password = "admin123"

existing = db.query(User).filter(User.username == username).first()
if existing:
    print(f"User '{username}' already exists.")
else:
    hashed = bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()
    user = User(email=email, username=username, hashed_password=hashed)
    db.add(user)
    db.commit()
    print("Created user successfully!")

print(f"  Username: {username}")
print(f"  Password: {password}")
db.close()
