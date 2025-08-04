# Upload Functionality Setup Guide

## Issue Identified

The document upload feature is not working because required environment variables are missing.

## Required Environment Variables

Create a `.env.local` file in your project root with the following variables:

```bash
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/docbare"

# Google Cloud Storage
GCS_BUCKET_NAME="your-gcs-bucket-name"
FIRESTORE_PROJECT_ID="utopian-pride-462008-j4"
GOOGLE_CLOUD_KEY_FILE="./secrets/service-account-key.json"

# NextAuth
NEXTAUTH_SECRET="your-nextauth-secret"
NEXTAUTH_URL="http://localhost:3000"

# DeepSeek API
DEEPSEEK_API_KEY="your-deepseek-api-key"

# OpenAI (for embeddings)
OPENAI_API_KEY="your-openai-api-key"
```

## Steps to Fix Upload

### 1. Set Up Google Cloud Storage

1. **Create a GCS Bucket:**
   - Go to [Google Cloud Console](https://console.cloud.google.com/storage)
   - Create a new bucket or use existing one
   - Note the bucket name for `GCS_BUCKET_NAME`

2. **Verify Service Account:**
   - Ensure `secrets/service-account-key.json` exists
   - Verify it has Storage Admin permissions

### 2. Set Up Database

1. **PostgreSQL Database:**
   - Ensure PostgreSQL is running
   - Create database if needed
   - Update `DATABASE_URL` with correct credentials

### 3. Test Upload Functionality

After setting up environment variables:

```bash
# Test configuration
node scripts/test-upload.js

# Start development server
npm run dev
```

## Current Status

- ✅ Service account file exists
- ✅ Firebase Admin can be initialized  
- ✅ Database connection works
- ✅ Document model is accessible
- ❌ Missing environment variables

## Troubleshooting

### Common Issues:

1. **"GCS_BUCKET_NAME not set"**
   - Set the correct bucket name in `.env.local`

2. **"Database connection failed"**
   - Check `DATABASE_URL` format
   - Ensure PostgreSQL is running

3. **"Service account not found"**
   - Verify `secrets/service-account-key.json` exists
   - Check file permissions

### Testing Upload:

1. Start the development server
2. Try uploading a file from the home page
3. Check browser console for errors
4. Check server logs for detailed error messages 