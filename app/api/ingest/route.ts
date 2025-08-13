import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import firestore from '@/lib/firestore';
import OpenAI from 'openai';
import { Storage } from '@google-cloud/storage';

// Dynamic import for pdf-parse to avoid compilation issues
let pdfParse: any = null;

async function loadPdfParse() {
  if (pdfParse) return pdfParse;
  
  try {
    // Try to load pdf-parse in a way that avoids test file access
    const pdfParseModule = await import('pdf-parse');
    pdfParse = pdfParseModule.default || pdfParseModule;
    
    // Don't test with a minimal buffer as it may fail - just return the module
    // The real test will be when we try to parse actual PDFs
    console.log('✅ pdf-parse loaded successfully');
    return pdfParse;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.warn('🟨 [ingest][WARN] pdf-parse loading failed, will use fallback:', errorMessage);
    return null;
  }
}

const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY,
  timeout: 30000, // 30 seconds timeout
  maxRetries: 3
});

// Initialize GCS
const gcsConfig: any = {
  projectId: process.env.FIRESTORE_PROJECT_ID,
};

if (process.env.GOOGLE_CLOUD_KEY_FILE) {
  gcsConfig.keyFilename = process.env.GOOGLE_CLOUD_KEY_FILE;
}

const storage = new Storage(gcsConfig);
const bucket = storage.bucket(process.env.GCS_BUCKET_NAME!);

function splitIntoChunks(text: string, chunkSize = 1000): string[] {
  const chunks = [];
  for (let i = 0; i < text.length; i += chunkSize) {
    chunks.push(text.slice(i, i + chunkSize));
  }
  return chunks;
}

function countTokens(text: string): number {
  return text.split(/\s+/).length;
}

interface ParsingConfidence {
  score: number; // 0-100
  level: 'high' | 'medium' | 'low';
  reasons: string[];
  suggestions: string[];
}

function calculateParsingConfidence(extractedText: string, fileName: string, fileSize: number): ParsingConfidence {
  const reasons: string[] = [];
  const suggestions: string[] = [];
  let score = 100;
  
  // Check text length
  const textLength = extractedText.trim().length;
  if (textLength < 100) {
    score -= 40;
    reasons.push(`Extracted text is very short (${textLength} characters)`);
    suggestions.push('Document may be image-based or corrupted');
  } else if (textLength < 500) {
    score -= 20;
    reasons.push(`Extracted text is short (${textLength} characters)`);
    suggestions.push('Consider re-uploading in DOCX or TXT format');
  }
  
  // Check for fallback content patterns
  if (extractedText.includes('Document Content -') || extractedText.includes('PDF Document Content -')) {
    score -= 50;
    reasons.push('Fallback content detected - parsing likely failed');
    suggestions.push('Try uploading a different file format or re-scanning the document');
  }
  
  // Check for meaningful content patterns
  const hasLegalTerms = /(whereas|agreement|contract|plaintiff|defendant|clause|section|article)/i.test(extractedText);
  const hasPunctuation = /[.!?]/.test(extractedText);
  const hasSpaces = /\s/.test(extractedText);
  
  if (!hasLegalTerms && textLength > 200) {
    score -= 10;
    reasons.push('No legal terminology detected in extracted text');
  }
  
  if (!hasPunctuation && textLength > 100) {
    score -= 15;
    reasons.push('No punctuation detected - may be OCR artifacts');
    suggestions.push('Consider using Google Document AI for better OCR');
  }
  
  if (!hasSpaces && textLength > 50) {
    score -= 25;
    reasons.push('No spaces detected - likely OCR failure');
    suggestions.push('Document may need better OCR processing');
  }
  
  // Check file size vs content ratio
  const contentRatio = textLength / fileSize;
  if (contentRatio < 0.01 && fileSize > 10000) {
    score -= 20;
    reasons.push('Low content-to-file-size ratio');
    suggestions.push('File may be image-heavy or compressed');
  }
  
  // Determine confidence level
  let level: 'high' | 'medium' | 'low';
  if (score >= 80) {
    level = 'high';
  } else if (score >= 50) {
    level = 'medium';
  } else {
    level = 'low';
  }
  
  // Add general suggestions based on level
  if (level === 'low') {
    suggestions.push('Consider re-uploading in DOCX or TXT format for better results');
    suggestions.push('If this is a scanned document, try using Google Document AI');
  }
  
  return {
    score: Math.max(0, score),
    level,
    reasons,
    suggestions
  };
}

