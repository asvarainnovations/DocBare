import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import firestore from '@/lib/firestore';
import { v4 as uuidv4 } from 'uuid';
import { uploadFile } from '@/lib/gcs';
import { validateFileUpload, addCorsHeaders, addSecurityHeaders } from '@/lib/validation';
import { apiLogger } from '@/lib/logger';

export const runtime = 'nodejs';

// File upload security configuration
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const ALLOWED_FILE_TYPES = [
  'application/pdf',
  'text/plain',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/jpeg',
  'image/png',
  'image/gif'
];

// Enhanced file validation
function validateFile(file: File): { valid: boolean; error?: string } {
  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    return { valid: false, error: `File size must be less than ${MAX_FILE_SIZE / (1024 * 1024)}MB` };
  }

  // Check file type
  if (!ALLOWED_FILE_TYPES.includes(file.type)) {
    return { valid: false, error: 'File type not supported. Please upload PDF, Word, or image files.' };
  }

  // Check file name
  if (!file.name || file.name.length > 255) {
    return { valid: false, error: 'Invalid file name' };
  }

  // Check for potentially dangerous file extensions
  const dangerousExtensions = ['.exe', '.bat', '.cmd', '.com', '.pif', '.scr', '.vbs', '.js'];
  const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
  if (dangerousExtensions.includes(fileExtension)) {
    return { valid: false, error: 'File type not allowed for security reasons' };
  }

  return { valid: true };
}

export async function POST(req: NextRequest) {
  try {
    // Add CORS and security headers
    const response = new NextResponse();
    addCorsHeaders(response);
    addSecurityHeaders(response);

    const formData = await req.formData();
    const userId = formData.get('userId') as string;
    
    // Support both single and multiple file uploads
    const files = formData.getAll('files');
    let singleFile = formData.get('file');

    // Validate user ID
    if (!userId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId)) {
      apiLogger.warn('Invalid user ID provided for file upload', { userId });
      return NextResponse.json(
        { error: 'Invalid user ID' }, 
        { status: 400 }
      );
    }

    if (!files.length && !singleFile) {
      return NextResponse.json(
        { error: 'No files provided' }, 
        { status: 400 }
      );
    }

    // Security check: Limit number of files per prompt
    const totalFiles = files.length || (singleFile ? 1 : 0);
    if (totalFiles > 10) {
      return NextResponse.json(
        { error: `Too many files: ${totalFiles} files provided. Maximum allowed: 10 files per prompt.` }, 
        { status: 400 }
      );
    }

    // Normalize to array of File
    let fileList: File[] = [];
    if (files.length) {
      fileList = files.filter(f => f instanceof File) as File[];
    } else if (singleFile && singleFile instanceof File) {
      fileList = [singleFile];
    }

    // Validate all files before processing
    for (const file of fileList) {
      const validation = validateFile(file);
      if (!validation.valid) {
        apiLogger.warn('File validation failed', { 
          fileName: file.name, 
          fileSize: file.size, 
          fileType: file.type,
          error: validation.error 
        });
        return NextResponse.json(
          { error: validation.error }, 
          { status: 400 }
        );
      }
    }

    apiLogger.info('File upload request received', {
      userId,
      fileCount: fileList.length,
      fileNames: fileList.map(f => f.name)
    });

    const results = [];
    
    for (const file of fileList) {
      try {
        const fileExt = file.name.split('.').pop();
        const fileName = `${uuidv4()}.${fileExt}`;
        
        // Upload to Google Cloud Storage
        const { url, error: gcsError } = await uploadFile(fileName, file);
        
        if (gcsError || !url) {
          apiLogger.error('GCS upload failed', { 
            fileName: file.name, 
            error: gcsError 
          });
          results.push({ 
            name: file.name, 
            status: 'error', 
            error: gcsError?.message || 'Upload failed' 
          });
          continue;
        }

        // Store in Postgres
        const doc = await prisma.document.create({
          data: {
            userId,
            fileName,
            path: fileName, // Store just the fileName, not the full URL
            originalName: file.name,
            mimeType: file.type,
          },
        });

        // Store document metadata in Firestore
        const firestoreDoc = {
          userId,
          filename: file.name,
          contentType: file.type,
          fileSize: file.size,
          uploadDate: new Date(),
          status: 'pending',
          metadata: {
            uploadedAt: new Date().toISOString(),
            fileSize: file.size,
            mimeType: file.type
          },
        };
        
        const firestoreResult = await firestore.collection('documents').add(firestoreDoc);
        
        results.push({ 
          name: file.name, 
          status: 'done', 
          url, 
          document: doc, 
          firestoreId: firestoreResult.id 
        });

        apiLogger.success('File uploaded successfully', {
          fileName: file.name,
          documentId: doc.id,
          firestoreId: firestoreResult.id
        });

      } catch (error) {
        apiLogger.error('File processing error', {
          fileName: file.name,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        
        results.push({ 
          name: file.name, 
          status: 'error', 
          error: 'File processing failed' 
        });
      }
    }

    return NextResponse.json({ results });

  } catch (error) {
    apiLogger.error('File upload route error', error);
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    );
  }
} 