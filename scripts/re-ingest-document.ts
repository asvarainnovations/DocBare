import { prisma } from '../lib/prisma';
import firestore from '../lib/firestore';
import OpenAI from 'openai';
import pdf from 'pdf-parse';
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
  // Simple token estimation: ~4 characters per token
  return Math.ceil(text.length / 4);
}

async function extractTextFromFile(fileUrl: string, mimeType: string, fileName: string): Promise<string> {
  try {
    if (mimeType.startsWith('text/')) {
      const response = await fetch(fileUrl);
      return await response.text();
    } else if (mimeType === 'application/pdf') {
      // Extract filename from GCS URL
      const file = bucket.file(fileName);
      
      // Download the file
      const [buffer] = await file.download();
      
      // Parse PDF content
      const data = await pdf(buffer);
      return data.text;
    } else {
      return `Document Content - ${fileUrl}`;
    }
  } catch (error) {
    console.error('Error extracting text from file:', error);
    return `Document Content - ${fileUrl}`;
  }
}

async function reIngestDocument(documentId: string) {
  try {
    console.log(`🔄 Re-ingesting document: ${documentId}`);
    
    // Fetch document from Prisma
    const document = await prisma.document.findUnique({
      where: { id: documentId }
    });

    if (!document) {
      console.error('❌ Document not found');
      return;
    }

    console.log(`📄 Document: ${document.originalName} (${document.mimeType})`);

    // Extract text from the uploaded file
    const text = await extractTextFromFile(document.path, document.mimeType, document.fileName);
    
    if (!text) {
      console.error('❌ No text could be extracted from document');
      return;
    }

    console.log(`📝 Extracted text length: ${text.length} characters`);
    console.log(`📝 Text preview: ${text.substring(0, 200)}...`);

    // Delete existing chunks for this document
    const existingChunks = await firestore.collection('document_chunks')
      .where('documentId', '==', documentId)
      .get();
    
    console.log(`🗑️ Deleting ${existingChunks.size} existing chunks...`);
    for (const chunk of existingChunks.docs) {
      await chunk.ref.delete();
    }

    // Split text into chunks
    const chunks = splitIntoChunks(text);
    console.log(`✂️ Split into ${chunks.length} chunks`);
    
    // Store chunks and embeddings in Firestore
    for (let i = 0; i < chunks.length; i++) {
      const chunkText = chunks[i];
      
      // Store chunk metadata
      const chunkDoc = {
        documentId,
        userId: document.userId,
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
        userId: document.userId,
        vector: embeddingResp.data[0].embedding,
        model: 'text-embedding-3-small',
        createdAt: new Date(),
      };
      
      await firestore.collection('embeddings').add(embeddingDoc);
      
      console.log(`✅ Processed chunk ${i + 1}/${chunks.length}`);
    }

    console.log(`✅ Document ${documentId} re-processed successfully with ${chunks.length} chunks`);
    
  } catch (error: any) {
    console.error('❌ Document re-processing failed:', error);
  }
}

// Get document ID from command line argument
const documentId = process.argv[2];
if (!documentId) {
  console.error('❌ Please provide a document ID as an argument');
  console.log('Usage: npx tsx scripts/re-ingest-document.ts <document-id>');
  process.exit(1);
}

reIngestDocument(documentId).then(() => {
  console.log('✅ Re-ingestion complete');
  process.exit(0);
}).catch((error) => {
  console.error('❌ Re-ingestion failed:', error);
  process.exit(1);
});
