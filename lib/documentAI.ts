import { DocumentProcessorServiceClient } from '@google-cloud/documentai';
import { Storage } from '@google-cloud/storage';

// Document AI processor types for legal documents
const PROCESSOR_TYPES = {
  // General document processing
  GENERAL: 'general-document-processor',
  // Legal document specific processors
  LEGAL_DOCUMENT: 'legal-document-processor',
  // Form processing
  FORM_PARSER: 'form-parser-processor',
  // OCR for scanned documents
  OCR: 'ocr-processor',
} as const;

interface DocumentAIResult {
  text: string;
  confidence: number;
  pages: number;
  entities: Array<{
    type: string;
    text: string;
    confidence: number;
  }>;
  tables: Array<{
    rows: number;
    columns: number;
    text: string;
  }>;
  processingTime: number;
}

interface ProcessingOptions {
  processorType?: keyof typeof PROCESSOR_TYPES;
  enableOCR?: boolean;
  extractTables?: boolean;
  extractEntities?: boolean;
}

export class DocumentAIService {
  private client: DocumentProcessorServiceClient;
  private storage: Storage;
  private projectId: string;
  private location: string;

  constructor() {
    this.client = new DocumentProcessorServiceClient();
    this.storage = new Storage();
    this.projectId = process.env.GOOGLE_CLOUD_PROJECT_ID!;
    this.location = process.env.DOCUMENT_AI_LOCATION || 'us';
  }

  /**
   * Process a document using Google Document AI
   */
  async processDocument(
    fileBuffer: Buffer,
    fileName: string,
    options: ProcessingOptions = {}
  ): Promise<DocumentAIResult> {
    const startTime = Date.now();
    
    try {
      console.log(`🟦 [DocumentAI][INFO] Processing document: ${fileName}`);
      
      // Determine the best processor type based on file type and options
      const processorType = this.getOptimalProcessorType(fileName, options);
      const processorName = this.getProcessorName(processorType);
      
      console.log(`🟦 [DocumentAI][INFO] Using processor: ${processorType}`);
      
      // Convert the image data to base64
      const encodedImage = fileBuffer.toString('base64');
      
      // Configure the process request
      const request = {
        name: processorName,
        rawDocument: {
          content: encodedImage,
          mimeType: this.getMimeType(fileName),
        },
        processOptions: {
          individualPageSelector: {
            pages: [1], // Process all pages
          },
        },
      };

      // Process the document
      const [result] = await this.client.processDocument(request);
      const { document } = result;

      if (!document) {
        throw new Error('No document returned from Document AI');
      }

      // Extract text content
      const text = document.text || '';
      
      // Calculate confidence based on text quality and length
      const confidence = this.calculateConfidence(text, document.pages?.length || 1);
      
      // Extract entities if requested
      const entities = options.extractEntities ? this.extractEntities(document) : [];
      
      // Extract tables if requested
      const tables = options.extractTables ? this.extractTables(document) : [];
      
      const processingTime = Date.now() - startTime;
      
      console.log(`🟩 [DocumentAI][SUCCESS] Document processed successfully`);
      console.log(`🟦 [DocumentAI][INFO] Text length: ${text.length} characters`);
      console.log(`🟦 [DocumentAI][INFO] Pages: ${document.pages?.length || 1}`);
      console.log(`🟦 [DocumentAI][INFO] Confidence: ${confidence.toFixed(2)}%`);
      console.log(`🟦 [DocumentAI][INFO] Processing time: ${processingTime}ms`);
      
      return {
        text,
        confidence,
        pages: document.pages?.length || 1,
        entities,
        tables,
        processingTime,
      };
      
    } catch (error) {
      const processingTime = Date.now() - startTime;
      console.error(`🟥 [DocumentAI][ERROR] Failed to process document:`, error);
      
      // Return fallback result
      return {
        text: `Document Content - ${fileName} (Document AI processing failed)`,
        confidence: 0,
        pages: 1,
        entities: [],
        tables: [],
        processingTime,
      };
    }
  }

