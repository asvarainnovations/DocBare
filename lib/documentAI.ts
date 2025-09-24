import { DocumentProcessorServiceClient } from "@google-cloud/documentai";
import { Storage } from "@google-cloud/storage";

// Document AI processor types for legal documents
const PROCESSOR_TYPES = {
  // Layout parser for document structure (general purpose)
  LAYOUT_PARSER: "layout-parser-processor",
  // Form processing
  FORM_PARSER: "form-parser-processor",
  // OCR for scanned documents
  OCR: "ocr-processor",
} as const;

// Google Cloud Document AI processor type constants
const GOOGLE_PROCESSOR_TYPES = {
  LAYOUT_PARSER: "LAYOUT_PARSER_PROCESSOR",
  FORM_PARSER: "FORM_PARSER_PROCESSOR",
  OCR: "OCR_PROCESSOR",
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

interface ProcessorInfo {
  name: string;
  id: string;
  type: string;
  location: string;
}

export class DocumentAIService {
  private client: DocumentProcessorServiceClient;
  private storage: Storage;
  private projectId: string;
  private location: string;

  constructor() {
    // Configure authentication same as GCS
    const config: any = {
      projectId: process.env.FIRESTORE_PROJECT_ID,
    };

    if (process.env.GOOGLE_CLOUD_KEY_FILE) {
      config.keyFilename = process.env.GOOGLE_CLOUD_KEY_FILE;
    }

    // Configure Document AI client with reasonable timeout
    const clientConfig = {
      ...config,
      // Set reasonable timeout based on file size
      timeout: 300000, // 5 minutes in milliseconds
      // Add retry configuration
      retry: {
        retryDelayMultiplier: 2,
        totalTimeout: 300000, // 5 minutes total timeout
        maxRetries: 2,
      },
    };

    this.client = new DocumentProcessorServiceClient(clientConfig);
    this.storage = new Storage(config);
    this.projectId =
      process.env.FIRESTORE_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT_ID!;
    this.location = process.env.DOCUMENT_AI_LOCATION || "us";
  }

  /**
   * Get or create a processor for the specified type
   */
  private async getOrCreateProcessor(
    processorType: keyof typeof PROCESSOR_TYPES
  ): Promise<ProcessorInfo> {
    try {
      // First, check if a processor of this type already exists
      const existingProcessors = await this.listProcessors();
      const existingProcessor = existingProcessors.find(
        (p) => p.type === GOOGLE_PROCESSOR_TYPES[processorType]
      );

      if (existingProcessor) {
        console.log(
          `🟦 [DocumentAI][INFO] Using existing processor: ${existingProcessor.id}`
        );
        return existingProcessor;
      }

      // Try to create new processor if none exists
      console.log(
        `🟦 [DocumentAI][INFO] No existing processor found, attempting to create new ${processorType} processor`
      );
      try {
        return await this.createProcessor(processorType);
      } catch (createError) {
        console.warn(
          `🟨 [DocumentAI][WARN] Failed to create processor: ${
            createError instanceof Error ? createError.message : "Unknown error"
          }`
        );
        console.log(
          `🟦 [DocumentAI][INFO] Falling back to basic processor usage`
        );

        // Fallback: Use a default processor name pattern
        const defaultProcessorId =
          process.env[`DOCUMENT_AI_${processorType}_PROCESSOR_ID`];
        if (defaultProcessorId) {
          return {
            name: `projects/${this.projectId}/locations/${this.location}/processors/${defaultProcessorId}`,
            id: defaultProcessorId,
            type: GOOGLE_PROCESSOR_TYPES[processorType],
            location: this.location,
          };
        }

        throw new Error(
          `No processor available for ${processorType}. Please create one manually in Google Cloud Console or set DOCUMENT_AI_${processorType}_PROCESSOR_ID environment variable.`
        );
      }
    } catch (error) {
      console.error(
        "[DocumentAI][ERROR] Failed to get or create processor:",
        error
      );
      throw error;
    }
  }

  /**
   * List existing processors
   */
  private async listProcessors(): Promise<ProcessorInfo[]> {
    try {
      const parent = `projects/${this.projectId}/locations/${this.location}`;
      const [response] = await this.client.listProcessors({ parent });

      return (response || []).map((processor: any) => ({
        name: processor.name || "",
        id: processor.name?.split("/").pop() || "",
        type: processor.type || "",
        location: this.location,
      }));
    } catch (error) {
      console.error("[DocumentAI][ERROR] Failed to list processors:", error);
      return [];
    }
  }

  /**
   * Create a new processor instance
   */
  private async createProcessor(
    processorType: keyof typeof PROCESSOR_TYPES
  ): Promise<ProcessorInfo> {
    try {
      const parent = `projects/${this.projectId}/locations/${this.location}`;
      const googleProcessorType = GOOGLE_PROCESSOR_TYPES[processorType];

      console.log(
        `🟦 [DocumentAI][INFO] Creating processor: ${googleProcessorType}`
      );

      const [operation] = await this.client.createProcessor({
        parent,
        processor: {
          type: googleProcessorType,
          displayName: `DocBare-${processorType}-${Date.now()}`,
        },
      });

      // Wait for the operation to complete
      const processor = await operation;

      if (!processor.name) {
        throw new Error("Failed to create processor - no name returned");
      }

      const processorId = processor.name.split("/").pop() || "";

      console.log(`🟩 [DocumentAI][SUCCESS] Processor created: ${processorId}`);

      return {
        name: processor.name,
        id: processorId,
        type: processor.type || googleProcessorType,
        location: this.location,
      };
    } catch (error) {
      console.error("[DocumentAI][ERROR] Failed to create processor:", error);
      throw error;
    }
  }

  /**
   * Process a document using Google Document AI
   * Following the official Google Cloud documentation pattern
   */
  async processDocument(
    fileBuffer: Buffer,
    fileName: string,
    options: ProcessingOptions = {}
  ): Promise<DocumentAIResult> {
    const startTime = Date.now();

    try {
      console.log(`🟦 [DocumentAI][INFO] Processing document: ${fileName}`);
      
      // Security check: Validate file size and estimate pages
      const fileSizeMB = fileBuffer.length / (1024 * 1024);
      const estimatedPages = Math.ceil(fileSizeMB / 0.5); // Rough estimate: 0.5MB per page
      
      // Pre-check: If estimated pages exceed Google's limit, reject before processing
      if (estimatedPages > 30) {
        throw new Error(`Document too large: Estimated ${estimatedPages} pages. Maximum allowed: 30 pages per document (Google Document AI limit).`);
      }
      
      console.log(`🟦 [DocumentAI][INFO] File size: ${fileSizeMB.toFixed(2)}MB, Estimated pages: ${estimatedPages}`);

      // Determine the best processor type based on file type and options
      const processorType = this.getOptimalProcessorType(fileName, options);

      // Get or create the processor automatically
      const processor = await this.getOrCreateProcessor(processorType);

      console.log(`🟦 [DocumentAI][INFO] Using processor: ${processorType}`);
      console.log(`🟦 [DocumentAI][INFO] Processor name: ${processor.name}`);

      // Configure the process request following official documentation
      const request = {
        name: processor.name,
        rawDocument: {
          content: fileBuffer.toString("base64"),
          mimeType: this.getMimeType(fileName),
        },
        // Add process options for better results
        processOptions: {
          // Process all pages, not just the first page
          // individualPageSelector: {
          //   pages: [1], // Process first page for testing
          // },
        },
      };

      console.log(`🟦 [DocumentAI][INFO] Sending request to Document AI...`);
      console.log(`🟦 [DocumentAI][INFO] File size: ${fileBuffer.length} bytes, processing all pages`);

      // Process the document with timeout handling
      const [result] = await this.client.processDocument(request);
      const { document } = result;

      if (!document) {
        throw new Error("No document returned from Document AI");
      }

      // Extract text content
      const text = document.text || "";

      // Log OCR processor results
      console.log(`🟦 [DocumentAI][INFO] OCR Processor Results:`);
      console.log(`🟦 [DocumentAI][INFO] Raw text length: ${text.length}`);
      console.log(
        `🟦 [DocumentAI][INFO] Text preview: ${text.substring(0, 200)}...`
      );
      // Security check: Validate actual page count against Google Document AI limits
      const actualPages = document.pages?.length || 0;
      if (actualPages > 30) {
        throw new Error(`Document too large: ${actualPages} pages detected. Maximum allowed: 30 pages per document (Google Document AI limit).`);
      }
      
      console.log(
        `🟦 [DocumentAI][INFO] Document pages: ${actualPages}`
      );
      console.log(
        `🟦 [DocumentAI][INFO] Document entities: ${
          document.entities?.length || 0
        }`
      );

      // Calculate confidence based on text quality and length
      const confidence = this.calculateConfidence(
        text,
        document.pages?.length || 1
      );

      // Extract entities if requested
      const entities = options.extractEntities
        ? this.extractEntities(document)
        : [];

      // Extract tables if requested
      const tables = options.extractTables ? this.extractTables(document) : [];

      const processingTime = Date.now() - startTime;

      console.log(`🟩 [DocumentAI][SUCCESS] Document processed successfully`);
      console.log(
        `🟦 [DocumentAI][INFO] Text length: ${text.length} characters`
      );
      console.log(
        `🟦 [DocumentAI][INFO] Pages: ${document.pages?.length || 1}`
      );
      console.log(
        `🟦 [DocumentAI][INFO] Confidence: ${confidence.toFixed(2)}%`
      );
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
      console.error(
        `🟥 [DocumentAI][ERROR] Failed to process document:`,
        error
      );

      // Check if it's a Google Document AI page limit error
      if (error instanceof Error && error.message.includes('PAGE_LIMIT_EXCEEDED')) {
        console.error(`🟥 [DocumentAI][ERROR] Google Document AI page limit exceeded. Consider using imageless mode or splitting the document.`);
      }

      // Add detailed error information
      console.error(`🟥 [DocumentAI][INFO] Error details:`, {
        fileName,
        processorType: "OCR (default)",
        errorMessage: error instanceof Error ? error.message : "Unknown error",
        errorStack: error instanceof Error ? error.stack : undefined,
        processingTime,
        isPageLimitError: error instanceof Error && error.message.includes('PAGE_LIMIT_EXCEEDED'),
      });

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
   * Since we only support PDFs and images, we use OCR for all files
   */
  private getOptimalProcessorType(
    fileName: string,
    options: ProcessingOptions
  ): keyof typeof PROCESSOR_TYPES {
    const fileExtension = fileName.toLowerCase().split(".").pop();
    
    console.log(`🟦 [DocumentAI][INFO] File extension: ${fileExtension}`);

    // Since we only support PDFs and images, use OCR processor for all files
    // This ensures consistent processing and better text extraction
    console.log(`🟦 [DocumentAI][INFO] Using OCR processor for all supported file types (PDFs and images)`);
    return "OCR";
  }

  /**
   * Check if document appears to be a form
   */
  private isFormDocument(fileName: string): boolean {
    const formKeywords = [
      "form",
      "application",
      "questionnaire",
      "survey",
      "tax",
      "registration",
      "license",
      "permit",
    ];

    const fileNameLower = fileName.toLowerCase();
    return formKeywords.some((keyword) => fileNameLower.includes(keyword));
  }

  /**
   * Get the full processor name following Google Cloud documentation
   * @deprecated Use getOrCreateProcessor instead
   */
  private getProcessorName(
    processorType: keyof typeof PROCESSOR_TYPES
  ): string {
    // Map processor types to environment variable names
    const envVarMap: Record<keyof typeof PROCESSOR_TYPES, string> = {
      LAYOUT_PARSER: "DOCUMENT_AI_LAYOUT_PROCESSOR_ID",
      FORM_PARSER: "DOCUMENT_AI_FORM_PARSER_PROCESSOR_ID",
      OCR: "DOCUMENT_AI_OCR_PROCESSOR_ID",
    };

    const envVarName = envVarMap[processorType];
    const processorId = process.env[envVarName];

    if (!processorId) {
      throw new Error(
        `Document AI processor ID not configured for ${processorType} (${envVarName})`
      );
    }

    // Format: projects/{project_id}/locations/{location}/processors/{processor_id}
    return `projects/${this.projectId}/locations/${this.location}/processors/${processorId}`;
  }

  /**
   * Get MIME type based on file extension
   * Only supports PDFs and images as per current file upload restrictions
   */
  private getMimeType(fileName: string): string {
    const extension = fileName.toLowerCase().split(".").pop();

    switch (extension) {
      case "pdf":
        return "application/pdf";
      case "png":
        return "image/png";
      case "jpg":
      case "jpeg":
        return "image/jpeg";
      case "gif":
        return "image/gif";
      case "bmp":
        return "image/bmp";
      case "webp":
        return "image/webp";
      default:
        return "application/pdf"; // Default to PDF for unsupported extensions
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
    const paragraphs = text.split("\n\n").length;
    const sentences = text.split(/[.!?]+/).length;

    if (paragraphs > 1) confidence += 10;
    if (sentences > 5) confidence += 10;

    // Bonus for legal terminology
    const legalTerms = [
      "whereas",
      "therefore",
      "hereby",
      "herein",
      "hereof",
      "hereto",
      "party",
      "parties",
      "agreement",
      "contract",
      "shall",
      "may",
      "pursuant",
      "according",
      "subject",
      "provided",
      "except",
    ];

    const legalTermCount = legalTerms.filter((term) =>
      text.toLowerCase().includes(term)
    ).length;

    confidence += Math.min(legalTermCount * 2, 20);

    // Cap at 100%
    return Math.min(confidence, 100);
  }

  /**
   * Extract entities from the document
   */
  private extractEntities(
    document: any
  ): Array<{ type: string; text: string; confidence: number }> {
    const entities: Array<{ type: string; text: string; confidence: number }> =
      [];

    if (document.entities) {
      for (const entity of document.entities) {
        entities.push({
          type: entity.type || "unknown",
          text: entity.mentionText || "",
          confidence: entity.confidence || 0,
        });
      }
    }

    return entities;
  }

  /**
   * Extract tables from the document
   */
  private extractTables(
    document: any
  ): Array<{ rows: number; columns: number; text: string }> {
    const tables: Array<{ rows: number; columns: number; text: string }> = [];

    if (document.pages) {
      for (const page of document.pages) {
        if (page.tables) {
          for (const table of page.tables) {
            let tableText = "";
            let maxRows = 0;
            let maxCols = 0;

            if (table.headerRows) {
              for (const row of table.headerRows) {
                if (row.cells) {
                  maxCols = Math.max(maxCols, row.cells.length);
                  for (const cell of row.cells) {
                    if (cell.text) {
                      tableText += cell.text + "\t";
                    }
                  }
                  tableText += "\n";
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
                      tableText += cell.text + "\t";
                    }
                  }
                  tableText += "\n";
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
      console.log("🔍 [DocumentAI][TEST] Testing Document AI connection...");

      // Test basic client initialization
      if (!this.projectId) {
        throw new Error(
          "FIRESTORE_PROJECT_ID or GOOGLE_CLOUD_PROJECT_ID not configured"
        );
      }

      console.log(`🟦 [DocumentAI][TEST] Project ID: ${this.projectId}`);
      console.log(`🟦 [DocumentAI][TEST] Location: ${this.location}`);

      // Test processor availability and auto-creation
      console.log(`🟦 [DocumentAI][TEST] Testing processor auto-creation...`);

      try {
        const processor = await this.getOrCreateProcessor("LAYOUT_PARSER");
        console.log(`🟩 [DocumentAI][TEST] Processor ready: ${processor.id}`);
      } catch (processorError) {
        console.error(
          `🟥 [DocumentAI][TEST] Processor creation failed:`,
          processorError
        );
        throw processorError;
      }

      // Test with a minimal document
      const testBuffer = Buffer.from(
        "%PDF-1.4\n1 0 obj\n<<\n/Type /Catalog\n/Pages 2 0 R\n>>\nendobj\n2 0 obj\n<<\n/Type /Pages\n/Kids [3 0 R]\n/Count 1\n>>\nendobj\n3 0 obj\n<<\n/Type /Page\n/Parent 2 0 R\n/MediaBox [0 0 612 792]\n/Contents 4 0 R\n>>\nendobj\n4 0 obj\n<<\n/Length 44\n>>\nstream\nBT\n/F1 12 Tf\n72 720 Td\n(Test Document) Tj\nET\nendstream\nendobj\nxref\n0 5\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \n0000000204 00000 n \ntrailer\n<<\n/Size 5\n/Root 1 0 R\n>>\nstartxref\n364\n%%EOF"
      );

      const result = await this.processDocument(testBuffer, "test.pdf", {
        processorType: "LAYOUT_PARSER",
        enableOCR: false,
      });

      console.log(`🟩 [DocumentAI][TEST] Connection test successful`);
      console.log(
        `🟦 [DocumentAI][TEST] Test result: ${
          result.text.length
        } characters, ${result.confidence.toFixed(2)}% confidence`
      );

      return true;
    } catch (error) {
      console.error(`🟥 [DocumentAI][TEST] Connection test failed:`, error);
      return false;
    }
  }
}

// Export singleton instance
export const documentAIService = new DocumentAIService();
