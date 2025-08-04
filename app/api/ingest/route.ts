import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import firestore from '@/lib/firestore';
import OpenAI from 'openai';
import { Storage } from '@google-cloud/storage';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

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

async function extractTextFromFile(fileUrl: string, mimeType: string): Promise<string> {
  try {
    // For now, we'll handle text files and return a placeholder
    // In a real implementation, you'd use libraries like pdf-parse, mammoth, etc.
    if (mimeType.startsWith('text/')) {
      // For text files, we can fetch the content directly
      const response = await fetch(fileUrl);
      return await response.text();
    } else if (mimeType === 'application/pdf') {
      // For PDFs, we'd need a PDF parser
      // For now, return a placeholder
      return `PDF Document Content - ${fileUrl}`;
    } else {
      // For other file types, return a placeholder
      return `Document Content - ${fileUrl}`;
    }
  } catch (error) {
    console.error('Error extracting text from file:', error);
    return `Document Content - ${fileUrl}`;
  }
}

export async function POST(req: NextRequest) {
  try {
    const { documentId, userId } = await req.json();
    
    if (!documentId) {
      return NextResponse.json({ error: 'Missing documentId' }, { status: 400 });
    }

    // Fetch document from Prisma
    const document = await prisma.document.findUnique({
      where: { id: documentId }
    });

    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    // Extract text from the uploaded file
    const text = await extractTextFromFile(document.path, document.mimeType);
    
    if (!text) {
      return NextResponse.json({ error: 'No text could be extracted from document' }, { status: 400 });
    }

    // Split text into chunks
    const chunks = splitIntoChunks(text);
    
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
      
      // Generate embeddings
      const embeddingResp = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: chunkText,
      });
      
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
      message: 'Document processed successfully'
    });
    
  } catch (error: any) {
    console.error('❌ Document processing failed:', error);
    return NextResponse.json({ 
      error: 'Document processing failed', 
      details: error.message 
    }, { status: 500 });
  }
} 