  /**
   * Determine the optimal processor type based on file type and options
   */
  private getOptimalProcessorType(fileName: string, options: ProcessingOptions): keyof typeof PROCESSOR_TYPES {
    const fileExtension = fileName.toLowerCase().split('.').pop();
    
    // If OCR is explicitly enabled, use OCR processor
    if (options.enableOCR) {
      return 'OCR';
    }
    
    // For legal documents, prefer legal processor
    if (this.isLegalDocument(fileName)) {
      return 'LEGAL_DOCUMENT';
    }
    
    // For forms, use form parser
    if (this.isFormDocument(fileName)) {
      return 'FORM_PARSER';
    }
    
    // Default to general processor
    return 'GENERAL';
  }

  /**
   * Check if document appears to be a legal document
   */
  private isLegalDocument(fileName: string): boolean {
    const legalKeywords = [
      'contract', 'agreement', 'lease', 'deed', 'will', 'trust',
      'petition', 'complaint', 'motion', 'brief', 'affidavit',
      'legal', 'law', 'court', 'judgment', 'order', 'decree'
    ];
    
    const fileNameLower = fileName.toLowerCase();
    return legalKeywords.some(keyword => fileNameLower.includes(keyword));
  }

  /**
   * Check if document appears to be a form
   */
  private isFormDocument(fileName: string): boolean {
    const formKeywords = [
      'form', 'application', 'questionnaire', 'survey',
      'tax', 'registration', 'license', 'permit'
    ];
    
    const fileNameLower = fileName.toLowerCase();
    return formKeywords.some(keyword => fileNameLower.includes(keyword));
  }

  /**
   * Get the full processor name
   */
  private getProcessorName(processorType: keyof typeof PROCESSOR_TYPES): string {
    const processorId = process.env[`DOCUMENT_AI_${processorType}_PROCESSOR_ID`];
    
    if (!processorId) {
      throw new Error(`Document AI processor ID not configured for ${processorType}`);
    }
    
    return `projects/${this.projectId}/locations/${this.location}/processors/${processorId}`;
  }

  /**
   * Get MIME type based on file extension
   */
  private getMimeType(fileName: string): string {
    const extension = fileName.toLowerCase().split('.').pop();
    
    switch (extension) {
      case 'pdf':
        return 'application/pdf';
      case 'png':
        return 'image/png';
      case 'jpg':
      case 'jpeg':
        return 'image/jpeg';
      case 'tiff':
      case 'tif':
        return 'image/tiff';
      case 'gif':
        return 'image/gif';
      case 'bmp':
        return 'image/bmp';
      case 'webp':
        return 'image/webp';
      default:
        return 'application/pdf'; // Default to PDF
    }
  }

  /**
   * Calculate confidence score based on text quality and document structure
   */
  private calculateConfidence(text: string, pages: number): number {
    if (!text || text.length === 0) {
      return 0;
    }

    let confidence = 0;
    
    // Base confidence on text length (more text = higher confidence)
    const textLengthScore = Math.min(text.length / 1000, 1) * 30;
    confidence += textLengthScore;
    
    // Bonus for multiple pages
    const pageScore = Math.min(pages * 5, 20);
    confidence += pageScore;
    
    // Bonus for structured content (paragraphs, sentences)
    const paragraphs = text.split('\n\n').length;
    const sentences = text.split(/[.!?]+/).length;
    
    if (paragraphs > 1) confidence += 10;
    if (sentences > 5) confidence += 10;
    
    // Bonus for legal terminology
    const legalTerms = [
      'whereas', 'therefore', 'hereby', 'herein', 'hereof', 'hereto',
      'party', 'parties', 'agreement', 'contract', 'shall', 'may',
      'pursuant', 'according', 'subject', 'provided', 'except'
    ];
    
    const legalTermCount = legalTerms.filter(term => 
      text.toLowerCase().includes(term)
    ).length;
    
    confidence += Math.min(legalTermCount * 2, 20);
    
    // Cap at 100%
    return Math.min(confidence, 100);
  }

