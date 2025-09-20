#!/usr/bin/env node

/**
 * Build-time Environment Validation Script
 * Validates environment variables before build process
 */

const fs = require('fs');
const path = require('path');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m'
};

function log(message, color = 'white') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logWarning(message) {
  log(`⚠️ ${message}`, 'yellow');
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logInfo(message) {
  log(`ℹ️ ${message}`, 'blue');
}

// Required environment variables for production build
const REQUIRED_ENV_VARS = [
  'NODE_ENV',
  'NEXTAUTH_URL',
  'NEXTAUTH_SECRET',
  'DATABASE_URL',
  'GOOGLE_CLOUD_PROJECT_ID',
  'GOOGLE_CLOUD_STORAGE_BUCKET',
  'VERTEX_AI_LOCATION',
  'VERTEX_AI_PROJECT_ID',
  'GOOGLE_DOCUMENT_AI_LOCATION',
  'GOOGLE_DOCUMENT_AI_PROCESSOR_ID',
  'FIREBASE_PROJECT_ID',
  'FIREBASE_PRIVATE_KEY_ID',
  'FIREBASE_PRIVATE_KEY',
  'FIREBASE_CLIENT_EMAIL',
  'FIREBASE_CLIENT_ID',
  'FIREBASE_AUTH_URI',
  'FIREBASE_TOKEN_URI',
  'FIREBASE_AUTH_PROVIDER_X509_CERT_URL',
  'FIREBASE_CLIENT_X509_CERT_URL',
  'DEEPSEEK_API_KEY',
  'DEEPSEEK_BASE_URL',
  'OPENAI_API_KEY',
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET'
];

// Environment variables that can be missing in development
const DEV_OPTIONAL_ENV_VARS = [
  'GOOGLE_DOCUMENT_AI_PROCESSOR_ID',
  'FIREBASE_PRIVATE_KEY',
  'FIREBASE_CLIENT_EMAIL',
  'FIREBASE_CLIENT_ID',
  'FIREBASE_AUTH_URI',
  'FIREBASE_TOKEN_URI',
  'FIREBASE_AUTH_PROVIDER_X509_CERT_URL',
  'FIREBASE_CLIENT_X509_CERT_URL'
];

function validateEnvironment() {
  logInfo('Starting environment validation...');
  
  const missingVars = [];
  const warnings = [];
  const errors = [];
  
  // Check if .env.local exists
  const envLocalPath = path.join(process.cwd(), '.env.local');
  const envExamplePath = path.join(process.cwd(), '.env.example');
  
  if (!fs.existsSync(envLocalPath)) {
    if (fs.existsSync(envExamplePath)) {
      logWarning('.env.local not found, but .env.example exists');
      logInfo('Please copy .env.example to .env.local and fill in your values');
    } else {
      logError('.env.local not found and no .env.example available');
      errors.push('Missing .env.local file');
    }
  }
  
  // Check required variables
  for (const varName of REQUIRED_ENV_VARS) {
    const value = process.env[varName];
    
    if (!value || value.trim() === '') {
      // In development, some variables are optional
      if (process.env.NODE_ENV === 'development' && DEV_OPTIONAL_ENV_VARS.includes(varName)) {
        warnings.push(`Optional in development: ${varName}`);
        continue;
      }
      
      missingVars.push(varName);
    }
  }
  
  // Validate specific formats
  validateSpecificFormats(errors, warnings);
  
  // Report results
  if (errors.length > 0) {
    logError('Environment validation failed with errors:');
    errors.forEach(error => logError(`  - ${error}`));
  }
  
  if (missingVars.length > 0) {
    logError('Missing required environment variables:');
    missingVars.forEach(varName => logError(`  - ${varName}`));
  }
  
  if (warnings.length > 0) {
    logWarning('Environment validation warnings:');
    warnings.forEach(warning => logWarning(`  - ${warning}`));
  }
  
  if (errors.length === 0 && missingVars.length === 0) {
    logSuccess('Environment validation passed!');
    return true;
  } else if (process.env.NODE_ENV === 'development') {
    logWarning('Environment validation completed with issues, but continuing in development mode');
    return true;
  } else {
    logError('Environment validation failed!');
    return false;
  }
}

function validateSpecificFormats(errors, warnings) {
  // Validate DATABASE_URL format
  const databaseUrl = process.env.DATABASE_URL;
  if (databaseUrl && !databaseUrl.startsWith('postgresql://')) {
    warnings.push('DATABASE_URL should start with "postgresql://"');
  }
  
  // Validate NEXTAUTH_URL format
  const nextAuthUrl = process.env.NEXTAUTH_URL;
  if (nextAuthUrl && !nextAuthUrl.startsWith('http')) {
    warnings.push('NEXTAUTH_URL should start with "http://" or "https://"');
  }
  
  // Validate Firebase private key format
  const firebasePrivateKey = process.env.FIREBASE_PRIVATE_KEY;
  if (firebasePrivateKey && !firebasePrivateKey.includes('BEGIN PRIVATE KEY')) {
    warnings.push('FIREBASE_PRIVATE_KEY should be a valid PEM format private key');
  }
  
  // Validate numeric values
  const rateLimitMax = process.env.RATE_LIMIT_MAX_REQUESTS;
  if (rateLimitMax && isNaN(Number(rateLimitMax))) {
    warnings.push('RATE_LIMIT_MAX_REQUESTS should be a number');
  }
  
  const rateLimitWindow = process.env.RATE_LIMIT_WINDOW_MS;
  if (rateLimitWindow && isNaN(Number(rateLimitWindow))) {
    warnings.push('RATE_LIMIT_WINDOW_MS should be a number');
  }
  
  // Validate API URLs
  const deepseekBaseUrl = process.env.DEEPSEEK_BASE_URL;
  if (deepseekBaseUrl && !deepseekBaseUrl.startsWith('https://')) {
    warnings.push('DEEPSEEK_BASE_URL should start with "https://"');
  }
}

function generateEnvExample() {
  const envExampleContent = `# ===========================================
# DOCBARE - ENVIRONMENT CONFIGURATION
# ===========================================
# Copy this file to .env.local and fill in your actual values
# Never commit .env.local to version control

# ===========================================
# APPLICATION SETTINGS
# ===========================================
NODE_ENV=development
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-nextauth-secret-key-here

# ===========================================
# DATABASE CONFIGURATION
# ===========================================
# PostgreSQL Database URL (Prisma)
DATABASE_URL="postgresql://username:password@localhost:5432/docbare_db"

# ===========================================
# GOOGLE CLOUD SERVICES
# ===========================================
# Google Cloud Project ID
GOOGLE_CLOUD_PROJECT_ID=your-gcp-project-id

# Google Cloud Storage
GOOGLE_CLOUD_STORAGE_BUCKET=your-gcs-bucket-name
GOOGLE_CLOUD_STORAGE_KEY_FILE=path/to/your/service-account-key.json

# Vertex AI Configuration
VERTEX_AI_LOCATION=us-central1
VERTEX_AI_PROJECT_ID=your-gcp-project-id

# Google Document AI
GOOGLE_DOCUMENT_AI_LOCATION=us
GOOGLE_DOCUMENT_AI_PROCESSOR_ID=your-processor-id

# ===========================================
# FIREBASE/FIRESTORE CONFIGURATION
# ===========================================
# Firebase Project Configuration
FIREBASE_PROJECT_ID=your-firebase-project-id
FIREBASE_PRIVATE_KEY_ID=your-private-key-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\\nYour-Private-Key-Here\\n-----END PRIVATE KEY-----\\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
FIREBASE_CLIENT_ID=your-client-id
FIREBASE_AUTH_URI=https://accounts.google.com/o/oauth2/auth
FIREBASE_TOKEN_URI=https://oauth2.googleapis.com/token
FIREBASE_AUTH_PROVIDER_X509_CERT_URL=https://www.googleapis.com/oauth2/v1/certs
FIREBASE_CLIENT_X509_CERT_URL=https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-xxxxx%40your-project.iam.gserviceaccount.com

# ===========================================
# AI/LLM SERVICES
# ===========================================
# DeepSeek API Configuration
DEEPSEEK_API_KEY=your-deepseek-api-key-here
DEEPSEEK_BASE_URL=https://api.deepseek.com

# OpenAI API Configuration (for embeddings)
OPENAI_API_KEY=your-openai-api-key-here

# ===========================================
# AUTHENTICATION PROVIDERS
# ===========================================
# Google OAuth (for NextAuth.js)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# ===========================================
# RATE LIMITING & SECURITY
# ===========================================
# Rate limiting configuration
RATE_LIMIT_MAX_REQUESTS=100
RATE_LIMIT_WINDOW_MS=900000

# CORS configuration
CORS_ORIGIN=http://localhost:3000

# ===========================================
# LOGGING & MONITORING
# ===========================================
# Log level (error, warn, info, debug)
LOG_LEVEL=info

# Enable/disable debug logging
DEBUG_LOGGING=false

# ===========================================
# FEATURE FLAGS
# ===========================================
# Enable/disable specific features
ENABLE_ADMIN_PANEL=true
ENABLE_USER_EXPORT=true
ENABLE_FEEDBACK_SYSTEM=true
ENABLE_DOCUMENT_ANALYSIS=true

# ===========================================
# DEVELOPMENT SETTINGS
# ===========================================
# Skip authentication in development
SKIP_AUTH_IN_DEV=false

# Enable verbose logging in development
VERBOSE_LOGGING=true

# ===========================================
# NOTES
# ===========================================
# 1. Replace all placeholder values with your actual configuration
# 2. Ensure all sensitive values are kept secure and not committed to version control
# 3. Test your configuration in a development environment before deploying to production
# 4. Consider using environment-specific configuration files for different deployment stages
# 5. Regularly rotate API keys and secrets for security
`;

  const envExamplePath = path.join(process.cwd(), '.env.example');
  
  if (!fs.existsSync(envExamplePath)) {
    try {
      fs.writeFileSync(envExamplePath, envExampleContent);
      logSuccess('Created .env.example file');
    } catch (error) {
      logError(`Failed to create .env.example: ${error.message}`);
    }
  } else {
    logInfo('.env.example already exists');
  }
}

// Main execution
function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--generate-example')) {
    generateEnvExample();
    return;
  }
  
  if (args.includes('--help')) {
    logInfo('Environment Validation Script');
    logInfo('Usage: node scripts/validate-env.js [options]');
    logInfo('Options:');
    logInfo('  --generate-example  Generate .env.example file');
    logInfo('  --help             Show this help message');
    return;
  }
  
  const isValid = validateEnvironment();
  
  if (!isValid && process.env.NODE_ENV === 'production') {
    process.exit(1);
  }
}

// Run the script
main();
