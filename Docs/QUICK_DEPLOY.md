# Quick Deployment Reference

## 🚀 One-Command Deployment

### **Using the Deployment Script**
```bash
# Set your project ID and deploy
PROJECT_ID="your-gcp-project-id" ./scripts/deploy.sh

# Or use command line arguments
./scripts/deploy.sh -p your-gcp-project-id -r us-central1
```

## 🐳 Local Docker Development

### **Start Development Environment**
```bash
# Start all services (app, PostgreSQL, Redis)
docker-compose up

# Start in background
docker-compose up -d

# View logs
docker-compose logs -f docbare-app
```

### **Build and Test Locally**
```bash
# Build Docker image
docker build -t docbare:latest .

# Run container locally
docker run -p 3000:3000 --env-file .env docbare:latest
```

## ☁️ GCP Cloud Run Deployment

### **Manual Deployment Steps**
```bash
# 1. Set project ID
export PROJECT_ID="your-gcp-project-id"
gcloud config set project $PROJECT_ID

# 2. Configure Docker
gcloud auth configure-docker

# 3. Build and push image
docker build -t gcr.io/$PROJECT_ID/docbare:latest .
docker push gcr.io/$PROJECT_ID/docbare:latest

# 4. Deploy to Cloud Run
gcloud run deploy docbare \
  --image gcr.io/$PROJECT_ID/docbare:latest \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --memory 2Gi \
  --cpu 2 \
  --port 8080
```

## 🔧 Environment Variables

### **Required for Production**
```bash
# Set these environment variables in Cloud Run
NODE_ENV=production
GOOGLE_CLOUD_PROJECT_ID=your-gcp-project-id
DEEPSEEK_API_KEY=your-deepseek-api-key
VERTEX_AI_LOCATION=us-central1
VERTEX_AI_INDEX_ENDPOINT=your-vertex-ai-index-endpoint
VERTEX_AI_DEPLOYED_INDEX_ID=your-deployed-index-id
VERTEX_AI_PUBLIC_DOMAIN=your-vertex-ai-public-domain
DATABASE_URL=your-production-database-url
NEXTAUTH_SECRET=your-nextauth-secret
NEXTAUTH_URL=https://your-cloud-run-url.run.app
```

## 📊 Monitoring Commands

### **View Logs**
```bash
# Real-time logs
gcloud logs tail --service=docbare

# Service information
gcloud run services describe docbare --region=us-central1
```

### **Health Check**
```bash
# Get service URL
gcloud run services describe docbare --region=us-central1 --format="value(status.url)"

# Test service
curl -I https://your-cloud-run-url.run.app
```

## 🗄️ Database Setup

### **Cloud SQL PostgreSQL**
```bash
# Create instance
gcloud sql instances create docbare-db \
  --database-version=POSTGRES_15 \
  --tier=db-f1-micro \
  --region=us-central1

# Create database
gcloud sql databases create docbare --instance=docbare-db

# Run migrations
npx prisma migrate deploy
```

## 🔄 Update Deployment

### **Redeploy with New Image**
```bash
# Build new image
docker build -t gcr.io/$PROJECT_ID/docbare:latest .

# Push to registry
docker push gcr.io/$PROJECT_ID/docbare:latest

# Update Cloud Run service
gcloud run services update docbare \
  --image gcr.io/$PROJECT_ID/docbare:latest \
  --region us-central1
```

## 🚨 Troubleshooting

### **Common Issues**
```bash
# Check build logs
docker build --no-cache -t test-image .

# Check Cloud Run logs
gcloud logs read "resource.type=cloud_run_revision AND resource.labels.service_name=docbare"

# Verify environment variables
gcloud run services describe docbare --region=us-central1 --format="value(spec.template.spec.containers[0].env)"
```

---

**For detailed instructions, see [DEPLOYMENT.md](./DEPLOYMENT.md)**
