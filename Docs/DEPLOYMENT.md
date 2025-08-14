# DocBare Deployment Guide

This guide covers deploying DocBare to Google Cloud Platform (GCP) using Docker and Cloud Run.

## 🚀 Prerequisites

### **1. GCP Setup**
- Google Cloud Project with billing enabled
- Google Cloud CLI (gcloud) installed and configured
- Docker installed locally (for testing)
- Access to GCP Cloud Shell

### **2. Required APIs**
Enable the following APIs in your GCP project:
```bash
gcloud services enable cloudbuild.googleapis.com
gcloud services enable run.googleapis.com
gcloud services enable containerregistry.googleapis.com
gcloud services enable compute.googleapis.com
```

### **3. Environment Variables**
Ensure you have the following environment variables configured:
- `GOOGLE_CLOUD_PROJECT_ID` - Your GCP project ID
- `DEEPSEEK_API_KEY` - DeepSeek API key
- `VERTEX_AI_LOCATION` - Vertex AI location (e.g., us-central1)
- `VERTEX_AI_INDEX_ENDPOINT` - Vertex AI index endpoint
- `VERTEX_AI_DEPLOYED_INDEX_ID` - Vertex AI deployed index ID
- `VERTEX_AI_PUBLIC_DOMAIN` - Vertex AI public domain
- `DATABASE_URL` - PostgreSQL connection string
- `NEXTAUTH_SECRET` - NextAuth secret
- `NEXTAUTH_URL` - NextAuth URL (production URL)
- **Document AI Configuration:**
  - `DOCUMENT_AI_LOCATION` - Document AI location (default: us)
  - `DOCUMENT_AI_GENERAL_PROCESSOR_ID` - General document processor ID
  - `DOCUMENT_AI_LEGAL_PROCESSOR_ID` - Legal document processor ID
  - `DOCUMENT_AI_FORM_PROCESSOR_ID` - Form parser processor ID
  - `DOCUMENT_AI_OCR_PROCESSOR_ID` - OCR processor ID
  - `GOOGLE_APPLICATION_CREDENTIALS` - Service account key path

## 🐳 Local Docker Development

### **1. Build Docker Image Locally**
```bash
# Build the Docker image
docker build -t docbare:latest .

# Run the container locally
docker run -p 3000:3000 --env-file .env docbare:latest
```

### **2. Using Docker Compose (Development)**
```bash
# Start all services (app, PostgreSQL, Redis)
docker-compose up

# Start in background
docker-compose up -d

# Stop all services
docker-compose down

# View logs
docker-compose logs -f docbare-app
```

## ☁️ GCP Cloud Run Deployment

### **Method 1: Using GCP Cloud Shell (Recommended)**

#### **Step 1: Clone Repository in Cloud Shell**
```bash
# Open GCP Cloud Shell and clone the repository
git clone https://github.com/your-username/docbare.git
cd docbare
```

#### **Step 2: Configure Environment**
```bash
# Set your project ID
export PROJECT_ID="your-gcp-project-id"
gcloud config set project $PROJECT_ID

# Create .env file with production variables
cat > .env << EOF
NODE_ENV=production
GOOGLE_CLOUD_PROJECT_ID=$PROJECT_ID
DEEPSEEK_API_KEY=your-deepseek-api-key
VERTEX_AI_LOCATION=us-central1
VERTEX_AI_INDEX_ENDPOINT=your-vertex-ai-index-endpoint
VERTEX_AI_DEPLOYED_INDEX_ID=your-deployed-index-id
VERTEX_AI_PUBLIC_DOMAIN=your-vertex-ai-public-domain
DATABASE_URL=your-production-database-url
NEXTAUTH_SECRET=your-nextauth-secret
NEXTAUTH_URL=https://your-cloud-run-url.run.app
DOCUMENT_AI_LOCATION=us
DOCUMENT_AI_GENERAL_PROCESSOR_ID=your-general-processor-id
DOCUMENT_AI_LEGAL_PROCESSOR_ID=your-legal-processor-id
DOCUMENT_AI_FORM_PROCESSOR_ID=your-form-processor-id
DOCUMENT_AI_OCR_PROCESSOR_ID=your-ocr-processor-id
GOOGLE_APPLICATION_CREDENTIALS=/app/service-account-key.json
EOF
```

#### **Step 3: Build and Push Docker Image**
```bash
# Build the Docker image
docker build -t gcr.io/$PROJECT_ID/docbare:latest .

# Configure Docker to use gcloud as a credential helper
gcloud auth configure-docker

# Push the image to Google Container Registry
docker push gcr.io/$PROJECT_ID/docbare:latest
```

