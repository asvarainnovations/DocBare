import { z } from 'zod';
import { NextRequest, NextResponse } from 'next/server';
import { apiLogger } from './logger';

// Enhanced input sanitization
export function sanitizeInput(input: string): string {
  if (typeof input !== 'string') return '';
  
  // Remove potentially dangerous HTML/script tags
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '')
    .replace(/<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .trim();
}

// Enhanced validation schemas
export const MessageSchema = z.object({
  content: z.string()
    .min(1, 'Message cannot be empty')
    .max(10000, 'Message too long (max 10,000 characters)')
    .transform(sanitizeInput),
  sessionId: z.string().uuid('Invalid session ID'),
  role: z.enum(['USER', 'ASSISTANT', 'SYSTEM']),
  documents: z.array(z.object({
    documentId: z.string().uuid(),
    fileName: z.string().max(255),
    firestoreId: z.string().optional()
  })).optional()
});

export const ChatSessionSchema = z.object({
  firstMessage: z.string()
    .min(1, 'First message cannot be empty')
    .max(5000, 'First message too long (max 5,000 characters)')
    .transform(sanitizeInput),
  userId: z.string().uuid('Invalid user ID'),
  documentContext: z.array(z.object({
    documentId: z.string().uuid(),
    fileName: z.string().max(255),
    firestoreId: z.string().optional()
  })).optional()
});

export const FileUploadSchema = z.object({
  userId: z.string().uuid('Invalid user ID'),
  file: z.instanceof(File, { message: 'File is required' })
    .refine((file) => file.size <= 50 * 1024 * 1024, 'File size must be less than 50MB')
    .refine((file) => {
      const allowedTypes = [
        'application/pdf',
        'text/plain',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'image/jpeg',
        'image/png',
        'image/gif'
      ];
      return allowedTypes.includes(file.type);
    }, 'File type not supported')
});

export const QuerySchema = z.object({
  query: z.string()
    .min(1, 'Query cannot be empty')
    .max(5000, 'Query too long (max 5,000 characters)')
    .transform(sanitizeInput),
  sessionId: z.string().uuid('Invalid session ID').optional(),
  userId: z.string().uuid('Invalid user ID')
});

export const FeedbackSchema = z.object({
  sessionId: z.string().uuid('Invalid session ID'),
  messageIndex: z.number().int().min(0).optional(),
  rating: z.enum(['good', 'bad']),
  comments: z.string()
    .max(1000, 'Comments too long (max 1,000 characters)')
    .transform(sanitizeInput)
    .optional()
});

export const UserProfileSchema = z.object({
  fullName: z.string()
    .max(100, 'Name too long (max 100 characters)')
    .transform(sanitizeInput)
    .optional(),
  gender: z.enum(['male', 'female', 'other', '']).optional()
});

export const PasswordChangeSchema = z.object({
  currentPassword: z.string().min(8, 'Current password must be at least 8 characters'),
  newPassword: z.string()
    .min(8, 'New password must be at least 8 characters')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain at least one lowercase letter, one uppercase letter, and one number')
});

// API request validation middleware
export function validateRequest<T extends z.ZodSchema>(
  schema: T,
  options: {
    body?: boolean;
    query?: boolean;
    params?: boolean;
  } = { body: true }
) {
  return async (request: NextRequest): Promise<{ data: z.infer<T>; error?: NextResponse }> => {
    try {
      let data: any = {};

      // Validate body
      if (options.body) {
        const contentType = request.headers.get('content-type') || '';
        
        if (contentType.includes('application/json')) {
          const body = await request.json();
          data = { ...data, ...body };
        } else if (contentType.includes('multipart/form-data')) {
          const formData = await request.formData();
          const formDataObj: any = {};
          for (const [key, value] of formData.entries()) {
            formDataObj[key] = value;
          }
          data = { ...data, ...formDataObj };
        }
      }

      // Validate query parameters
      if (options.query) {
        const { searchParams } = new URL(request.url);
        const query: any = {};
        for (const [key, value] of searchParams.entries()) {
          query[key] = value;
        }
        data = { ...data, ...query };
      }

      // Validate path parameters
      if (options.params) {
        const params = request.nextUrl.pathname.split('/').filter(Boolean);
        data = { ...data, ...params };
      }

      // Validate the data against the schema
      const validatedData = schema.parse(data);
      
      apiLogger.debug('Request validation successful', { 
        schema: schema.constructor.name,
        dataKeys: Object.keys(validatedData)
      });

      return { data: validatedData };
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errorMessage = error.errors.map(err => 
          `${err.path.join('.')}: ${err.message}`
        ).join(', ');
        
        apiLogger.warn('Request validation failed', { 
          errors: error.errors,
          message: errorMessage 
        });

        return {
          data: {} as z.infer<T>,
          error: NextResponse.json(
            { 
              error: 'Validation failed', 
              details: error.errors,
              message: errorMessage 
            },
            { status: 400 }
          )
        };
      }

      apiLogger.error('Unexpected validation error', error);
      return {
        data: {} as z.infer<T>,
        error: NextResponse.json(
          { error: 'Internal validation error' },
          { status: 500 }
        )
      };
    }
  };
}

// Utility functions for common validations
export const validateMessage = validateRequest(MessageSchema);
export const validateChatSession = validateRequest(ChatSessionSchema);
export const validateFileUpload = validateRequest(FileUploadSchema);
export const validateQuery = validateRequest(QuerySchema);
export const validateFeedback = validateRequest(FeedbackSchema);
export const validateUserProfile = validateRequest(UserProfileSchema);
export const validatePasswordChange = validateRequest(PasswordChangeSchema);

// CORS headers for API routes
export function addCorsHeaders(response: NextResponse): NextResponse {
  response.headers.set('Access-Control-Allow-Origin', process.env.NEXTAUTH_URL || 'http://localhost:3000');
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  response.headers.set('Access-Control-Allow-Credentials', 'true');
  return response;
}

// Security headers for API routes
export function addSecurityHeaders(response: NextResponse): NextResponse {
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:;");
  return response;
} 