/**
 * Environment Variable Validation
 * Validates required environment variables at build time and runtime
 */

interface EnvConfig {
  // Application
  NODE_ENV: string;
  NEXTAUTH_URL: string;
  NEXTAUTH_SECRET: string;
  
  // Database
  DATABASE_URL: string;
  
  // Google Cloud
  GOOGLE_CLOUD_PROJECT_ID: string;
  GOOGLE_CLOUD_STORAGE_BUCKET: string;
  VERTEX_AI_LOCATION: string;
  VERTEX_AI_PROJECT_ID: string;
  GOOGLE_DOCUMENT_AI_LOCATION: string;
  GOOGLE_DOCUMENT_AI_PROCESSOR_ID: string;
  
  // Firebase
  FIREBASE_PROJECT_ID: string;
  FIREBASE_PRIVATE_KEY_ID: string;
  FIREBASE_PRIVATE_KEY: string;
  FIREBASE_CLIENT_EMAIL: string;
  FIREBASE_CLIENT_ID: string;
  FIREBASE_AUTH_URI: string;
  FIREBASE_TOKEN_URI: string;
  FIREBASE_AUTH_PROVIDER_X509_CERT_URL: string;
  FIREBASE_CLIENT_X509_CERT_URL: string;
  
  // AI Services
  DEEPSEEK_API_KEY: string;
  DEEPSEEK_BASE_URL: string;
  OPENAI_API_KEY: string;
  
  // Authentication
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
}

interface OptionalEnvConfig {
  // Optional configurations
  GOOGLE_CLOUD_STORAGE_KEY_FILE?: string;
  GOOGLE_APPLICATION_CREDENTIALS?: string;
  RATE_LIMIT_MAX_REQUESTS?: string;
  RATE_LIMIT_WINDOW_MS?: string;
  CORS_ORIGIN?: string;
  LOG_LEVEL?: string;
  DEBUG_LOGGING?: string;
  ENABLE_ADMIN_PANEL?: string;
  ENABLE_USER_EXPORT?: string;
  ENABLE_FEEDBACK_SYSTEM?: string;
  ENABLE_DOCUMENT_ANALYSIS?: string;
  SKIP_AUTH_IN_DEV?: string;
  VERBOSE_LOGGING?: string;
  DATABASE_POOL_SIZE?: string;
  DATABASE_POOL_TIMEOUT?: string;
  REDIS_URL?: string;
  CDN_URL?: string;
  BACKUP_SCHEDULE?: string;
  BACKUP_RETENTION_DAYS?: string;
}

type FullEnvConfig = EnvConfig & OptionalEnvConfig;

/**
 * Required environment variables for production
 */
const REQUIRED_ENV_VARS: (keyof EnvConfig)[] = [
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

/**
 * Environment variables that can be missing in development
 */
const DEV_OPTIONAL_ENV_VARS: (keyof EnvConfig)[] = [
  'GOOGLE_DOCUMENT_AI_PROCESSOR_ID',
  'FIREBASE_PRIVATE_KEY',
  'FIREBASE_CLIENT_EMAIL',
  'FIREBASE_CLIENT_ID',
  'FIREBASE_AUTH_URI',
  'FIREBASE_TOKEN_URI',
  'FIREBASE_AUTH_PROVIDER_X509_CERT_URL',
  'FIREBASE_CLIENT_X509_CERT_URL'
];

/**
 * Validates environment variables
 */
export function validateEnvironment(): FullEnvConfig {
  const missingVars: string[] = [];
  const warnings: string[] = [];
  
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
  
  // Report missing variables
  if (missingVars.length > 0) {
    const errorMessage = `Missing required environment variables: ${missingVars.join(', ')}`;
    console.error('🚨 [ENV_VALIDATION][ERROR]', errorMessage);
    
    if (process.env.NODE_ENV === 'production') {
      throw new Error(errorMessage);
    } else {
      console.warn('⚠️ [ENV_VALIDATION][WARNING]', errorMessage);
      console.warn('⚠️ [ENV_VALIDATION][WARNING]', 'Some features may not work properly in development');
    }
  }
  
  // Report warnings
  if (warnings.length > 0) {
    console.warn('⚠️ [ENV_VALIDATION][WARNING]', warnings.join(', '));
  }
  
  // Validate specific formats
  validateSpecificFormats();
  
  console.log('✅ [ENV_VALIDATION][SUCCESS] Environment validation completed');
  
  return process.env as unknown as FullEnvConfig;
}

/**
 * Validates specific environment variable formats
 */
function validateSpecificFormats(): void {
  const warnings: string[] = [];
  
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
  
  if (warnings.length > 0) {
    console.warn('⚠️ [ENV_VALIDATION][FORMAT_WARNING]', warnings.join(', '));
  }
}

/**
 * Gets environment configuration with type safety
 */
export function getEnvConfig(): FullEnvConfig {
  return process.env as unknown as FullEnvConfig;
}

/**
 * Checks if we're in production
 */
export function isProduction(): boolean {
  return process.env.NODE_ENV === 'production';
}

/**
 * Checks if we're in development
 */
export function isDevelopment(): boolean {
  return process.env.NODE_ENV === 'development';
}

/**
 * Gets a required environment variable with error handling
 */
export function getRequiredEnv(key: keyof EnvConfig): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Required environment variable ${key} is not set`);
  }
  return value;
}

/**
 * Gets an optional environment variable with default value
 */
export function getOptionalEnv(key: keyof OptionalEnvConfig, defaultValue: string = ''): string {
  return process.env[key] || defaultValue;
}

/**
 * Gets a boolean environment variable
 */
export function getBooleanEnv(key: keyof OptionalEnvConfig, defaultValue: boolean = false): boolean {
  const value = process.env[key];
  if (!value) return defaultValue;
  return value.toLowerCase() === 'true';
}

/**
 * Gets a number environment variable
 */
export function getNumberEnv(key: keyof OptionalEnvConfig, defaultValue: number = 0): number {
  const value = process.env[key];
  if (!value) return defaultValue;
  const parsed = Number(value);
  return isNaN(parsed) ? defaultValue : parsed;
}

// Validate environment on module load (only in production or when explicitly requested)
// Skip validation during build phase to prevent build failures
if ((process.env.NODE_ENV === 'production' || process.env.VALIDATE_ENV === 'true') && 
    process.env.NEXT_PHASE !== 'phase-production-build') {
  validateEnvironment();
}
