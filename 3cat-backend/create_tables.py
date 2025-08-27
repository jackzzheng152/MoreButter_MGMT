from sqlalchemy import create_engine
from app.models.order import Base  # Import Base from your models
import os
from dotenv import load_dotenv

# Load env vars from .env file
load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")  # should match your FastAPI config

if not DATABASE_URL:
    raise ValueError("DATABASE_URL is not set in the environment variables.")

engine = create_engine(DATABASE_URL)

print("Creating tables in the database...")
Base.metadata.create_all(engine)
print("Tables created successfully.")
