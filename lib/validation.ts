import { z } from 'zod';
import { NextRequest, NextResponse } from 'next/server';
import { apiLogger } from './logger';

// Base schemas
export const UserSchema = z.object({
  id: z.string().min(1, 'User ID is required'),
  email: z.string().email('Invalid email format'),
  name: z.string().optional(),
});

export const MessageSchema = z.object({
  sessionId: z.string().min(1, 'Session ID is required'),
  userId: z.string().min(1, 'User ID is required'),
  role: z.enum(['USER', 'ASSISTANT', 'SYSTEM'], {
    errorMap: () => ({ message: 'Role must be USER, ASSISTANT, or SYSTEM' })
  }),
  content: z.string().min(1, 'Message content is required').max(10000, 'Message too long'),
  createdAt: z.date().optional(),
});

export const ChatSessionSchema = z.object({
  id: z.string().min(1, 'Session ID is required'),
  userId: z.string().min(1, 'User ID is required'),
  title: z.string().min(1, 'Title is required').max(200, 'Title too long'),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

export const FeedbackSchema = z.object({
  sessionId: z.string().min(1, 'Session ID is required'),
  userId: z.string().min(1, 'User ID is required'),
  messageId: z.string().min(1, 'Message ID is required'),
  rating: z.enum(['good', 'bad'], {
    errorMap: () => ({ message: 'Rating must be good or bad' })
  }),
  comment: z.string().max(1000, 'Comment too long').optional(),
  createdAt: z.date().optional(),
});

export const QuerySchema = z.object({
  query: z.string().min(1, 'Query is required').max(5000, 'Query too long'),
  sessionId: z.string().min(1, 'Session ID is required'),
  userId: z.string().min(1, 'User ID is required'),
});

export const DocumentUploadSchema = z.object({
  file: z.instanceof(File, { message: 'File is required' }),
  userId: z.string().min(1, 'User ID is required'),
  sessionId: z.string().optional(),
});

export const CreateChatSessionSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  title: z.string().optional(),
  initialMessage: z.string().min(1, 'Initial message is required').max(5000, 'Message too long'),
});

export const UpdateChatSessionSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title too long'),
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

      // Validate request body
      if (options.body) {
        const contentType = request.headers.get('content-type');
        if (contentType?.includes('application/json')) {
          const body = await request.json();
          data = { ...data, ...body };
        } else if (contentType?.includes('multipart/form-data')) {
          const formData = await request.formData();
          const body: any = {};
          for (const [key, value] of formData.entries()) {
            body[key] = value;
          }
          data = { ...data, ...body };
        }
      }

      // Validate query parameters
      if (options.query) {
        const url = new URL(request.url);
        const queryParams: any = {};
        url.searchParams.forEach((value, key) => {
          queryParams[key] = value;
        });
        data = { ...data, ...queryParams };
      }

      // Validate URL parameters (for dynamic routes)
      if (options.params) {
        const url = new URL(request.url);
        const pathParts = url.pathname.split('/');
        // Extract dynamic parameters based on route pattern
        // This is a simplified version - you might need to adjust based on your route structure
        const params: any = {};
        if (pathParts.includes('c') && pathParts.length > 2) {
          params.chatId = pathParts[pathParts.indexOf('c') + 1];
        }
        if (pathParts.includes('sessions') && pathParts.length > 2) {
          params.sessionId = pathParts[pathParts.indexOf('sessions') + 1];
        }
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
export const validateFeedback = validateRequest(FeedbackSchema);
export const validateQuery = validateRequest(QuerySchema);
export const validateDocumentUpload = validateRequest(DocumentUploadSchema);
export const validateCreateChatSession = validateRequest(CreateChatSessionSchema);
export const validateUpdateChatSession = validateRequest(UpdateChatSessionSchema);

// Sanitization helpers
export function sanitizeString(input: string): string {
  return input.trim().replace(/\s+/g, ' ');
}

export function sanitizeEmail(email: string): string {
  return email.toLowerCase().trim();
}

export function validateFileType(file: File, allowedTypes: string[]): boolean {
  return allowedTypes.includes(file.type);
}

export function validateFileSize(file: File, maxSizeMB: number): boolean {
  return file.size <= maxSizeMB * 1024 * 1024;
}

// Rate limiting validation
export const RateLimitSchema = z.object({
  identifier: z.string().min(1, 'Identifier is required'),
  limit: z.number().min(1, 'Limit must be at least 1'),
  windowMs: z.number().min(1000, 'Window must be at least 1 second'),
});

// Export types for use in other files
export type Message = z.infer<typeof MessageSchema>;
export type ChatSession = z.infer<typeof ChatSessionSchema>;
export type Feedback = z.infer<typeof FeedbackSchema>;
export type Query = z.infer<typeof QuerySchema>;
export type DocumentUpload = z.infer<typeof DocumentUploadSchema>;
export type CreateChatSession = z.infer<typeof CreateChatSessionSchema>;
export type UpdateChatSession = z.infer<typeof UpdateChatSessionSchema>; 