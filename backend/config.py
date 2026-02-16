import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    APP_NAME: str = "RoadRash AI - SoniX"
    ENV: str = "development"
    
    # Security
    API_KEY: str = "" # Gemini API Key
    FIREBASE_CREDENTIALS_PATH: str = "firebase_credentials.json"
    
    # CORS
    ALLOWED_ORIGINS: list = ["*"]

    class Config:
        env_file = ".env"
        env_file_encoding = 'utf-8'

settings = Settings()
