import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import firestore from "@/lib/firestore";
import OpenAI from "openai";
import { Storage } from "@google-cloud/storage";
import { documentAIService } from "@/lib/documentAI";
import { rateLimit } from "@/lib/rate-limit";

// Rate limiting configuration
const limiter = rateLimit({
  interval: 60 * 1000, // 1 minute
  uniqueTokenPerInterval: 500,
});

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  timeout: 30000, // 30 seconds timeout
  maxRetries: 3,
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
  level: "high" | "medium" | "low";
  reasons: string[];
  suggestions: string[];
}

function calculateParsingConfidence(
  extractedText: string,
  fileName: string,
  fileSize: number
): ParsingConfidence {
  const reasons: string[] = [];
  const suggestions: string[] = [];
  let score = 100;

  // Check text length
  const textLength = extractedText.trim().length;
  if (textLength < 100) {
    score -= 40;
    reasons.push(`Extracted text is very short (${textLength} characters)`);
    suggestions.push("Document may be image-based or corrupted");
  } else if (textLength < 500) {
    score -= 20;
    reasons.push(`Extracted text is short (${textLength} characters)`);
    suggestions.push("Consider re-uploading in DOCX or TXT format");
  }

  // Check for fallback content patterns
  if (
    extractedText.includes("Document Content -") ||
    extractedText.includes("PDF Document Content -")
  ) {
    score -= 50;
    reasons.push("Fallback content detected - parsing likely failed");
    suggestions.push(
      "Try uploading a different file format or re-scanning the document"
    );
  }

  // Check for meaningful content patterns
  const hasLegalTerms =
    /(whereas|agreement|contract|plaintiff|defendant|clause|section|article)/i.test(
      extractedText
    );
  const hasPunctuation = /[.!?]/.test(extractedText);
  const hasSpaces = /\s/.test(extractedText);

  if (!hasLegalTerms && textLength > 200) {
    score -= 10;
    reasons.push("No legal terminology detected in extracted text");
  }

  if (!hasPunctuation && textLength > 100) {
    score -= 15;
    reasons.push("No punctuation detected - may be OCR artifacts");
    suggestions.push("Consider using Google Document AI for better OCR");
  }

  if (!hasSpaces && textLength > 50) {
    score -= 25;
    reasons.push("No spaces detected - likely OCR failure");
    suggestions.push("Document may need better OCR processing");
  }

  // Check file size vs content ratio
  const contentRatio = textLength / fileSize;
  if (contentRatio < 0.01 && fileSize > 10000) {
    score -= 20;
    reasons.push("Low content-to-file-size ratio");
    suggestions.push("File may be image-heavy or compressed");
  }

  // Determine confidence level
  let level: "high" | "medium" | "low";
  if (score >= 80) {
    level = "high";
  } else if (score >= 50) {
    level = "medium";
  } else {
    level = "low";
  }

  // Add general suggestions based on level
  if (level === "low") {
    suggestions.push(
      "Consider re-uploading in DOCX or TXT format for better results"
    );
    suggestions.push(
      "If this is a scanned document, try using Google Document AI"
    );
  }

  return {
    score: Math.max(0, score),
    level,
    reasons,
    suggestions,
  };
}