async function extractTextWithFallbacks(fileUrl: string, mimeType: string, fileName: string): Promise<{ text: string; confidence: ParsingConfidence; method: string }> {
  const methods = [];
  
  // Method 1: Primary extraction
  try {
    const result = await extractTextFromFile(fileUrl, mimeType, fileName);
    if (result.confidence.level === 'high') {
      return { ...result, method: 'primary' };
    }
    methods.push({ result, method: 'primary' });
  } catch (error) {
    console.warn(`🟨 [ingest][WARN] Primary extraction failed:`, error);
  }
  
  // Method 2: Try alternative PDF parsing if primary failed
  if (mimeType === 'application/pdf' && methods.length > 0) {
    try {
      console.log(`🟦 [ingest][INFO] Trying alternative PDF parsing method`);
      const file = bucket.file(fileName);
      const [buffer] = await file.download();
      
      // Try with different pdf-parse options
      const pdfParser = await loadPdfParse();
      if (pdfParser) {
        const data = await pdfParser(buffer, {
          max: 0, // No page limit
          version: 'v2.0.0'
        });
        const altText = data.text;
        const altConfidence = calculateParsingConfidence(altText, fileName, buffer.length);
        
        if (altConfidence.score > methods[0].result.confidence.score) {
          console.log(`🟩 [ingest][SUCCESS] Alternative method improved confidence: ${altConfidence.score} vs ${methods[0].result.confidence.score}`);
          return { text: altText, confidence: altConfidence, method: 'alternative' };
        }
        methods.push({ result: { text: altText, confidence: altConfidence }, method: 'alternative' });
      }
    } catch (error) {
      console.warn(`🟨 [ingest][WARN] Alternative extraction failed:`, error);
    }
  }
  
  // Return the best result from all methods
  const bestMethod = methods.reduce((best, current) => 
    current.result.confidence.score > best.result.confidence.score ? current : best
  );
  
  console.log(`🟦 [ingest][INFO] Using best extraction method: ${bestMethod.method} (confidence: ${bestMethod.result.confidence.score})`);
  return { ...bestMethod.result, method: bestMethod.method };
}

