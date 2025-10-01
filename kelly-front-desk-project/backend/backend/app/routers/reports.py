from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import StreamingResponse
from typing import Optional
import pandas as pd
import io
from datetime import datetime

from app.services.firestore_service import FirestoreService
from app.models.analytics import ReportRequest, ExportRequest

router = APIRouter()

def get_firestore_service():
    return FirestoreService()

@router.post("/generate")
async def generate_report(
    report_request: ReportRequest,
    firestore_service: FirestoreService = Depends(get_firestore_service)
):
    """Generate reports in various formats"""
    try:
        # Get data based on report type
        if report_request.report_type == "visits":
            df = await firestore_service.get_visits_data(
                start_date=report_request.start_date,
                end_date=report_request.end_date
            )
        elif report_request.report_type == "documents":
            df = await firestore_service.get_document_queue_data()
        elif report_request.report_type == "staff":
            df = await firestore_service.get_staff_data()
        else:
            raise HTTPException(status_code=400, detail="Invalid report type")

        if report_request.format == "json":
            return {"data": df.to_dict('records'), "total_records": len(df)}
        
        elif report_request.format == "excel":
            # Create Excel file in memory
            output = io.BytesIO()
            with pd.ExcelWriter(output, engine='openpyxl') as writer:
                df.to_excel(writer, sheet_name=report_request.report_type, index=False)
            
            output.seek(0)
            filename = f"{report_request.report_type}_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx"
            
            return StreamingResponse(
                io.BytesIO(output.read()),
                media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                headers={"Content-Disposition": f"attachment; filename={filename}"}
            )
        
        else:
            raise HTTPException(status_code=400, detail="Unsupported format")
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/export")
async def export_data(
    export_request: ExportRequest,
    firestore_service: FirestoreService = Depends(get_firestore_service)
):
    """Export collection data in various formats"""
    try:
        # Get data from specified collection
        if export_request.collection == "visits":
            df = await firestore_service.get_visits_data(
                start_date=export_request.start_date,
                end_date=export_request.end_date
            )
        elif export_request.collection == "document-queue":
            df = await firestore_service.get_document_queue_data()
        elif export_request.collection == "staff":
            df = await firestore_service.get_staff_data()
        else:
            raise HTTPException(status_code=400, detail="Invalid collection name")

        if df.empty:
            raise HTTPException(status_code=404, detail="No data found for the specified criteria")

        filename_base = f"{export_request.collection}_export_{datetime.now().strftime('%Y%m%d_%H%M%S')}"

        if export_request.format == "excel":
            output = io.BytesIO()
            with pd.ExcelWriter(output, engine='openpyxl') as writer:
                df.to_excel(writer, sheet_name=export_request.collection, index=False)
            
            output.seek(0)
            return StreamingResponse(
                io.BytesIO(output.read()),
                media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                headers={"Content-Disposition": f"attachment; filename={filename_base}.xlsx"}
            )
        
        elif export_request.format == "csv":
            output = io.StringIO()
            df.to_csv(output, index=False)
            output.seek(0)
            
            return StreamingResponse(
                io.BytesIO(output.getvalue().encode('utf-8')),
                media_type="text/csv",
                headers={"Content-Disposition": f"attachment; filename={filename_base}.csv"}
            )
        
        elif export_request.format == "json":
            return {
                "collection": export_request.collection,
                "total_records": len(df),
                "exported_at": datetime.now().isoformat(),
                "data": df.to_dict('records')
            }
        
        else:
            raise HTTPException(status_code=400, detail="Unsupported export format")
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/daily-summary")
async def get_daily_summary(
    date: Optional[str] = None,
    firestore_service: FirestoreService = Depends(get_firestore_service)
):
    """Get daily summary report"""
    try:
        # Parse date or use today
        if date:
            target_date = datetime.strptime(date, '%Y-%m-%d').date()
        else:
            target_date = datetime.now().date()
        
        # Get visits for the specific date
        start_datetime = datetime.combine(target_date, datetime.min.time())
        end_datetime = datetime.combine(target_date, datetime.max.time())
        
        visits_df = await firestore_service.get_visits_data(
            start_date=start_datetime,
            end_date=end_datetime
        )
        
        # Calculate daily metrics
        total_visits = len(visits_df)
        
        # Visit types breakdown
        visit_types = {}
        if not visits_df.empty and 'visitType' in visits_df.columns:
            visit_types = visits_df['visitType'].value_counts().to_dict()
        
        # Hourly distribution
        hourly_visits = {}
        if not visits_df.empty and 'timestamp' in visits_df.columns:
            visits_df['hour'] = pd.to_datetime(visits_df['timestamp']).dt.hour
            hourly_visits = visits_df['hour'].value_counts().sort_index().to_dict()
        
        return {
            "date": target_date.isoformat(),
            "total_visits": total_visits,
            "visit_types_breakdown": visit_types,
            "hourly_distribution": hourly_visits,
            "generated_at": datetime.now().isoformat()
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))