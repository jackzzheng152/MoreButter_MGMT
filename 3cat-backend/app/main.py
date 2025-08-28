from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import api_router
from app.config import logger

from app.database import Base, engine
import app.models  # Import all models to register them

# Create tables if they don't exist (create_all only creates missing tables)
logger.info("Ensuring database tables exist...")
Base.metadata.create_all(bind=engine)
logger.info("Database initialization complete.")

# Create FastAPI app
app = FastAPI(title="3Cat Management System")

# Configure CORS origins
origins = [
    "http://localhost:5173",  # Local development
    "https://mgmt-3cat-frontend-5b191f66febe.herokuapp.com",  # Heroku frontend
    "https://mgmt-3cat-frontend-5b191f66febe.herokuapp.com/",  # Heroku frontend with trailing slash
]

# Add CORS middleware BEFORE including routes
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["*"],
)

# Include all routes AFTER CORS middleware
app.include_router(api_router)

# Health check endpoint
@app.get("/health")
def health_check():
    return {"status": "ok"}

# Startup event
@app.on_event("startup")
async def startup_event():
    logger.info("Application starting up")

# Shutdown event
@app.on_event("shutdown")
async def shutdown_event():
    logger.info("Application shutting down")

# Run with: uvicorn app.main:app --reload
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)