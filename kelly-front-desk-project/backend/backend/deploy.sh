#!/bin/bash

# Kelly Education Lee County - Deploy to Cloud Run
echo "🚀 Deploying Kelly Analytics API to Google Cloud Run..."

# Variables
PROJECT_ID="kelly-education-lee-coun-a4aae"
SERVICE_NAME="kelly-analytics-api"
REGION="us-central1"

# Build and deploy
echo "📦 Building and deploying..."
gcloud run deploy $SERVICE_NAME \
  --source . \
  --project $PROJECT_ID \
  --region $REGION \
  --platform managed \
  --allow-unauthenticated \
  --memory 512Mi \
  --cpu 1 \
  --port 8080 \
  --set-env-vars PORT=8080 \
  --max-instances 10

echo "✅ Deploy completed!"
echo "🌐 Your API will be available at:"
gcloud run services describe $SERVICE_NAME --region $REGION --project $PROJECT_ID --format 'value(status.url)'