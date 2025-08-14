# Manual Document AI Processor Setup Guide

## Overview

This guide provides step-by-step instructions for creating Document AI processors manually through the Google Cloud Console, since the `gcloud documentai` commands might not be available in your current installation.

## Prerequisites

1. **Google Cloud Project** with billing enabled
2. **Document AI API** enabled
3. **Service Account** with Document AI permissions

## Step 1: Enable Document AI API

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project
3. Navigate to **APIs & Services** > **Library**
4. Search for "Document AI API"
5. Click on "Document AI API" and click **Enable**

## Step 2: Create Service Account

1. Go to **IAM & Admin** > **Service Accounts**
2. Click **Create Service Account**
3. Name: `docbare-document-ai`
4. Description: `DocBare Document AI Service Account`
5. Click **Create and Continue**
6. Add these roles:
   - **Document AI API User**
   - **Storage Object Viewer** (if using Cloud Storage)
7. Click **Done**

## Step 3: Create Service Account Key

1. Find your service account in the list
2. Click the email address
3. Go to **Keys** tab
4. Click **Add Key** > **Create New Key**
5. Choose **JSON** format
6. Download the key file
7. Move it to `./secrets/docbare-document-ai-key.json`

## Step 4: Create Document AI Processors

### Method 1: Using Google Cloud Console

1. Go to [Document AI Console](https://console.cloud.google.com/ai/document-ai)
2. Click **Create Processor**
3. Choose your location (e.g., `us`)

#### Create General Document Processor
1. **Processor Type**: `OCR Processor`
2. **Display Name**: `DocBare General Document Processor`
3. **Description**: `General document processing and OCR for legal documents`
4. Click **Create**
5. Copy the **Processor ID** (you'll need this for environment variables)

#### Create Legal Document Processor
1. **Processor Type**: `Form Parser Processor`
2. **Display Name**: `DocBare Legal Form Processor`
3. **Description**: `Form parsing for legal documents and structured forms`
4. Click **Create**
5. Copy the **Processor ID**

#### Create Layout Processor (Optional)
1. **Processor Type**: `Layout Parser Processor`
2. **Display Name**: `DocBare Layout Processor`
3. **Description**: `Layout parsing for complex legal document structures`
4. Click **Create**
5. Copy the **Processor ID**

### Method 2: Using REST API

You can also create processors programmatically using the REST API:

```bash
# Get access token
ACCESS_TOKEN=$(gcloud auth print-access-token)

# Create General Document Processor
curl -X POST \
  "https://documentai.googleapis.com/v1/projects/YOUR_PROJECT_ID/locations/us/processors" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "ocr-processor",
    "displayName": "DocBare General Document Processor",
    "description": "General document processing and OCR for legal documents"
  }'

# Create Legal Document Processor
curl -X POST \
  "https://documentai.googleapis.com/v1/projects/YOUR_PROJECT_ID/locations/us/processors" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "form-parser-processor",
    "displayName": "DocBare Legal Form Processor",
    "description": "Form parsing for legal documents and structured forms"
  }'
```

## Step 5: Environment Variables

Create a `.env` file in your project root with these variables:

```env
# Google Cloud Configuration
GOOGLE_CLOUD_PROJECT_ID=your-project-id
GOOGLE_APPLICATION_CREDENTIALS=./secrets/docbare-document-ai-key.json

# Document AI Configuration
DOCUMENT_AI_LOCATION=us
DOCUMENT_AI_GENERAL_PROCESSOR_ID=your-general-processor-id
DOCUMENT_AI_LEGAL_DOCUMENT_PROCESSOR_ID=your-legal-processor-id
DOCUMENT_AI_LAYOUT_PROCESSOR_ID=your-layout-processor-id

# Optional: Additional processors
# DOCUMENT_AI_OCR_PROCESSOR_ID=your-ocr-processor-id
# DOCUMENT_AI_FORM_PARSER_PROCESSOR_ID=your-form-processor-id
```

## Step 6: Test the Setup

Run the test script to verify everything is working:

```bash
npm run test:document-ai
```

Or manually test with a document:

```bash
curl -X POST http://localhost:3000/api/ingest \
  -F "file=@test-document.pdf" \
  -F "userId=test-user-id"
```

## Available Processor Types

Based on the Document AI Processor Gallery, here are the available processor types:

### General Processors
- **OCR Processor** (`ocr-processor`) - General document processing and text extraction
- **Form Parser Processor** (`form-parser-processor`) - Structured form data extraction
- **Layout Parser Processor** (`layout-parser-processor`) - Document layout and structure analysis

### Specialized Processors
- **Invoice Parser** (`invoice-parser-processor`) - Invoice data extraction
- **Expense Parser** (`expense-parser-processor`) - Receipt and expense data
- **Bank Statement Parser** (`bank-statement-parser-processor`) - Bank statement data
- **Identity Document Proofing** (`identity-document-proofing-processor`) - ID document validation
- **US Driver License Parser** (`us-driver-license-parser-processor`) - Driver license data
- **US Passport Parser** (`us-passport-parser-processor`) - Passport data
- **W2 Parser** (`w2-parser-processor`) - W2 form data
- **W9 Parser** (`w9-parser-processor`) - W9 form data
- **Utility Parser** (`utility-parser-processor`) - Utility bill data
- **Pay Slip Parser** (`pay-slip-parser-processor`) - Pay slip data
- **Lending Doc Splitter/Classifier** (`lending-doc-splitter-classifier-processor`) - Loan document processing
- **Procurement Doc Splitter** (`procurement-doc-splitter-processor`) - Procurement document processing

## Recommended Setup for DocBare

For a legal AI platform like DocBare, we recommend:

1. **General Document Processor** (OCR Processor) - For most legal documents
2. **Legal Document Processor** (Form Parser) - For legal forms and structured documents
3. **Layout Processor** (Layout Parser) - For complex legal document layouts

## Troubleshooting

### Common Issues

1. **"Processor not found" error**
   - Verify the processor ID is correct
   - Check that the processor exists in the specified location
   - Ensure the service account has access to the processor

2. **"Authentication failed" error**
   - Verify the service account key file path
   - Check that the service account has the correct permissions
   - Ensure the Document AI API is enabled

3. **"API not enabled" error**
   - Enable the Document AI API in Google Cloud Console
   - Wait a few minutes for the API to be fully activated

4. **"Quota exceeded" error**
   - Check your Document AI usage in Google Cloud Console
   - Request a quota increase if needed
   - Implement rate limiting in your application

### Testing Commands

```bash
# Test Document AI connection
npx ts-node --project tsconfig.scripts.json scripts/test-document-ai.ts

# Test with a real document
curl -X POST http://localhost:3000/api/ingest \
  -F "file=@test-document.pdf" \
  -F "userId=test-user-id"
```

## Cost Optimization

### Document AI Pricing (as of 2025)
- **OCR Processor**: $1.50 per 1,000 pages
- **Form Parser Processor**: $1.50 per 1,000 pages
- **Layout Parser Processor**: $1.50 per 1,000 pages
- **Specialized Processors**: $2.00 per 1,000 pages

### Tips for Cost Optimization
1. **Use appropriate processor types** for different document types
2. **Implement caching** for processed documents
3. **Batch processing** for multiple documents
4. **Monitor usage** with Google Cloud Console
5. **Set up billing alerts** to avoid unexpected charges

## Support

For issues with Document AI setup:
1. Check Google Cloud Console logs
2. Verify service account permissions
3. Test with the provided test script
4. Review Google Cloud documentation
5. Contact Google Cloud support if needed