async function extractTextFromFile(fileUrl: string, mimeType: string, fileName: string): Promise<{ text: string; confidence: ParsingConfidence }> {
  try {
    console.log(`🟦 [ingest][INFO] Extracting text from file: ${fileName}, type: ${mimeType}`);
    
    if (mimeType.startsWith('text/')) {
      // For text files, we can fetch the content directly
      const response = await fetch(fileUrl);
      const text = await response.text();
      console.log(`🟩 [ingest][SUCCESS] Text file extracted: ${text.length} characters`);
      
      const confidence = calculateParsingConfidence(text, fileName, text.length);
      console.log(`🟦 [ingest][INFO] Text file confidence: ${confidence.level} (${confidence.score}/100)`);
      
      return { text, confidence };
    } else if (mimeType === 'application/pdf') {
      // For PDFs, download from GCS and parse with pdf-parse
      const file = bucket.file(fileName);
      
      console.log(`🟦 [ingest][INFO] Downloading PDF from GCS: ${fileName}`);
      // Download the file
      const [buffer] = await file.download();
      console.log(`🟩 [ingest][SUCCESS] PDF downloaded: ${buffer.length} bytes`);
      
      // Load pdf-parse dynamically
      const pdfParser = await loadPdfParse();
      
                    if (pdfParser) {
         // Use pdf-parse to extract text
         console.log(`🟦 [ingest][INFO] Parsing PDF with pdf-parse`);
         try {
           const data = await pdfParser(buffer);
           const extractedText = data.text;
           console.log(`🟩 [ingest][SUCCESS] PDF parsed successfully: ${extractedText.length} characters`);
           
           // Calculate confidence score
           const confidence = calculateParsingConfidence(extractedText, fileName, buffer.length);
           console.log(`🟦 [ingest][INFO] PDF confidence: ${confidence.level} (${confidence.score}/100)`);
           
           if (confidence.level === 'low') {
             console.warn(`🟨 [ingest][WARN] Low confidence PDF parsing:`, confidence.reasons);
           }
           
           return { text: extractedText, confidence };
         } catch (parseError) {
           console.warn(`🟨 [ingest][WARN] pdf-parse failed to parse PDF:`, parseError);
           // Continue to fallback methods
         }
       }
       
       // Fallback if pdf-parse is not available or failed - try enhanced basic text extraction
       console.warn(`🟨 [ingest][WARN] pdf-parse not available or failed, trying enhanced basic text extraction`);
       try {
         // Enhanced text extraction from PDF buffer
         const bufferString = buffer.toString('utf8');
         
         // Look for text content in PDF streams
         const textStreams = bufferString.match(/BT[\s\S]*?ET/g);
         const textMatches = bufferString.match(/[\x20-\x7E]{10,}/g);
         
         let extractedText = '';
         
         // Try to extract from text streams first (more reliable)
         if (textStreams && textStreams.length > 0) {
           const streamText = textStreams.join(' ')
             .replace(/BT|ET/g, '') // Remove PDF operators
             .replace(/\[[^\]]*\]/g, ' ') // Remove arrays
             .replace(/[0-9]+ [0-9]+ Td/g, ' ') // Remove positioning
             .replace(/[0-9]+ [0-9]+ Tj/g, ' ') // Remove text objects
             .replace(/\s+/g, ' ') // Normalize whitespace
             .trim();
           
           if (streamText.length > 50) {
             extractedText = streamText.substring(0, 3000);
           }
         }
         
         // Fallback to general text matching
         if (!extractedText && textMatches && textMatches.length > 0) {
           extractedText = textMatches.join(' ').substring(0, 2000);
         }
         
         if (extractedText) {
           console.log(`🟩 [ingest][SUCCESS] Enhanced basic text extraction: ${extractedText.length} characters`);
           const confidence = calculateParsingConfidence(extractedText, fileName, buffer.length);
           return { text: extractedText, confidence };
         }
       } catch (basicError) {
         console.warn(`🟨 [ingest][WARN] Enhanced basic text extraction failed:`, basicError);
       }
       
       // Final fallback
       const fallbackText = `PDF Document Content - ${fileName} (${buffer.length} bytes) - PDF parsing not available`;
       const confidence = calculateParsingConfidence(fallbackText, fileName, buffer.length);
       return { text: fallbackText, confidence };
    } else {
      // For other file types, return a placeholder
      console.warn(`🟨 [ingest][WARN] Unsupported file type: ${mimeType}`);
      const unsupportedText = `Document Content - ${fileUrl} (Unsupported file type: ${mimeType})`;
      const confidence = calculateParsingConfidence(unsupportedText, fileName, 0);
      return { text: unsupportedText, confidence };
    }
  } catch (error) {
    console.error('🟥 [ingest][ERROR] Error extracting text from file:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorText = `Document Content - ${fileUrl} (Error: ${errorMessage})`;
    const confidence = calculateParsingConfidence(errorText, fileName, 0);
    return { text: errorText, confidence };
  }
}

export async function GET(req: NextRequest) {
  return NextResponse.json({ 
    status: 'Ingest API is working',
    message: 'GET method is accessible'
  });
}

// Rate limiting configuration
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 5; // 5 requests per minute
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const userLimit = rateLimitMap.get(userId);
  
  if (!userLimit || now > userLimit.resetTime) {
    rateLimitMap.set(userId, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return true;
  }
  
  if (userLimit.count >= MAX_REQUESTS_PER_WINDOW) {
    return false;
  }
  
  userLimit.count++;
  return true;
}

