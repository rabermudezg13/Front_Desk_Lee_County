from fastapi import APIRouter, HTTPException, Depends
from typing import Optional
from datetime import datetime, timedelta

from app.services.firestore_service import FirestoreService
from app.models.analytics import (
    AnalyticsSummary, 
    DailyTrend, 
    DistributionData, 
    VisitsAnalytics,
    DateRangeRequest
)

router = APIRouter()

# Dependency to get Firestore service
def get_firestore_service():
    return FirestoreService()

@router.get("/summary", response_model=AnalyticsSummary)
async def get_analytics_summary(
    firestore_service: FirestoreService = Depends(get_firestore_service)
):
    """Get basic analytics summary"""
    try:
        summary = await firestore_service.get_analytics_summary()
        return AnalyticsSummary(**summary)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/visits/trend", response_model=DailyTrend)
async def get_daily_visits_trend(
    days: int = 30,
    firestore_service: FirestoreService = Depends(get_firestore_service)
):
    """Get daily visits trend for the last N days"""
    try:
        trend_data = await firestore_service.get_daily_visits_trend(days=days)
        return DailyTrend(**trend_data)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/visits/types", response_model=DistributionData)
async def get_visit_types_distribution(
    firestore_service: FirestoreService = Depends(get_firestore_service)
):
    """Get distribution of visit types"""
    try:
        distribution = await firestore_service.get_visit_types_distribution()
        return DistributionData(**distribution)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/visits/complete", response_model=VisitsAnalytics)
async def get_complete_visits_analytics(
    days: int = 30,
    firestore_service: FirestoreService = Depends(get_firestore_service)
):
    """Get complete visits analytics including summary, trends, and distributions"""
    try:
        # Get all analytics data in parallel
        summary_data = await firestore_service.get_analytics_summary()
        trend_data = await firestore_service.get_daily_visits_trend(days=days)
        types_data = await firestore_service.get_visit_types_distribution()
        
        return VisitsAnalytics(
            summary=AnalyticsSummary(**summary_data),
            daily_trend=DailyTrend(**trend_data),
            visit_types=DistributionData(**types_data)
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/visits/custom-range", response_model=DailyTrend)
async def get_visits_custom_range(
    date_request: DateRangeRequest,
    firestore_service: FirestoreService = Depends(get_firestore_service)
):
    """Get visits data for a custom date range"""
    try:
        # If no dates provided, use default days parameter
        if not date_request.start_date and not date_request.end_date:
            trend_data = await firestore_service.get_daily_visits_trend(days=date_request.days or 30)
        else:
            # Custom date range logic would go here
            # For now, using the days parameter
            trend_data = await firestore_service.get_daily_visits_trend(days=date_request.days or 30)
        
        return DailyTrend(**trend_data)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/collections")
async def get_available_collections(
    firestore_service: FirestoreService = Depends(get_firestore_service)
):
    """Get list of available Firestore collections"""
    try:
        collections = await firestore_service.test_connection()
        return {"collections": collections}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))