# Google Document AI Setup Guide

## Overview

This guide will help you set up Google Document AI for DocBare to replace pdf-parse with superior OCR capabilities for legal documents.

## Prerequisites

1. **Google Cloud Project** with billing enabled
2. **Google Cloud CLI** installed and configured
3. **Service Account** with Document AI permissions
4. **Document AI API** enabled

## Step 1: Enable Document AI API

```bash
# Enable Document AI API
gcloud services enable documentai.googleapis.com

# Verify API is enabled
gcloud services list --enabled --filter="name:documentai.googleapis.com"
```

## Step 2: Create Service Account

```bash
# Create service account
gcloud iam service-accounts create docbare-document-ai \
    --display-name="DocBare Document AI Service Account"

# Get the service account email
SA_EMAIL=$(gcloud iam service-accounts list --filter="displayName:DocBare Document AI" --format="value(email)")

# Grant Document AI permissions
gcloud projects add-iam-policy-binding $GOOGLE_CLOUD_PROJECT_ID \
    --member="serviceAccount:$SA_EMAIL" \
    --role="roles/documentai.apiUser"

# Grant Storage permissions (for file access)
gcloud projects add-iam-policy-binding $GOOGLE_CLOUD_PROJECT_ID \
    --member="serviceAccount:$SA_EMAIL" \
    --role="roles/storage.objectViewer"
```

## Step 3: Create Document AI Processors

### General Document Processor
```bash
# Create general document processor
gcloud documentai processors create \
    --processor-type="general-document-processor" \
    --location="us" \
    --display-name="DocBare General Document Processor"
```

### Legal Document Processor (Optional)
```bash
# Create legal document processor
gcloud documentai processors create \
    --processor-type="legal-document-processor" \
    --location="us" \
    --display-name="DocBare Legal Document Processor"
```

### Form Parser Processor (Optional)
```bash
# Create form parser processor
gcloud documentai processors create \
    --processor-type="form-parser-processor" \
    --location="us" \
    --display-name="DocBare Form Parser Processor"
```

### OCR Processor (Optional)
```bash
# Create OCR processor for scanned documents
gcloud documentai processors create \
    --processor-type="ocr-processor" \
    --location="us" \
    --display-name="DocBare OCR Processor"
```

## Step 4: Get Processor IDs

```bash
# List all processors
gcloud documentai processors list --location="us"

# Get specific processor IDs
GENERAL_PROCESSOR_ID=$(gcloud documentai processors list --location="us" --filter="displayName:DocBare General Document Processor" --format="value(name)" | cut -d'/' -f6)
LEGAL_PROCESSOR_ID=$(gcloud documentai processors list --location="us" --filter="displayName:DocBare Legal Document Processor" --format="value(name)" | cut -d'/' -f6)
FORM_PROCESSOR_ID=$(gcloud documentai processors list --location="us" --filter="displayName:DocBare Form Parser Processor" --format="value(name)" | cut -d'/' -f6)
OCR_PROCESSOR_ID=$(gcloud documentai processors list --location="us" --filter="displayName:DocBare OCR Processor" --format="value(name)" | cut -d'/' -f6)

echo "General Processor ID: $GENERAL_PROCESSOR_ID"
echo "Legal Processor ID: $LEGAL_PROCESSOR_ID"
echo "Form Processor ID: $FORM_PROCESSOR_ID"
echo "OCR Processor ID: $OCR_PROCESSOR_ID"
```

## Step 5: Download Service Account Key

```bash
# Create and download service account key
gcloud iam service-accounts keys create docbare-document-ai-key.json \
    --iam-account=$SA_EMAIL

# Move to secure location
mv docbare-document-ai-key.json ./secrets/
chmod 600 ./secrets/docbare-document-ai-key.json
```

## Step 6: Environment Variables

Add these environment variables to your `.env` file:

```env
# Google Cloud Configuration
GOOGLE_CLOUD_PROJECT_ID=your-project-id
GOOGLE_APPLICATION_CREDENTIALS=./secrets/docbare-document-ai-key.json

# Document AI Configuration
DOCUMENT_AI_LOCATION=us
DOCUMENT_AI_GENERAL_PROCESSOR_ID=your-general-processor-id
DOCUMENT_AI_LEGAL_DOCUMENT_PROCESSOR_ID=your-legal-processor-id
DOCUMENT_AI_FORM_PARSER_PROCESSOR_ID=your-form-processor-id
DOCUMENT_AI_OCR_PROCESSOR_ID=your-ocr-processor-id
```

## Step 7: Test the Integration

```bash
# Run the Document AI test script
npx ts-node --project tsconfig.scripts.json scripts/test-document-ai.ts
```

## Step 8: Pricing Information

### Document AI Pricing (as of 2025)
- **General Document Processor**: $1.50 per 1,000 pages
- **Legal Document Processor**: $2.00 per 1,000 pages
- **Form Parser Processor**: $1.50 per 1,000 pages
- **OCR Processor**: $1.50 per 1,000 pages

### Cost Optimization Tips
1. **Use appropriate processor types** for different document types
2. **Implement caching** for processed documents
3. **Batch processing** for multiple documents
4. **Monitor usage** with Google Cloud Console

## Step 9: Production Deployment

### Docker Configuration
Ensure your Dockerfile includes the service account key:

```dockerfile
# Copy service account key
COPY ./secrets/docbare-document-ai-key.json /app/secrets/
ENV GOOGLE_APPLICATION_CREDENTIALS=/app/secrets/docbare-document-ai-key.json
```

### Cloud Run Configuration
For Cloud Run deployment, set the environment variables:

```bash
gcloud run deploy docbare \
    --image gcr.io/your-project/docbare \
    --set-env-vars="GOOGLE_CLOUD_PROJECT_ID=your-project-id" \
    --set-env-vars="DOCUMENT_AI_LOCATION=us" \
    --set-env-vars="DOCUMENT_AI_GENERAL_PROCESSOR_ID=your-processor-id"
```

## Troubleshooting

### Common Issues

1. **Authentication Errors**
   ```bash
   # Verify service account permissions
   gcloud auth activate-service-account --key-file=./secrets/docbare-document-ai-key.json
   gcloud auth list
   ```

2. **Processor Not Found**
   ```bash
   # List all processors in your project
   gcloud documentai processors list --location="us"
   ```

3. **API Not Enabled**
   ```bash
   # Enable Document AI API
   gcloud services enable documentai.googleapis.com
   ```

4. **Quota Exceeded**
   - Check usage in Google Cloud Console
   - Request quota increase if needed
   - Implement rate limiting

### Testing Commands

```bash
# Test Document AI connection
npx ts-node --project tsconfig.scripts.json scripts/test-document-ai.ts

# Test with a real PDF
curl -X POST http://localhost:3000/api/ingest \
  -F "file=@test-document.pdf" \
  -F "userId=test-user-id"
```

## Benefits of Document AI

1. **Superior OCR**: Better text extraction from scanned documents
2. **Entity Extraction**: Automatically identify legal entities
3. **Table Recognition**: Extract structured data from tables
4. **Form Processing**: Parse form fields and values
5. **Multi-language Support**: Process documents in multiple languages
6. **Confidence Scoring**: Built-in quality assessment
7. **Scalability**: Handles large document volumes

## Migration from pdf-parse

The Document AI integration completely replaces pdf-parse with:
- ✅ Better text extraction quality
- ✅ Entity and table extraction
- ✅ Confidence scoring
- ✅ Multi-format support (PDF, images, scanned documents)
- ✅ Production-ready scalability
- ✅ Google Cloud integration

## Support

For issues with Document AI setup:
1. Check Google Cloud Console logs
2. Verify service account permissions
3. Test with the provided test script
4. Review Google Cloud documentation
5. Contact Google Cloud support if needed
