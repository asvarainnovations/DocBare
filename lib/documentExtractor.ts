import { prisma } from './prisma';
import { aiLogger } from './logger';

export interface DocumentInfo {
  content: string;
  name: string;
  type: string;
}

export class DocumentExtractor {
  /**
   * Extract document content from uploaded files
   */
  static async extractDocumentContent(documentId: string, userId: string): Promise<DocumentInfo | null> {
    try {
      // Get document metadata from Prisma
      const document = await prisma.document.findFirst({
        where: {
          id: documentId,
          userId: userId
        }
      });

      if (!document) {
        aiLogger.warn(`Document not found: ${documentId} for user: ${userId}`);
        return null;
      }

      // For now, we'll return basic document info
      // In a full implementation, you would:
      // 1. Download the file from GCS
      // 2. Extract text based on file type (PDF, DOCX, etc.)
      // 3. Process and clean the extracted text
      
      return {
        content: `[Document: ${document.originalName}] - Content extraction not yet implemented for ${document.mimeType}`,
        name: document.originalName,
        type: document.mimeType
      };
    } catch (error) {
      aiLogger.error('Failed to extract document content:', error);
      return null;
    }
  }

  /**
   * Extract content from multiple documents
   */
  static async extractMultipleDocuments(documentIds: string[], userId: string): Promise<DocumentInfo[]> {
    const documents: DocumentInfo[] = [];
    
    for (const documentId of documentIds) {
      const doc = await this.extractDocumentContent(documentId, userId);
      if (doc) {
        documents.push(doc);
      }
    }
    
    return documents;
  }

  /**
   * Combine multiple documents into a single context
   */
  static combineDocuments(documents: DocumentInfo[]): string {
    if (documents.length === 0) {
      return '';
    }

    const combined = documents.map(doc => 
      `## Document: ${doc.name} (${doc.type})\n${doc.content}`
    ).join('\n\n');

    return `# Uploaded Documents\n\n${combined}`;
  }

  /**
   * Check if a document is supported for analysis
   */
  static isSupportedDocumentType(mimeType: string): boolean {
    const supportedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
      'text/plain',
      'text/markdown'
    ];
    
    return supportedTypes.includes(mimeType);
  }
} 