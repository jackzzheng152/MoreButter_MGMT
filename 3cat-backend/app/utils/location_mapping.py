# app/services/location_mapping.py

from app.models.location import Location
from sqlalchemy.orm import Session

def get_sevenshift_location_id(location_code: str, db: Session) -> str:
    """
    Retrieve 7shifts location ID based on location code.

    Args:
        location_code: Code of the location (e.g., 'CH', 'SG')
        db: SQLAlchemy session

    Returns:
        sevenshift_location_id (str) or None if not found
    """
    if not location_code:
        return None

    location = db.query(Location).filter(
        Location.location_code == location_code
    ).first()

    if location and location.sevenshift_location_id:
        return location.sevenshift_location_id
    return None