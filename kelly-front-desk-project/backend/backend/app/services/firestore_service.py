import firebase_admin
from firebase_admin import credentials, firestore
from typing import Dict, List, Any, Optional
import pandas as pd
from datetime import datetime, timedelta
import json
import os

from app.config import settings

class FirestoreService:
    def __init__(self):
        """Initialize Firestore service with Firebase Admin SDK"""
        try:
            # Initialize Firebase Admin (if not already initialized)
            if not firebase_admin._apps:
                # Try to use environment variable first (for Railway)
                firebase_config = os.getenv('FIREBASE_CREDENTIALS')
                if firebase_config:
                    print("🔑 Using Firebase credentials from environment variable")
                    cred_dict = json.loads(firebase_config)
                    cred = credentials.Certificate(cred_dict)
                else:
                    print("🔑 Using Firebase credentials from file")
                    cred = credentials.Certificate(settings.firebase_credentials_path)
                
                firebase_admin.initialize_app(cred, {
                    'projectId': settings.firebase_project_id,
                })
            
            self.db = firestore.client()
            print("✅ Firestore client initialized successfully")
            
        except Exception as e:
            print(f"❌ Error initializing Firestore: {e}")
            raise

    async def test_connection(self) -> List[str]:
        """Test Firestore connection and return available collections"""
        try:
            collections = [col.id for col in self.db.collections()]
            return collections
        except Exception as e:
            raise Exception(f"Firestore connection test failed: {e}")

    async def get_collection_data(self, collection_name: str, limit: Optional[int] = None) -> List[Dict]:
        """Get all documents from a collection"""
        try:
            query = self.db.collection(collection_name)
            if limit:
                query = query.limit(limit)
            
            docs = query.stream()
            return [{'id': doc.id, **doc.to_dict()} for doc in docs]
        except Exception as e:
            raise Exception(f"Error getting collection {collection_name}: {e}")

    async def get_visits_data(self, start_date: Optional[datetime] = None, end_date: Optional[datetime] = None) -> pd.DataFrame:
        """Get visits data as pandas DataFrame with optional date filtering"""
        try:
            query = self.db.collection('visits')
            
            if start_date:
                query = query.where('timestamp', '>=', start_date)
            if end_date:
                query = query.where('timestamp', '<=', end_date)
            
            docs = query.stream()
            data = []
            
            for doc in docs:
                doc_data = doc.to_dict()
                doc_data['id'] = doc.id
                
                # Convert Firestore timestamp to datetime
                if 'timestamp' in doc_data and doc_data['timestamp']:
                    doc_data['timestamp'] = doc_data['timestamp'].replace(tzinfo=None)
                
                data.append(doc_data)
            
            return pd.DataFrame(data)
        except Exception as e:
            raise Exception(f"Error getting visits data: {e}")

    async def get_staff_data(self) -> pd.DataFrame:
        """Get staff data as pandas DataFrame"""
        try:
            docs = self.db.collection('staff').stream()
            data = [{'id': doc.id, **doc.to_dict()} for doc in docs]
            return pd.DataFrame(data)
        except Exception as e:
            raise Exception(f"Error getting staff data: {e}")

    async def get_document_queue_data(self) -> pd.DataFrame:
        """Get document queue data as pandas DataFrame"""
        try:
            docs = self.db.collection('document-queue').stream()
            data = []
            
            for doc in docs:
                doc_data = doc.to_dict()
                doc_data['id'] = doc.id
                
                # Convert Firestore timestamp to datetime
                if 'submittedAt' in doc_data and doc_data['submittedAt']:
                    doc_data['submittedAt'] = doc_data['submittedAt'].replace(tzinfo=None)
                
                data.append(doc_data)
            
            return pd.DataFrame(data)
        except Exception as e:
            raise Exception(f"Error getting document queue data: {e}")

    async def get_analytics_summary(self) -> Dict[str, Any]:
        """Get basic analytics summary"""
        try:
            # Get current date for filtering
            today = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
            week_ago = today - timedelta(days=7)
            month_ago = today - timedelta(days=30)

            # Get visits data
            visits_df = await self.get_visits_data()
            
            # Calculate basic metrics
            total_visits = len(visits_df)
            
            # Today's visits
            if not visits_df.empty and 'timestamp' in visits_df.columns:
                visits_df['date'] = pd.to_datetime(visits_df['timestamp']).dt.date
                today_visits = len(visits_df[visits_df['date'] == today.date()])
                week_visits = len(visits_df[visits_df['timestamp'] >= week_ago])
                month_visits = len(visits_df[visits_df['timestamp'] >= month_ago])
            else:
                today_visits = week_visits = month_visits = 0

            # Get document queue data
            doc_queue_df = await self.get_document_queue_data()
            pending_documents = len(doc_queue_df)

            # Get staff data
            staff_df = await self.get_staff_data()
            total_staff = len(staff_df)

            return {
                "total_visits": total_visits,
                "today_visits": today_visits,
                "week_visits": week_visits,
                "month_visits": month_visits,
                "pending_documents": pending_documents,
                "total_staff": total_staff,
                "last_updated": datetime.now().isoformat()
            }
        except Exception as e:
            raise Exception(f"Error getting analytics summary: {e}")

    async def get_daily_visits_trend(self, days: int = 30) -> Dict[str, Any]:
        """Get daily visits trend for the last N days"""
        try:
            start_date = datetime.now() - timedelta(days=days)
            visits_df = await self.get_visits_data(start_date=start_date)
            
            if visits_df.empty:
                return {"dates": [], "visits": []}
            
            # Group by date
            visits_df['date'] = pd.to_datetime(visits_df['timestamp']).dt.date
            daily_counts = visits_df.groupby('date').size().reset_index(name='count')
            
            # Create complete date range
            date_range = pd.date_range(start=start_date.date(), end=datetime.now().date(), freq='D')
            complete_df = pd.DataFrame({'date': date_range.date})
            
            # Merge with actual data
            result_df = complete_df.merge(daily_counts, on='date', how='left').fillna(0)
            
            return {
                "dates": [d.strftime('%Y-%m-%d') for d in result_df['date']],
                "visits": result_df['count'].astype(int).tolist()
            }
        except Exception as e:
            raise Exception(f"Error getting daily visits trend: {e}")

    async def get_visit_types_distribution(self) -> Dict[str, Any]:
        """Get distribution of visit types"""
        try:
            visits_df = await self.get_visits_data()
            
            if visits_df.empty or 'visitType' not in visits_df.columns:
                return {"labels": [], "values": []}
            
            type_counts = visits_df['visitType'].value_counts()
            
            return {
                "labels": type_counts.index.tolist(),
                "values": type_counts.values.tolist()
            }
        except Exception as e:
            raise Exception(f"Error getting visit types distribution: {e}")