export async function POST(req: NextRequest) {
  try {
    const { documentId, userId } = await req.json();
    
    if (!documentId) {
      return NextResponse.json({ error: 'Missing documentId' }, { status: 400 });
    }
    
    if (!userId) {
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
    }
    
    // Check rate limit
    if (!checkRateLimit(userId)) {
      return NextResponse.json({ 
        error: 'Rate limit exceeded. Please wait before processing another document.',
        retryAfter: Math.ceil(RATE_LIMIT_WINDOW / 1000)
      }, { status: 429 });
    }

    // Fetch document from Prisma
    const document = await prisma.document.findUnique({
      where: { id: documentId }
    });

    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    // Extract text from the uploaded file with fallbacks
    const extractionResult = await extractTextWithFallbacks(document.path, document.mimeType, document.fileName);
    
    if (!extractionResult.text) {
      return NextResponse.json({ error: 'No text could be extracted from document' }, { status: 400 });
    }

    // Log confidence information
    console.log(`🟦 [ingest][INFO] Document processing confidence:`, {
      fileName: document.fileName,
      method: extractionResult.method,
      confidence: extractionResult.confidence.level,
      score: extractionResult.confidence.score,
      reasons: extractionResult.confidence.reasons,
      suggestions: extractionResult.confidence.suggestions
    });

    // Split text into chunks
    const chunks = splitIntoChunks(extractionResult.text);
    
    // Store chunks and embeddings in Firestore
    for (let i = 0; i < chunks.length; i++) {
      const chunkText = chunks[i];
      
      // Store chunk metadata
      const chunkDoc = {
        documentId,
        userId,
        chunkIndex: i,
        text: chunkText,
        tokenCount: countTokens(chunkText),
        createdAt: new Date(),
      };
      
      const chunkRef = await firestore.collection('document_chunks').add(chunkDoc);
      
             // Generate embeddings with retry logic
       let embeddingResp: any;
       let retryCount = 0;
       const maxRetries = 3;
       
       while (retryCount < maxRetries) {
         try {
           embeddingResp = await openai.embeddings.create({
             model: 'text-embedding-3-small',
             input: chunkText,
           });
           break; // Success, exit retry loop
         } catch (embeddingError) {
           retryCount++;
           console.warn(`🟨 [ingest][WARN] Embedding generation failed (attempt ${retryCount}/${maxRetries}):`, embeddingError);
           
           if (retryCount >= maxRetries) {
             console.error(`🟥 [ingest][ERROR] Failed to generate embedding after ${maxRetries} attempts`);
             throw embeddingError;
           }
           
           // Wait before retry (exponential backoff)
           await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
         }
       }
      
      // Store embedding
      const embeddingDoc = {
        chunkId: chunkRef.id,
        documentId,
        userId,
        vector: embeddingResp.data[0].embedding,
        model: 'text-embedding-3-small',
        createdAt: new Date(),
      };
      
      await firestore.collection('embeddings').add(embeddingDoc);
    }

    // Update document status in Prisma
    await prisma.document.update({
      where: { id: documentId },
      data: { 
        // Add a status field if it doesn't exist in the schema
        // For now, we'll just log the completion
      }
    });

    console.log(`✅ Document ${documentId} processed successfully with ${chunks.length} chunks`);
    
    return NextResponse.json({ 
      status: 'ok', 
      chunks: chunks.length,
      documentId,
      confidence: {
        level: extractionResult.confidence.level,
        score: extractionResult.confidence.score,
        reasons: extractionResult.confidence.reasons,
        suggestions: extractionResult.confidence.suggestions
      },
      method: extractionResult.method,
      message: extractionResult.confidence.level === 'high' 
        ? 'Document processed successfully' 
        : `Document processed with ${extractionResult.confidence.level} confidence`
    });
    
  } catch (error: any) {
    console.error('❌ Document processing failed:', error);
    return NextResponse.json({ 
      error: 'Document processing failed', 
      details: error.message 
    }, { status: 500 });
  }
} 