#### **Step 4: Deploy to Cloud Run**
```bash
# Deploy to Cloud Run
gcloud run deploy docbare \
  --image gcr.io/$PROJECT_ID/docbare:latest \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --memory 2Gi \
  --cpu 2 \
  --max-instances 10 \
  --min-instances 0 \
  --port 8080 \
  --set-env-vars NODE_ENV=production \
  --set-env-vars GOOGLE_CLOUD_PROJECT_ID=$PROJECT_ID \
  --set-env-vars DEEPSEEK_API_KEY=your-deepseek-api-key \
  --set-env-vars VERTEX_AI_LOCATION=us-central1 \
  --set-env-vars VERTEX_AI_INDEX_ENDPOINT=your-vertex-ai-index-endpoint \
  --set-env-vars VERTEX_AI_DEPLOYED_INDEX_ID=your-deployed-index-id \
  --set-env-vars VERTEX_AI_PUBLIC_DOMAIN=your-vertex-ai-public-domain \
  --set-env-vars DATABASE_URL=your-production-database-url \
  --set-env-vars NEXTAUTH_SECRET=your-nextauth-secret \
  --set-env-vars NEXTAUTH_URL=https://your-cloud-run-url.run.app
```

### **Method 2: Using Cloud Build (Alternative)**

#### **Step 1: Create Cloud Build Trigger**
```bash
# Create a Cloud Build trigger
gcloud builds triggers create github \
  --repo-name=docbare \
  --repo-owner=your-username \
  --branch-pattern="^main$" \
  --build-config=cloudbuild.yaml
```

#### **Step 2: Push to GitHub**
```bash
# Push your changes to trigger the build
git add .
git commit -m "Deploy to Cloud Run"
git push origin main
```

## 🔧 Environment Configuration

### **Production Environment Variables**
Create a `.env.production` file with the following variables:

```env
# Application
NODE_ENV=production
NEXT_TELEMETRY_DISABLED=1

# GCP Configuration
GOOGLE_CLOUD_PROJECT_ID=your-gcp-project-id
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account-key.json

# DeepSeek API
DEEPSEEK_API_KEY=your-deepseek-api-key

# Vertex AI Configuration
VERTEX_AI_LOCATION=us-central1
VERTEX_AI_INDEX_ENDPOINT=your-vertex-ai-index-endpoint
VERTEX_AI_DEPLOYED_INDEX_ID=your-deployed-index-id
VERTEX_AI_PUBLIC_DOMAIN=your-vertex-ai-public-domain

# Database
DATABASE_URL=your-production-database-url

# Authentication
NEXTAUTH_SECRET=your-nextauth-secret
NEXTAUTH_URL=https://your-cloud-run-url.run.app

# Firebase (if using)
FIREBASE_PROJECT_ID=your-firebase-project-id
FIREBASE_PRIVATE_KEY=your-firebase-private-key
FIREBASE_CLIENT_EMAIL=your-firebase-client-email
```

## 🗄️ Database Setup

### **Cloud SQL PostgreSQL**
```bash
# Create Cloud SQL instance
gcloud sql instances create docbare-db \
  --database-version=POSTGRES_15 \
  --tier=db-f1-micro \
  --region=us-central1 \
  --root-password=your-root-password

# Create database
gcloud sql databases create docbare --instance=docbare-db

# Create user
gcloud sql users create docbare-user \
  --instance=docbare-db \
  --password=your-user-password
```

### **Run Database Migrations**
```bash
# Run Prisma migrations
npx prisma migrate deploy

# Generate Prisma client
npx prisma generate
```

## 🔍 Monitoring and Logging

### **View Cloud Run Logs**
```bash
# View logs in real-time
gcloud logs tail --service=docbare

# View specific log entries
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=docbare"
```

### **Monitor Performance**
```bash
# Get service information
gcloud run services describe docbare --region=us-central1

# List revisions
gcloud run revisions list --service=docbare --region=us-central1
```

## 🔄 Continuous Deployment

