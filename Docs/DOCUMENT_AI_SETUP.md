# Google Document AI Setup Guide

This guide will help you set up Google Document AI for the DocBare application.

## Prerequisites

1. **Google Cloud Project**: You need a Google Cloud project with billing enabled
2. **Service Account**: A service account with Document AI permissions
3. **Document AI API**: The Document AI API must be enabled

## Step 1: Enable Document AI API

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project
3. Navigate to **APIs & Services** > **Library**
4. Search for "Document AI API"
5. Click on it and press **Enable**

## Step 2: Create Processors

You need to create at least one processor in the Google Cloud Console:

### Layout Parser Processor (Recommended for general documents)

1. Go to **Document AI** in the Google Cloud Console
2. Click **Create Processor**
3. Select **Document OCR** > **Layout Parser**
4. Choose your location (e.g., "us" or "eu")
5. Give it a name like "docbare-layout-parser"
6. Click **Create**
7. **Copy the Processor ID** (it's a long hexadecimal string)

### Form Parser Processor (Optional, for forms)

1. Go to **Document AI** in the Google Cloud Console
2. Click **Create Processor**
3. Select **Form Parser**
4. Choose your location
5. Give it a name like "docbare-form-parser"
6. Click **Create**
7. **Copy the Processor ID**

### OCR Processor (Optional, for scanned documents)

1. Go to **Document AI** in the Google Cloud Console
2. Click **Create Processor**
3. Select **Document OCR** > **OCR Processor**
4. Choose your location
5. Give it a name like "docbare-ocr-processor"
6. Click **Create**
7. **Copy the Processor ID**

## Step 3: Configure Environment Variables

Add these environment variables to your `.env.local` file:

```env
# Document AI Configuration
DOCUMENT_AI_LOCATION=us  # or 'eu' for European region
DOCUMENT_AI_LAYOUT_PROCESSOR_ID=your_layout_processor_id_here
DOCUMENT_AI_FORM_PARSER_PROCESSOR_ID=your_form_processor_id_here
DOCUMENT_AI_OCR_PROCESSOR_ID=your_ocr_processor_id_here

# Make sure these are also set (should already be configured)
FIRESTORE_PROJECT_ID=your_project_id
GOOGLE_CLOUD_KEY_FILE=path/to/your/service-account-key.json
```

## Step 4: Test the Setup

Run the Document AI test script:

```bash
npm run test:document-ai
```

This will verify that:
- Your service account has proper permissions
- The processors exist and are accessible
- The API is working correctly

## Step 5: Verify Permissions

Your service account needs these roles:
- **Document AI API User**
- **Document AI Processor User**
- **Storage Object Viewer** (for GCS access)

## Troubleshooting

### Common Issues

1. **"Processor not found" error**
   - Verify the processor ID is correct
   - Ensure the processor is in the same location as specified in `DOCUMENT_AI_LOCATION`
   - Check that the processor is active

2. **"Permission denied" error**
   - Verify your service account has the required roles
   - Check that the Document AI API is enabled
   - Ensure your service account key file is correct

3. **"API not enabled" error**
   - Enable the Document AI API in Google Cloud Console
   - Wait a few minutes for the API to be fully activated

### Testing Individual Processors

You can test each processor individually:

```bash
# Test layout parser
curl -X POST "https://us-documentai.googleapis.com/v1/projects/YOUR_PROJECT/locations/us/processors/YOUR_PROCESSOR_ID:process" \
  -H "Authorization: Bearer $(gcloud auth print-access-token)" \
  -H "Content-Type: application/json" \
  -d '{
    "rawDocument": {
      "content": "base64_encoded_pdf_content",
      "mimeType": "application/pdf"
    }
  }'
```

## Pricing

Document AI pricing is based on:
- **Pages processed**: $1.50 per 1,000 pages
- **API calls**: $0.60 per 1,000 API calls

For development and testing, you can use the free tier which includes:
- 1,000 pages per month
- 1,000 API calls per month

## Best Practices

1. **Use Layout Parser for most documents**: It's the most versatile processor
2. **Use Form Parser for structured forms**: Better for extracting form fields
3. **Use OCR Processor for scanned documents**: Best for image-based PDFs
4. **Test with sample documents**: Always test with your actual document types
5. **Monitor usage**: Keep track of your API usage to avoid unexpected charges

## Support

If you encounter issues:
1. Check the [Google Document AI documentation](https://cloud.google.com/document-ai/docs)
2. Review the [API reference](https://cloud.google.com/document-ai/docs/reference/rest)
3. Check the [troubleshooting guide](https://cloud.google.com/document-ai/docs/troubleshooting)
