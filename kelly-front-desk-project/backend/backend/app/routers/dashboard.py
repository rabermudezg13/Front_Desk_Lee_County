from fastapi import APIRouter, HTTPException, Depends
from typing import Dict, Any, Optional
import plotly.graph_objects as go
import plotly.express as px
import pandas as pd
import json

from app.services.firestore_service import FirestoreService

router = APIRouter()

def get_firestore_service():
    return FirestoreService()

@router.get("/widgets")
async def get_dashboard_widgets(
    firestore_service: FirestoreService = Depends(get_firestore_service)
):
    """Get all dashboard widgets data"""
    try:
        # Get analytics summary
        summary = await firestore_service.get_analytics_summary()
        
        # Get trend data
        trend_data = await firestore_service.get_daily_visits_trend(days=30)
        
        # Get visit types distribution
        types_data = await firestore_service.get_visit_types_distribution()
        
        # Create widgets configuration
        widgets = {
            "summary_cards": [
                {
                    "title": "Total Visits",
                    "value": summary["total_visits"],
                    "icon": "👥",
                    "color": "blue",
                    "trend": "+12% vs last month"
                },
                {
                    "title": "Today's Visits", 
                    "value": summary["today_visits"],
                    "icon": "📅",
                    "color": "green",
                    "trend": "Today"
                },
                {
                    "title": "Pending Documents",
                    "value": summary["pending_documents"],
                    "icon": "📄",
                    "color": "orange",
                    "trend": "Queue"
                },
                {
                    "title": "Active Staff",
                    "value": summary["total_staff"],
                    "icon": "👨‍💼",
                    "color": "purple",
                    "trend": "Staff count"
                }
            ],
            "charts": {
                "visits_trend": {
                    "type": "line",
                    "data": trend_data,
                    "title": "30-Day Visits Trend"
                },
                "visit_types": {
                    "type": "pie",
                    "data": types_data,
                    "title": "Visit Types Distribution"
                }
            },
            "last_updated": summary["last_updated"]
        }
        
        return widgets
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/chart/visits-trend")
async def get_visits_trend_chart(
    days: int = 30,
    chart_type: str = "line",
    firestore_service: FirestoreService = Depends(get_firestore_service)
):
    """Generate visits trend chart data for Plotly"""
    try:
        trend_data = await firestore_service.get_daily_visits_trend(days=days)
        
        if chart_type == "line":
            fig = go.Figure()
            fig.add_trace(go.Scatter(
                x=trend_data["dates"],
                y=trend_data["visits"],
                mode='lines+markers',
                name='Daily Visits',
                line=dict(color='#3498db', width=3),
                marker=dict(size=6)
            ))
            
            fig.update_layout(
                title=f'Daily Visits Trend ({days} days)',
                xaxis_title='Date',
                yaxis_title='Number of Visits',
                hovermode='x unified',
                template='plotly_white'
            )
        
        elif chart_type == "bar":
            fig = go.Figure()
            fig.add_trace(go.Bar(
                x=trend_data["dates"],
                y=trend_data["visits"],
                name='Daily Visits',
                marker_color='#3498db'
            ))
            
            fig.update_layout(
                title=f'Daily Visits ({days} days)',
                xaxis_title='Date',
                yaxis_title='Number of Visits',
                template='plotly_white'
            )
        
        else:
            raise HTTPException(status_code=400, detail="Invalid chart type")
        
        return {
            "chart_data": fig.to_dict(),
            "raw_data": trend_data
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/chart/visit-types")
async def get_visit_types_chart(
    chart_type: str = "pie",
    firestore_service: FirestoreService = Depends(get_firestore_service)
):
    """Generate visit types distribution chart"""
    try:
        types_data = await firestore_service.get_visit_types_distribution()
        
        if not types_data["labels"]:
            return {"chart_data": None, "message": "No visit data available"}
        
        if chart_type == "pie":
            fig = go.Figure()
            fig.add_trace(go.Pie(
                labels=types_data["labels"],
                values=types_data["values"],
                hole=0.3,
                textinfo='label+percent',
                textposition='outside'
            ))
            
            fig.update_layout(
                title='Visit Types Distribution',
                template='plotly_white'
            )
        
        elif chart_type == "bar":
            fig = go.Figure()
            fig.add_trace(go.Bar(
                x=types_data["labels"],
                y=types_data["values"],
                marker_color='#e74c3c'
            ))
            
            fig.update_layout(
                title='Visit Types Distribution',
                xaxis_title='Visit Type',
                yaxis_title='Count',
                template='plotly_white'
            )
        
        else:
            raise HTTPException(status_code=400, detail="Invalid chart type")
        
        return {
            "chart_data": fig.to_dict(),
            "raw_data": types_data
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/real-time-stats")
async def get_real_time_stats(
    firestore_service: FirestoreService = Depends(get_firestore_service)
):
    """Get real-time statistics for live dashboard updates"""
    try:
        summary = await firestore_service.get_analytics_summary()
        
        # Add some calculated metrics
        week_vs_month_ratio = 0
        if summary["month_visits"] > 0:
            week_vs_month_ratio = round((summary["week_visits"] / summary["month_visits"]) * 100, 1)
        
        return {
            "current_stats": summary,
            "calculated_metrics": {
                "week_vs_month_ratio": week_vs_month_ratio,
                "avg_daily_visits": round(summary["month_visits"] / 30, 1) if summary["month_visits"] > 0 else 0,
                "documents_per_visit": round(summary["pending_documents"] / summary["total_visits"], 2) if summary["total_visits"] > 0 else 0
            },
            "status": "active",
            "timestamp": summary["last_updated"]
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))