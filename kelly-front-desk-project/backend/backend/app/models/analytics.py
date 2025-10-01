from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime

class AnalyticsSummary(BaseModel):
    total_visits: int
    today_visits: int
    week_visits: int
    month_visits: int
    pending_documents: int
    total_staff: int
    last_updated: str

class DailyTrend(BaseModel):
    dates: List[str]
    visits: List[int]

class DistributionData(BaseModel):
    labels: List[str]
    values: List[int]

class DateRangeRequest(BaseModel):
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    days: Optional[int] = 30

class VisitsAnalytics(BaseModel):
    summary: AnalyticsSummary
    daily_trend: DailyTrend
    visit_types: DistributionData

class ReportRequest(BaseModel):
    report_type: str  # "daily", "weekly", "monthly", "custom"
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    format: str = "json"  # "json", "excel", "pdf"
    include_charts: bool = True

class ExportRequest(BaseModel):
    collection: str  # "visits", "staff", "document-queue"
    format: str = "excel"  # "excel", "csv", "json"
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None