  /**
   * Extract entities from the document
   */
  private extractEntities(document: any): Array<{ type: string; text: string; confidence: number }> {
    const entities: Array<{ type: string; text: string; confidence: number }> = [];
    
    if (document.entities) {
      for (const entity of document.entities) {
        entities.push({
          type: entity.type || 'unknown',
          text: entity.mentionText || '',
          confidence: entity.confidence || 0,
        });
      }
    }
    
    return entities;
  }

  /**
   * Extract tables from the document
   */
  private extractTables(document: any): Array<{ rows: number; columns: number; text: string }> {
    const tables: Array<{ rows: number; columns: number; text: string }> = [];
    
    if (document.pages) {
      for (const page of document.pages) {
        if (page.tables) {
          for (const table of page.tables) {
            let tableText = '';
            let maxRows = 0;
            let maxCols = 0;
            
            if (table.headerRows) {
              for (const row of table.headerRows) {
                if (row.cells) {
                  maxCols = Math.max(maxCols, row.cells.length);
                  for (const cell of row.cells) {
                    if (cell.text) {
                      tableText += cell.text + '\t';
                    }
                  }
                  tableText += '\n';
                  maxRows++;
                }
              }
            }
            
            if (table.bodyRows) {
              for (const row of table.bodyRows) {
                if (row.cells) {
                  maxCols = Math.max(maxCols, row.cells.length);
                  for (const cell of row.cells) {
                    if (cell.text) {
                      tableText += cell.text + '\t';
                    }
                  }
                  tableText += '\n';
                  maxRows++;
                }
              }
            }
            
            if (tableText.trim()) {
              tables.push({
                rows: maxRows,
                columns: maxCols,
                text: tableText.trim(),
              });
            }
          }
        }
      }
    }
    
    return tables;
  }

  /**
   * Test Document AI connection and processor availability
   */
  async testConnection(): Promise<boolean> {
    try {
      console.log('🔍 [DocumentAI][TEST] Testing Document AI connection...');
      
      // Test basic client initialization
      if (!this.projectId) {
        throw new Error('GOOGLE_CLOUD_PROJECT_ID not configured');
      }
      
      console.log(`🟦 [DocumentAI][TEST] Project ID: ${this.projectId}`);
      console.log(`🟦 [DocumentAI][TEST] Location: ${this.location}`);
      
      // Test processor availability
      const generalProcessorId = process.env.DOCUMENT_AI_GENERAL_PROCESSOR_ID;
      if (!generalProcessorId) {
        throw new Error('DOCUMENT_AI_GENERAL_PROCESSOR_ID not configured');
      }
      
      console.log(`🟦 [DocumentAI][TEST] General Processor ID: ${generalProcessorId}`);
      
      // Test with a minimal document
      const testBuffer = Buffer.from('%PDF-1.4\n1 0 obj\n<<\n/Type /Catalog\n/Pages 2 0 R\n>>\nendobj\n2 0 obj\n<<\n/Type /Pages\n/Kids [3 0 R]\n/Count 1\n>>\nendobj\n3 0 obj\n<<\n/Type /Page\n/Parent 2 0 R\n/MediaBox [0 0 612 792]\n/Contents 4 0 R\n>>\nendobj\n4 0 obj\n<<\n/Length 44\n>>\nstream\nBT\n/F1 12 Tf\n72 720 Td\n(Test Document) Tj\nET\nendstream\nendobj\nxref\n0 5\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \n0000000204 00000 n \ntrailer\n<<\n/Size 5\n/Root 1 0 R\n>>\nstartxref\n364\n%%EOF');
      
      const result = await this.processDocument(testBuffer, 'test.pdf', {
        processorType: 'GENERAL',
        enableOCR: false,
      });
      
      console.log(`🟩 [DocumentAI][TEST] Connection test successful`);
      console.log(`🟦 [DocumentAI][TEST] Test result: ${result.text.length} characters, ${result.confidence.toFixed(2)}% confidence`);
      
      return true;
      
    } catch (error) {
      console.error(`🟥 [DocumentAI][TEST] Connection test failed:`, error);
      return false;
    }
  }
}

// Export singleton instance
export const documentAIService = new DocumentAIService();
