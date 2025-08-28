from pydantic_settings import BaseSettings
from dotenv import load_dotenv
import os
import logging

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[logging.StreamHandler()]
)
logger = logging.getLogger(__name__)



class Settings(BaseSettings):
    DATABASE_URL: str = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost/Bafang_dashboard")
    BAMBOO_HR_API_KEY: str = os.getenv("BAMBOO_HR_API_KEY", "")

    BAMBOO_HR_SUBDOMAIN: str = os.getenv("BAMBOO_HR_SUBDOMAIN", "")


     # Add these lines for 7shifts integration
    SEVEN_SHIFTS_API_KEY: str = os.getenv("SEVEN_SHIFTS_API_KEY", "")
    SEVEN_SHIFTS_LOCATION_ID: str = os.getenv("SEVEN_SHIFTS_LOCATION_ID", "")
    SEVEN_SHIFTS_COMPANY_ID: str = os.getenv("SEVEN_SHIFTS_COMPANY_ID", "")


    model_config = {
        "env_file": ".env"
    }

settings = Settings()