#!/usr/bin/env python3
"""
Kelly Education Lee County - Analytics API
Backend server startup script
"""

import uvicorn
import os
import sys

# Add the backend directory to Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.config import settings

def main():
    """Main function to start the API server"""
    print("🚀 Starting Kelly Education Lee County Analytics API...")
    print(f"📍 Server will be available at: http://{settings.host}:{settings.port}")
    print(f"📚 API Documentation: http://{settings.host}:{settings.port}/docs")
    print(f"🔧 Debug mode: {settings.debug}")
    
    uvicorn.run(
        "app.main:app",
        host=settings.host,
        port=settings.port,
        reload=settings.debug,
        log_level="info" if not settings.debug else "debug",
        access_log=True
    )

if __name__ == "__main__":
    main()