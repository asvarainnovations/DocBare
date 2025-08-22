import { z } from 'zod';

// Environment variable schema
const envSchema = z.object({
  // Database
  DATABASE_URL: z.string().url('Invalid DATABASE_URL'),
  
  // Authentication
  NEXTAUTH_SECRET: z.string().min(32, 'NEXTAUTH_SECRET must be at least 32 characters'),
  NEXTAUTH_URL: z.string().url('Invalid NEXTAUTH_URL'),
  GOOGLE_CLIENT_ID: z.string().min(1, 'GOOGLE_CLIENT_ID is required'),
  GOOGLE_CLIENT_SECRET: z.string().min(1, 'GOOGLE_CLIENT_SECRET is required'),
  
  // AI Services
  DEEPSEEK_API_KEY: z.string().min(1, 'DEEPSEEK_API_KEY is required'),
  OPENAI_API_KEY: z.string().min(1, 'OPENAI_API_KEY is required'),
  OPENAI_EMBEDDING_MODEL: z.string().default('text-embedding-3-small'),
  
  // Google Cloud
  FIRESTORE_PROJECT_ID: z.string().min(1, 'FIRESTORE_PROJECT_ID is required'),
  GCS_BUCKET_NAME: z.string().min(1, 'GCS_BUCKET_NAME is required'),
  GOOGLE_CLOUD_KEY_FILE: z.string().optional(),
  GOOGLE_CLOUD_PROJECT_ID: z.string().optional(),
  
  // Document AI
  DOCUMENT_AI_LOCATION: z.string().default('us'),
  DOCUMENT_AI_GENERAL_PROCESSOR_ID: z.string().optional(),
  DOCUMENT_AI_LEGAL_PROCESSOR_ID: z.string().optional(),
  DOCUMENT_AI_FORM_PROCESSOR_ID: z.string().optional(),
  DOCUMENT_AI_OCR_PROCESSOR_ID: z.string().optional(),
  
  // Vertex AI
  VERTEX_AI_LOCATION: z.string().default('us-central1'),
  VERTEX_AI_INDEX_ENDPOINT: z.string().optional(),
  VERTEX_AI_DEPLOYED_INDEX_ID: z.string().optional(),
  VERTEX_AI_PUBLIC_DOMAIN: z.string().optional(),
  
  // Application
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().transform(Number).pipe(z.number().positive()).default('3000'),
  
  // Optional features
  USE_MULTI_AGENT: z.string().transform(val => val === 'true').default('false'),
  DEBUG: z.string().transform(val => val === 'true').default('false'),
});

// Validate environment variables
function validateEnv() {
  try {
    const env = envSchema.parse(process.env);
    
    // Additional validation for production
    if (env.NODE_ENV === 'production') {
      if (!env.GOOGLE_CLOUD_PROJECT_ID) {
        throw new Error('GOOGLE_CLOUD_PROJECT_ID is required in production');
      }
      
      if (!env.GOOGLE_CLOUD_KEY_FILE) {
        console.warn('⚠️ GOOGLE_CLOUD_KEY_FILE not set - using Application Default Credentials');
      }
    }
    
    return env;
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingVars = error.errors.map(err => err.path.join('.')).join(', ');
      throw new Error(`Missing or invalid environment variables: ${missingVars}`);
    }
    throw error;
  }
}

// Export validated environment variables
export const env = validateEnv();

// Environment variable getters with defaults
export const getEnvVar = {
  // Database
  databaseUrl: () => env.DATABASE_URL,
  
  // Authentication
  nextAuthSecret: () => env.NEXTAUTH_SECRET,
  nextAuthUrl: () => env.NEXTAUTH_URL,
  googleClientId: () => env.GOOGLE_CLIENT_ID,
  googleClientSecret: () => env.GOOGLE_CLIENT_SECRET,
  
  // AI Services
  deepseekApiKey: () => env.DEEPSEEK_API_KEY,
  openaiApiKey: () => env.OPENAI_API_KEY,
  openaiEmbeddingModel: () => env.OPENAI_EMBEDDING_MODEL,
  
  // Google Cloud
  firestoreProjectId: () => env.FIRESTORE_PROJECT_ID,
  gcsBucketName: () => env.GCS_BUCKET_NAME,
  googleCloudKeyFile: () => env.GOOGLE_CLOUD_KEY_FILE,
  googleCloudProjectId: () => env.GOOGLE_CLOUD_PROJECT_ID || env.FIRESTORE_PROJECT_ID,
  
  // Document AI
  documentAiLocation: () => env.DOCUMENT_AI_LOCATION,
  documentAiGeneralProcessorId: () => env.DOCUMENT_AI_GENERAL_PROCESSOR_ID,
  documentAiLegalProcessorId: () => env.DOCUMENT_AI_LEGAL_PROCESSOR_ID,
  documentAiFormProcessorId: () => env.DOCUMENT_AI_FORM_PROCESSOR_ID,
  documentAiOcrProcessorId: () => env.DOCUMENT_AI_OCR_PROCESSOR_ID,
  
  // Vertex AI
  vertexAiLocation: () => env.VERTEX_AI_LOCATION,
  vertexAiIndexEndpoint: () => env.VERTEX_AI_INDEX_ENDPOINT,
  vertexAiDeployedIndexId: () => env.VERTEX_AI_DEPLOYED_INDEX_ID,
  vertexAiPublicDomain: () => env.VERTEX_AI_PUBLIC_DOMAIN,
  
  // Application
  nodeEnv: () => env.NODE_ENV,
  port: () => env.PORT,
  isProduction: () => env.NODE_ENV === 'production',
  isDevelopment: () => env.NODE_ENV === 'development',
  isTest: () => env.NODE_ENV === 'test',
  
  // Features
  useMultiAgent: () => env.USE_MULTI_AGENT,
  debug: () => env.DEBUG,
};

// Environment validation status
export function getEnvStatus() {
  const status = {
    database: !!env.DATABASE_URL,
    authentication: !!(env.NEXTAUTH_SECRET && env.NEXTAUTH_URL && env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET),
    aiServices: !!(env.DEEPSEEK_API_KEY && env.OPENAI_API_KEY),
    googleCloud: !!(env.FIRESTORE_PROJECT_ID && env.GCS_BUCKET_NAME),
    documentAi: !!(env.DOCUMENT_AI_LOCATION),
    vertexAi: !!(env.VERTEX_AI_LOCATION),
    production: env.NODE_ENV === 'production',
  };

  return {
    ...status,
    allRequired: Object.values(status).every(Boolean),
    missing: Object.entries(status)
      .filter(([_, value]) => !value)
      .map(([key]) => key)
  };
}

// Log environment status (only in development)
if (env.NODE_ENV === 'development') {
  const status = getEnvStatus();
  console.log('🔧 Environment Status:', status);
  
  if (!status.allRequired) {
    console.warn('⚠️ Missing environment variables:', status.missing);
  }
}
