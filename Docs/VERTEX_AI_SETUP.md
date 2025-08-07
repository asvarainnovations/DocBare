# Vertex AI Knowledge Base Setup Guide

## Overview

This guide explains how to set up Vertex AI Vector Search for the DocBare knowledge base integration.

## Environment Variables

Add the following environment variables to your `.env.local` file:

```bash
# Vertex AI Configuration
GCP_PROJECT_ID=your-google-cloud-project-id
VERTEX_AI_LOCATION=us-central1
VERTEX_AI_INDEX_ENDPOINT=your-vertex-ai-index-endpoint-id

# Optional: Override default settings
VERTEX_AI_TOP_K=5
VERTEX_AI_TIMEOUT=10000
```

## Setup Steps

### 1. Google Cloud Project Setup

1. **Create a Google Cloud Project** (if you don't have one)
2. **Enable Vertex AI API**:
   ```bash
   gcloud services enable aiplatform.googleapis.com
   ```

### 2. Create Vertex AI Vector Search Index

1. **Create an index**:
   ```bash
   gcloud ai index-endpoints create \
     --project=YOUR_PROJECT_ID \
     --region=us-central1 \
     --display-name="docbare-knowledge-base"
   ```

2. **Deploy the index**:
   ```bash
   gcloud ai index-endpoints deploy-index \
     --project=YOUR_PROJECT_ID \
     --region=us-central1 \
     --index-endpoint=YOUR_ENDPOINT_ID \
     --deployed-index-id=docbare-kb \
     --display-name="DocBare Knowledge Base"
   ```

### 3. Service Account Setup

1. **Create a service account**:
   ```bash
   gcloud iam service-accounts create docbare-vertex-ai \
     --display-name="DocBare Vertex AI Service Account"
   ```

2. **Grant necessary permissions**:
   ```bash
   gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
     --member="serviceAccount:docbare-vertex-ai@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
     --role="roles/aiplatform.user"
   ```

3. **Authentication Setup**:
   
   **Development Environment:**
   - Place your service account key file at `secrets/service-account-key.json`
   - The system will automatically use it when `NODE_ENV=development`
   
   **Production Environment (Cloud Run):**
   - No additional setup required
   - The system automatically uses Application Default Credentials
   - Ensure your Cloud Run service account has Vertex AI permissions

### 4. Knowledge Base Content

The knowledge base should contain:

- **Bare Acts**: Complete legal statutes and sections
- **Legal Precedents**: Important case law and judgments
- **Drafting Templates**: Legal document templates and formats
- **Legal Principles**: Core legal concepts and interpretations
- **Compliance Guidelines**: Regulatory requirements and best practices

### 5. Testing the Integration

Use the test script to verify the setup:

```bash
npm run test:vertex-ai
```

## Usage

The knowledge base is automatically integrated into:

1. **Single Agent Mode**: Enhanced prompts with legal knowledge
2. **Multi-Agent Mode**: All agents (Orchestrator, Analysis, Drafting) have access

## Authentication Methods

### Development Environment
- **Service Account Key File**: Uses `secrets/service-account-key.json`
- **Automatic Detection**: When `NODE_ENV=development`
- **No Manual Token Management**: No need to generate or refresh tokens

### Production Environment (Cloud Run)
- **Application Default Credentials**: Automatically uses the service account attached to Cloud Run
- **No Key Files**: No service account key files needed in production
- **Secure**: Credentials are managed by Google Cloud Platform
- **Automatic Token Refresh**: Tokens are automatically refreshed by the Google Auth library

## Troubleshooting

### Common Issues

1. **Authentication Errors**:
   - **Development**: Verify `secrets/service-account-key.json` exists and is valid
   - **Production**: Check Cloud Run service account has Vertex AI permissions
   - **Both**: Ensure `NODE_ENV` is set correctly

2. **Index Not Found**:
   - Verify `VERTEX_AI_INDEX_ENDPOINT` is correct
   - Ensure index is deployed and active

3. **Timeout Errors**:
   - Increase `VERTEX_AI_TIMEOUT` value
   - Check network connectivity

### Debug Mode

Enable debug logging by setting:
```bash
DEBUG_VERTEX_AI=true
```

## Performance Optimization

1. **Batch Operations**: Use batch requests for multiple queries
2. **Caching**: Implement caching for frequently accessed knowledge
3. **Index Optimization**: Tune index parameters for your use case

## Security Considerations

1. **Access Control**: Restrict service account permissions
2. **Data Encryption**: Ensure data is encrypted in transit and at rest
3. **Audit Logging**: Monitor knowledge base access

## Cost Optimization

1. **Query Optimization**: Limit `topK` parameter appropriately
2. **Index Management**: Use appropriate index types for your data
3. **Monitoring**: Track usage and costs in Google Cloud Console 