async function extractTextWithDocumentAI(
  fileUrl: string,
  mimeType: string,
  fileName: string
): Promise<{ text: string; confidence: ParsingConfidence; method: string }> {
  try {
    console.log(
      `🟦 [ingest][INFO] Processing document with Document AI: ${fileName}`
    );

    // Download the file from GCS
    const file = bucket.file(fileName);
    const [buffer] = await file.download();
    console.log(`🟩 [ingest][SUCCESS] File downloaded: ${buffer.length} bytes`);

    if (mimeType.startsWith("text/")) {
      // For text files, process directly
      const text = buffer.toString("utf8");
      console.log(
        `🟩 [ingest][SUCCESS] Text file processed: ${text.length} characters`
      );
      const confidence = calculateParsingConfidence(
        text,
        fileName,
        buffer.length
      );
      return { text, confidence, method: "text" };
    }

    // Use Document AI for all other file types
    const options = {
      enableOCR: mimeType.startsWith("image/"), // Enable OCR for images
      extractTables: true, // Extract tables for better legal document processing
      extractEntities: true, // Extract entities for legal documents
    };

    const result = await documentAIService.processDocument(
      buffer,
      fileName,
      options
    );

    if (result.confidence > 0) {
      console.log(
        `🟩 [ingest][SUCCESS] Document AI processed successfully: ${result.text.length} characters`
      );
      console.log(
        `🟦 [ingest][INFO] Document AI confidence: ${result.confidence.toFixed(
          2
        )}%`
      );
      console.log(`🟦 [ingest][INFO] Pages processed: ${result.pages}`);
      console.log(
        `🟦 [ingest][INFO] Processing time: ${result.processingTime}ms`
      );

      // Convert Document AI confidence to our format
      const confidence: ParsingConfidence = {
        score: result.confidence,
        level:
          result.confidence >= 80
            ? "high"
            : result.confidence >= 50
            ? "medium"
            : "low",
        reasons: [],
        suggestions: [],
      };

      // Add reasons based on confidence level
      if (confidence.level === "low") {
        confidence.reasons.push(
          `Document AI confidence is low (${result.confidence.toFixed(2)}%)`
        );
        confidence.suggestions.push(
          "Consider re-uploading in a different format"
        );
        confidence.suggestions.push(
          "Check if the document is clear and readable"
        );
      }

      return { text: result.text, confidence, method: "document_ai" };
    } else {
      throw new Error("Document AI returned zero confidence");
    }
  } catch (error) {
    console.warn(
      `🟨 [ingest][WARN] Document AI processing failed, using fallback:`,
      error instanceof Error ? error.message : "Unknown error"
    );

    // Fallback to basic text extraction for PDFs and DOCX files
    if (mimeType === "application/pdf" || mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
      console.log(`🟦 [ingest][INFO] Trying fallback text extraction for ${mimeType}`);
      try {
        const file = bucket.file(fileName);
        const [buffer] = await file.download();
        
        let extractedText = "";
        
        if (mimeType === "application/pdf") {
          // PDF fallback extraction
          const bufferString = buffer.toString("utf8");

        // Method 1: Extract text streams with aggressive filtering
        const textStreams = bufferString.match(/BT[\s\S]*?ET/g);
        if (textStreams && textStreams.length > 0) {
          const streamText = textStreams
            .join(" ")
            .replace(/BT|ET/g, "")
            .replace(/\[[^\]]*\]/g, " ")
            .replace(/[0-9]+ [0-9]+ Td/g, " ")
            .replace(/[0-9]+ [0-9]+ Tj/g, " ")
            .replace(/\/[A-Za-z]+/g, " ") // Remove PDF commands
            .replace(/[0-9]+ [0-9]+ [0-9]+ [0-9]+/g, " ") // Remove coordinates
            .replace(/CreationDate|ModDate|Producer|Creator/g, " ") // Remove metadata
            .replace(/Times-Roman|Helvetica|Courier/g, " ") // Remove font names
            .replace(/\s+/g, " ")
            .trim();

          // Only accept if it looks like real text
          if (
            streamText.length > 100 &&
            !streamText.includes("PDF") &&
            !streamText.includes("obj") &&
            !streamText.includes("stream") &&
            !streamText.includes("xref") &&
            /[a-zA-Z]{3,}/.test(streamText)
          ) {
            // Must contain actual words
            extractedText = streamText.substring(0, 3000);
          }
        }

        // Method 2: Extract readable text patterns with enhanced filtering
        if (!extractedText) {
          const textMatches = bufferString.match(/[\x20-\x7E]{20,}/g);
          if (textMatches && textMatches.length > 0) {
            const readableText = textMatches
              .filter(
                (text) =>
                  text.length > 20 &&
                  !text.includes("PDF") &&
                  !text.includes("obj") &&
                  !text.includes("stream") &&
                  !text.includes("endstream") &&
                  !text.includes("xref") &&
                  !text.includes("trailer") &&
                  !text.includes("CreationDate") &&
                  !text.includes("ModDate") &&
                  !text.includes("Producer") &&
                  !text.includes("Creator") &&
                  !text.includes("Times-Roman") &&
                  !text.includes("Helvetica") &&
                  !text.includes("Courier") &&
                  !text.includes("/Type/") &&
                  !text.includes("/Filter/") &&
                  !text.includes("/Length") &&
                  !text.includes("/Font") &&
                  !text.includes("/MediaBox") &&
                  !text.includes("/Resources") &&
                  !text.includes("/Contents") &&
                  /[a-zA-Z]{3,}/.test(text) // Must contain actual words
              )
              .join(" ");

            if (readableText.length > 100) {
              extractedText = readableText.substring(0, 2000);
            }
          }
        }

        // Method 3: Extract content streams
        if (!extractedText) {
          const contentStreams = bufferString.match(/stream[\s\S]*?endstream/g);
          if (contentStreams && contentStreams.length > 0) {
            const contentText = contentStreams
              .map((stream) => stream.replace(/stream|endstream/g, ""))
              .join(" ")
              .replace(/[0-9]+ [0-9]+ Td/g, " ")
              .replace(/[0-9]+ [0-9]+ Tj/g, " ")
              .replace(/\s+/g, " ")
              .trim();

            if (contentText.length > 100 && !contentText.includes("PDF")) {
              extractedText = contentText.substring(0, 2000);
            }
          }
        }
        
        } else if (mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
          // DOCX fallback extraction - try to extract text from the ZIP structure
          try {
            // DOCX files are ZIP files containing XML
            const bufferString = buffer.toString("utf8");
            
            // Look for common DOCX content patterns
            const contentPatterns = [
              /<w:t[^>]*>([^<]+)<\/w:t>/g,  // Word text elements
              /<w:r[^>]*>([^<]+)<\/w:r>/g,  // Word run elements
              /<p[^>]*>([^<]+)<\/p>/g,      // Paragraph elements
              /<text[^>]*>([^<]+)<\/text>/g // Generic text elements
            ];
            
            for (const pattern of contentPatterns) {
              const matches = bufferString.match(pattern);
              if (matches && matches.length > 0) {
                const text = matches
                  .map(match => match.replace(/<[^>]*>/g, " ")) // Remove XML tags
                  .join(" ")
                  .replace(/\s+/g, " ")
                  .trim();
                
                if (text.length > 50 && /[a-zA-Z]{3,}/.test(text)) {
                  extractedText = text.substring(0, 5000);
                  console.log(`🟩 [ingest][SUCCESS] DOCX text extracted using pattern: ${text.length} characters`);
                  break;
                }
              }
            }
            
            // If no XML patterns found, try to extract any readable text
            if (!extractedText) {
              const readableText = bufferString
                .replace(/[^\x20-\x7E]/g, " ") // Keep only printable ASCII
                .replace(/\s+/g, " ")
                .trim();
              
              // Extract meaningful text blocks
              const textBlocks = readableText.match(/[A-Za-z\s]{20,}/g);
              if (textBlocks && textBlocks.length > 0) {
                const combinedText = textBlocks.join(" ");
                if (combinedText.length > 100) {
                  extractedText = combinedText.substring(0, 3000);
                  console.log(`🟩 [ingest][SUCCESS] DOCX text extracted from readable blocks: ${extractedText.length} characters`);
                }
              }
            }
          } catch (docxError) {
            console.warn(`🟨 [ingest][WARN] DOCX fallback extraction failed:`, docxError);
          }
        }

        if (extractedText) {
          console.log(
            `🟩 [ingest][SUCCESS] Fallback text extraction: ${extractedText.length} characters`
          );
          const confidence = calculateParsingConfidence(
            extractedText,
            fileName,
            buffer.length
          );
          return { text: extractedText, confidence, method: "fallback" };
        } else {
          console.warn(
            `🟨 [ingest][WARN] No readable text found in ${mimeType} - likely corrupted or empty`
          );
        }
      } catch (fallbackError) {
        console.warn(
          `🟨 [ingest][WARN] Fallback extraction failed:`,
          fallbackError
        );
      }
    }

    // Final fallback
    const fallbackText = `Document Content - ${fileName} (Document AI processing failed)`;
    const confidence = calculateParsingConfidence(fallbackText, fileName, 0);
    return { text: fallbackText, confidence, method: "error" };
  }
}

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const identifier = request.ip ?? "127.0.0.1";
    const { success } = await limiter.limit(identifier);

    if (!success) {
      console.warn(`🟨 [ingest][WARN] Rate limit exceeded for ${identifier}`);
      return NextResponse.json(
        { error: "Rate limit exceeded. Please try again later." },
        { status: 429 }
      );
    }

    // Check if request is FormData or JSON
    const contentType = request.headers.get("content-type") || "";

    let file: File | null = null;
    let userId: string | null = null;
    let documentId: string | null = null;

    if (contentType.includes("multipart/form-data")) {
      // Handle FormData request (direct file upload)
      const formData = await request.formData();
      file = formData.get("file") as File;
      userId = formData.get("userId") as string;

      if (!file) {
        return NextResponse.json(
          { error: "No file provided" },
          { status: 400 }
        );
      }

      if (!userId) {
        return NextResponse.json(
          { error: "No user ID provided" },
          { status: 400 }
        );
      }

      console.log(
        `🟦 [ingest][INFO] Processing file: ${file.name} for user: ${userId}`
      );

      // Upload file to GCS
      const fileName = `${userId}/${Date.now()}-${file.name}`;
      const fileBuffer = Buffer.from(await file.arrayBuffer());

      const gcsFile = bucket.file(fileName);
      await gcsFile.save(fileBuffer, {
        metadata: {
          contentType: file.type,
        },
      });

      console.log(`🟩 [ingest][SUCCESS] File uploaded to GCS: ${fileName}`);

      // Extract text using Document AI
      const extractionResult = await extractTextWithDocumentAI(
        `gs://${process.env.GCS_BUCKET_NAME}/${fileName}`,
        file.type,
        fileName
      );

      const { text: extractedText, confidence, method } = extractionResult;
      console.log(`🟦 [ingest][INFO] Text extraction method: ${method}`);
      console.log(
        `🟦 [ingest][INFO] Confidence level: ${confidence.level} (${confidence.score}/100)`
      );

      if (confidence.level === "low") {
        console.warn(
          `🟨 [ingest][WARN] Low confidence extraction:`,
          confidence.reasons
        );
      }

      // Split text into chunks
      const chunks = splitIntoChunks(extractedText);
      console.log(`🟦 [ingest][INFO] Split into ${chunks.length} chunks`);

      // Generate embeddings for each chunk
      const embeddings = [];
  for (let i = 0; i < chunks.length; i++) {
    const chunkText = chunks[i];
        console.log(
          `🟦 [ingest][INFO] Generating embedding for chunk ${i + 1}/${
            chunks.length
          }`
        );

        // Generate embeddings with retry logic
        let embeddingResp: any;
        let retryCount = 0;
        const maxRetries = 3;

        while (retryCount < maxRetries) {
          try {
            embeddingResp = await openai.embeddings.create({
              model: "text-embedding-3-small",
              input: chunkText,
            });
            break; // Success, exit retry loop
          } catch (embeddingError) {
            retryCount++;
            console.warn(
              `🟨 [ingest][WARN] Embedding generation failed (attempt ${retryCount}/${maxRetries}):`,
              embeddingError
            );
            if (retryCount >= maxRetries) {
              throw new Error(
                `Failed to generate embeddings after ${maxRetries} attempts`
              );
            }
            // Wait before retry
            await new Promise((resolve) =>
              setTimeout(resolve, 1000 * retryCount)
            );
          }
        }

        const embedding = embeddingResp.data[0].embedding;
        embeddings.push(embedding);

        // Store chunk and embedding in Firestore
        await firestore.collection("document_chunks").add({
          userId,
          documentId: fileName,
      chunkIndex: i,
      text: chunkText,
          embedding,
          metadata: {
            fileName: file.name,
            fileType: file.type,
            fileSize: file.size,
            confidence: confidence.score,
            extractionMethod: method,
            timestamp: new Date(),
          },
        });

        console.log(
          `🟩 [ingest][SUCCESS] Stored chunk ${i + 1}/${chunks.length}`
        );
      }

      // Store document metadata in PostgreSQL
      const document = await prisma.document.create({
        data: {
          userId,
          fileName: file.name,
          path: fileName,
          originalName: file.name,
          mimeType: file.type,
        },
      });

      console.log(
        `🟩 [ingest][SUCCESS] Document processing completed successfully`
      );
      console.log(`🟦 [ingest][INFO] Total chunks: ${chunks.length}`);
      console.log(
        `🟦 [ingest][INFO] Total characters: ${extractedText.length}`
      );
      console.log(`🟦 [ingest][INFO] Confidence: ${confidence.score}/100`);

      return NextResponse.json({
        success: true,
        message: "Document processed successfully",
        data: {
          fileName: file.name,
          chunks: chunks.length,
          characters: extractedText.length,
          confidence: confidence.score,
          method,
          suggestions: confidence.suggestions,
        },
      });
    } else {
      // Handle JSON request (process existing document)
      const body = await request.json();
      documentId = body.documentId;
      userId = body.userId;

      if (!documentId) {
        return NextResponse.json(
          { error: "No document ID provided" },
          { status: 400 }
        );
      }

      if (!userId) {
        return NextResponse.json(
          { error: "No user ID provided" },
          { status: 400 }
        );
      }

      console.log(
        `🟦 [ingest][INFO] Processing existing document: ${documentId} for user: ${userId}`
      );

      // Get document from database
      const document = await prisma.document.findUnique({
        where: { id: documentId, userId },
      });

      if (!document) {
        return NextResponse.json(
          { error: "Document not found" },
          { status: 404 }
        );
      }

      // Download file from GCS
      const gcsFile = bucket.file(document.path);
      const [fileBuffer] = await gcsFile.download();

      // Extract text using Document AI
      const extractionResult = await extractTextWithDocumentAI(
        `gs://${process.env.GCS_BUCKET_NAME}/${document.path}`,
        document.mimeType,
        document.fileName
      );

      const { text: extractedText, confidence, method } = extractionResult;
      console.log(`🟦 [ingest][INFO] Text extraction method: ${method}`);
      console.log(
        `🟦 [ingest][INFO] Confidence level: ${confidence.level} (${confidence.score}/100)`
      );

      if (confidence.level === "low") {
        console.warn(
          `🟨 [ingest][WARN] Low confidence extraction:`,
          confidence.reasons
        );
      }

      // Split text into chunks
      const chunks = splitIntoChunks(extractedText);
      console.log(`🟦 [ingest][INFO] Split into ${chunks.length} chunks`);

      // Generate embeddings for each chunk
      const embeddings = [];
      for (let i = 0; i < chunks.length; i++) {
        const chunkText = chunks[i];
        console.log(
          `🟦 [ingest][INFO] Generating embedding for chunk ${i + 1}/${
            chunks.length
          }`
        );

        // Generate embeddings with retry logic
        let embeddingResp: any;
        let retryCount = 0;
        const maxRetries = 3;

        while (retryCount < maxRetries) {
          try {
            embeddingResp = await openai.embeddings.create({
              model: "text-embedding-3-small",
      input: chunkText,
    });
            break; // Success, exit retry loop
          } catch (embeddingError) {
            retryCount++;
            console.warn(
              `🟨 [ingest][WARN] Embedding generation failed (attempt ${retryCount}/${maxRetries}):`,
              embeddingError
            );
            if (retryCount >= maxRetries) {
              throw new Error(
                `Failed to generate embeddings after ${maxRetries} attempts`
              );
            }
            // Wait before retry
            await new Promise((resolve) =>
              setTimeout(resolve, 1000 * retryCount)
            );
          }
        }

        const embedding = embeddingResp.data[0].embedding;
        embeddings.push(embedding);

        // Store chunk and embedding in Firestore
        await firestore.collection("document_chunks").add({
          userId,
          documentId: documentId,
          chunkIndex: i,
          text: chunkText,
          embedding,
          metadata: {
            fileName: document.fileName,
            fileType: document.mimeType,
            fileSize: fileBuffer.length,
            confidence: confidence.score,
            extractionMethod: method,
            timestamp: new Date(),
          },
        });

        console.log(
          `🟩 [ingest][SUCCESS] Stored chunk ${i + 1}/${chunks.length}`
        );
      }

      console.log(
        `🟩 [ingest][SUCCESS] Document processing completed successfully`
      );
      console.log(`🟦 [ingest][INFO] Total chunks: ${chunks.length}`);
      console.log(
        `🟦 [ingest][INFO] Total characters: ${extractedText.length}`
      );
      console.log(`🟦 [ingest][INFO] Confidence: ${confidence.score}/100`);

      return NextResponse.json({
        success: true,
        message: "Document processed successfully",
        data: {
          fileName: document.fileName,
          chunks: chunks.length,
          characters: extractedText.length,
          confidence: confidence.score,
          method,
          suggestions: confidence.suggestions,
        },
      });
    }
  } catch (error) {
    console.error("🟥 [ingest][ERROR] Error processing document:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    return NextResponse.json(
      {
        error: "Failed to process document",
        details: errorMessage,
      },
      { status: 500 }
    );
  }
}