### **GitHub Actions Workflow**
Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Cloud Run

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Google Cloud CLI
      uses: google-github-actions/setup-gcloud@v0
      with:
        project_id: ${{ secrets.GCP_PROJECT_ID }}
        service_account_key: ${{ secrets.GCP_SA_KEY }}
    
    - name: Configure Docker
      run: gcloud auth configure-docker
    
    - name: Build and Push Docker Image
      run: |
        docker build -t gcr.io/${{ secrets.GCP_PROJECT_ID }}/docbare:${{ github.sha }} .
        docker push gcr.io/${{ secrets.GCP_PROJECT_ID }}/docbare:${{ github.sha }}
    
    - name: Deploy to Cloud Run
      run: |
        gcloud run deploy docbare \
          --image gcr.io/${{ secrets.GCP_PROJECT_ID }}/docbare:${{ github.sha }} \
          --platform managed \
          --region us-central1 \
          --allow-unauthenticated
```

## 🚨 Troubleshooting

### **Common Issues**

#### **1. Build Failures**
```bash
# Check build logs
gcloud builds log [BUILD_ID]

# Verify Dockerfile syntax
docker build --no-cache -t test-image .
```

#### **2. Runtime Errors**
```bash
# Check Cloud Run logs
gcloud logs read "resource.type=cloud_run_revision AND resource.labels.service_name=docbare" --limit=50

# Verify environment variables
gcloud run services describe docbare --region=us-central1 --format="value(spec.template.spec.containers[0].env)"
```

#### **3. Database Connection Issues**
```bash
# Test database connection
gcloud sql connect docbare-db --user=postgres

# Check connection string format
echo $DATABASE_URL
```

### **Performance Optimization**

#### **1. Memory and CPU Tuning**
```bash
# Update service with optimized resources
gcloud run services update docbare \
  --memory 4Gi \
  --cpu 4 \
  --max-instances 20 \
  --region us-central1
```

#### **2. Cold Start Optimization**
```bash
# Set minimum instances to reduce cold starts
gcloud run services update docbare \
  --min-instances 1 \
  --region us-central1
```

## 📊 Cost Optimization

### **Resource Recommendations**
- **Development**: 1 CPU, 1Gi memory, 0-1 instances
- **Staging**: 2 CPU, 2Gi memory, 0-5 instances
- **Production**: 2-4 CPU, 2-4Gi memory, 1-10 instances

### **Monitoring Costs**
```bash
# View Cloud Run costs
gcloud billing budgets list

# Set up billing alerts
gcloud billing budgets create \
  --billing-account=your-billing-account \
  --display-name="DocBare Budget" \
  --budget-amount=100USD \
  --threshold-rule=percent=0.5 \
  --threshold-rule=percent=0.9
```

## 🔐 Security Best Practices

### **1. Service Account Configuration**
```bash
# Create service account for Cloud Run
gcloud iam service-accounts create docbare-sa \
  --display-name="DocBare Service Account"

# Grant necessary permissions
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:docbare-sa@$PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/run.invoker"
```

### **2. Environment Variable Security**
- Use Google Secret Manager for sensitive data
- Never commit `.env` files to version control
- Rotate API keys regularly

### **3. Network Security**
```bash
# Restrict access to Cloud Run service
gcloud run services update docbare \
  --no-allow-unauthenticated \
  --region us-central1
```

## 📝 Deployment Checklist

- [ ] GCP project configured with billing
- [ ] Required APIs enabled
- [ ] Environment variables configured
- [ ] Database instance created and migrated
- [ ] Docker image builds successfully
- [ ] Cloud Run service deployed
- [ ] Domain configured (if using custom domain)
- [ ] SSL certificate configured
- [ ] Monitoring and logging set up
- [ ] Performance testing completed
- [ ] Security review completed

## 🔗 Useful Commands

### **Quick Deployment Script**
```bash
#!/bin/bash
# deploy.sh

export PROJECT_ID="your-gcp-project-id"
export REGION="us-central1"

echo "Building Docker image..."
docker build -t gcr.io/$PROJECT_ID/docbare:latest .

echo "Pushing to Container Registry..."
docker push gcr.io/$PROJECT_ID/docbare:latest

echo "Deploying to Cloud Run..."
gcloud run deploy docbare \
  --image gcr.io/$PROJECT_ID/docbare:latest \
  --platform managed \
  --region $REGION \
  --allow-unauthenticated \
  --memory 2Gi \
  --cpu 2

echo "Deployment complete!"
```

### **Health Check**
```bash
# Check service health
curl -I https://your-cloud-run-url.run.app

# Check database connectivity
gcloud sql connect docbare-db --user=postgres -d docbare
```

---

## 📞 Support

For deployment issues or questions:
1. Check the troubleshooting section above
2. Review Cloud Run logs
3. Verify environment configuration
4. Contact the development team

**Last Updated**: August 2025
**Version**: 1.0.0
