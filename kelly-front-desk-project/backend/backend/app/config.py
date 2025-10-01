import os
from typing import Optional
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    # Firebase
    firebase_credentials_path: str = "firebase_credentials.json"
    firebase_project_id: str = "kelly-education-lee-coun-a4aae"
    
    # API Configuration
    api_title: str = "Kelly Education Lee County - Analytics API"
    api_version: str = "1.0.0"
    api_description: str = "Backend API for advanced analytics and data management"
    
    # CORS
    allowed_origins: list = [
        "https://kelly-education-lee-coun-a4aae.web.app",
        "https://kelly-education-lee-coun-a4aae.firebaseapp.com",
        "http://localhost:3000",
        "http://localhost:8080",
        "http://127.0.0.1:8080"
    ]
    
    # Cloud Run Configuration
    debug: bool = False
    host: str = "0.0.0.0"
    port: int = int(os.getenv("PORT", 8080))
    
    class Config:
        env_file = ".env"
        case_sensitive = False

settings = Settings()