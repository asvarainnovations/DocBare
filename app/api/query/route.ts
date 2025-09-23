import { NextRequest, NextResponse } from "next/server";
import axios from "axios";
import { aiLogger } from "@/lib/logger";
import { validateQuery } from "@/lib/validation";
import { memoryManager } from "@/lib/memory";
import { StreamingOrchestrator } from "@/lib/streamingOrchestrator";
import { USE_MULTI_AGENT } from "@/lib/config";
import firestore from "@/lib/firestore";
import { isAbortError, getAbortErrorMessage } from "@/lib/abortController";

export async function GET(req: NextRequest) {
  aiLogger.info("Query route GET method called", {
    method: req.method,
    url: req.url,
    headers: Object.fromEntries(req.headers.entries()),
  });

  return NextResponse.json({
    status: "Query API is working",
    timestamp: new Date().toISOString(),
    method: "GET",
  });
}

export async function POST(req: NextRequest) {
  // Temporarily disable rate limiting to debug the issue
  // return withRateLimit(rateLimitConfigs.ai)(async (req: NextRequest) => {
  try {
    aiLogger.info("Query route called", {
      method: req.method,
      url: req.url,
      headers: Object.fromEntries(req.headers.entries()),
    });

    // Validate request
    const validation = await validateQuery(req);
    if (validation.error) {
      aiLogger.error("Validation failed", { error: validation.error });
      return validation.error;
    }

    const { query, userId, sessionId } = validation.data;

    // AI query request received

    // Log the current mode
    aiLogger.info("Processing query", {
      mode: USE_MULTI_AGENT ? "Multi-Agent" : "Single-Agent",
      sessionId,
      userId,
      queryLength: query.length,
    });

    // Retrieve document context from chat session
    let documentContent = "";
    let documentName = "";
    if (sessionId) {
      try {
        const sessionDoc = await firestore
          .collection("chat_sessions")
          .doc(sessionId)
          .get();
        if (sessionDoc.exists) {
          const sessionData = sessionDoc.data();
          const documentContext = sessionData?.documentContext || [];

          aiLogger.info("Session data retrieved", {
            sessionId,
            hasDocumentContext: !!sessionData?.documentContext,
            documentContextLength: documentContext.length,
            documentContext: documentContext
          });

          if (documentContext.length > 0) {
            aiLogger.info("Found document context in session", {
              sessionId,
              documentCount: documentContext.length,
            });

            // Retrieve document content from chunks
            for (const doc of documentContext) {
              try {
                const chunksSnapshot = await firestore
                  .collection("document_chunks")
                  .where("documentId", "==", doc.documentId)
                  .orderBy("chunkIndex", "asc")
                  .get();

                aiLogger.info("Document chunks query", {
                  documentId: doc.documentId,
                  chunksFound: chunksSnapshot.size,
                  chunksEmpty: chunksSnapshot.empty
                });

                if (!chunksSnapshot.empty) {
                  const docText = chunksSnapshot.docs
                    .map((chunk: any) => chunk.data().text)
                    .join("\n\n");
                  documentContent += `\n\n--- Document: ${doc.fileName} ---\n${docText}\n`;
                  documentName = doc.fileName;
                  aiLogger.info("Retrieved document content", {
                    documentId: doc.documentId,
                    fileName: doc.fileName,
                    contentLength: docText.length,
                  });
                }
              } catch (docError) {
                aiLogger.warn("Failed to retrieve document content", {
                  documentId: doc.documentId,
                  error: docError,
                });
              }
            }
          }
        }
      } catch (sessionError) {
        aiLogger.warn("Failed to retrieve session document context", {
          sessionId,
          error: sessionError,
        });
      }
    }

    // Generate memory context if sessionId is provided
    let memoryContext = "";
    let conversationHistory: Array<{role: 'user' | 'assistant', content: string}> = [];
    if (sessionId) {
      try {
        memoryContext = await memoryManager.generateMemoryContext(
          sessionId,
          userId,
          query
        );
        // Get conversation history in API format
        conversationHistory = await memoryManager.getConversationHistoryForAPI(sessionId, 10);
        
        if (process.env.NODE_ENV === 'development') {
          aiLogger.info('🟦 [query][DEBUG] Memory context and conversation history', {
            sessionId,
            userId,
            hasMemoryContext: !!memoryContext,
            memoryContextLength: memoryContext.length,
            conversationHistoryCount: conversationHistory.length,
            conversationHistory: conversationHistory.map(msg => ({
              role: msg.role,
              content: msg.content.substring(0, 50) + '...'
            }))
          });
        }
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          aiLogger.error('🟥 [query][ERROR] Failed to get memory context', error);
        }
        // Continue without memory context if it fails
      }
    }

    // Use the streaming orchestrator to handle both single-agent and multi-agent modes
    let stream: any;
    let finalAnswer = "";

    try {
      const streamingContext = {
        query,
        sessionId: sessionId || "",
        userId,
        documentContent: documentContent.trim(), // Pass retrieved document content
        documentName: documentName,
        conversationHistory: conversationHistory, // Pass conversation history
        abortSignal: req.signal, // Pass the request's abort signal
      };

      stream = await StreamingOrchestrator.streamResponse(streamingContext);
    } catch (llmErr: any) {
      // Handle abort errors specifically
      if (isAbortError(llmErr)) {
        aiLogger.warn("🟨 [query][WARNING] Request was aborted", {
          sessionId,
          userId,
          query: query.substring(0, 100),
          reason: getAbortErrorMessage(llmErr)
        });
        return NextResponse.json(
          { error: getAbortErrorMessage(llmErr) },
          { status: 499 } // Client Closed Request
        );
      }
      
      const apiError = llmErr?.response?.data?.error;
      if (apiError && apiError.message === "Insufficient Balance") {
        aiLogger.error("DeepSeek API insufficient balance", llmErr);
        return NextResponse.json(
          {
            error:
              "DeepSeek API: Insufficient balance. Please check your account credits.",
          },
          { status: 402 }
        );
      }
      aiLogger.error("Streaming orchestrator error", llmErr);
      return NextResponse.json(
        { error: "Failed to get response from AI system." },
        { status: 500 }
      );
    }

    // 2. Stream response to client and collect answer for logging
    const encoder = new TextEncoder();
    let errorDuringStream: any = null;
    const readable = new ReadableStream({
      async start(controller) {
        let answer = "";

        try {
          const reader = stream.getReader();
          const decoder = new TextDecoder();

          while (true) {
            // Check if request was aborted
            if (req.signal?.aborted) {
              aiLogger.warn("🟨 [query][WARNING] Stream aborted by user during reading");
              controller.close();
              return;
            }
            
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            answer += chunk;
            finalAnswer = answer; // Update final answer as we receive chunks

            controller.enqueue(encoder.encode(chunk));
          }

          controller.close();
        } catch (error: any) {
          aiLogger.error("Stream error", { error: error.message });
          errorDuringStream = error;
          controller.error(error);
        }
      },
    });

    // 3. Store memories if sessionId is provided
    if (sessionId && !errorDuringStream) {
      try {
        if (process.env.NODE_ENV === 'development') {
          aiLogger.info('🟦 [query][DEBUG] Storing conversation memories', {
            sessionId,
            userId,
            query: query.substring(0, 50) + '...',
            finalAnswer: finalAnswer.substring(0, 50) + '...'
          });
        }

        // Store user query as conversation memory
        const userMemoryId = await memoryManager.storeConversationMemory(
          sessionId,
          userId,
          "user",
          query
        );

        // Store AI response as conversation memory - ONLY content, NOT reasoning_content
        // Remove any thinking content that might have leaked into finalAnswer
        const cleanFinalAnswer = finalAnswer
          .replace(/^THINKING:[\s\S]*?FINAL:/, '') // Remove thinking content prefix
          .replace(/^FINAL:/, '') // Remove FINAL: prefix
          .trim();
        
        const assistantMemoryId = await memoryManager.storeConversationMemory(
          sessionId,
          userId,
          "assistant",
          cleanFinalAnswer
        );

        if (process.env.NODE_ENV === 'development') {
          aiLogger.info('🟦 [query][DEBUG] Conversation memories stored', {
            sessionId,
            userId,
            userMemoryId,
            assistantMemoryId,
            originalAnswerLength: finalAnswer.length,
            cleanedAnswerLength: cleanFinalAnswer.length
          });
        }

        // Extract and store reasoning from the response
        const reasoningMatch = finalAnswer.match(
          /## Reasoning:([\s\S]*?)(?=##|$)/
        );
        if (reasoningMatch) {
          await memoryManager.storeReasoningMemory(
            sessionId,
            userId,
            reasoningMatch[1].trim(),
            { source: "response_analysis" }
          );
        }
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          aiLogger.error('🟥 [query][ERROR] Failed to store conversation memories', {
            sessionId,
            userId,
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined
          });
        }
        // Don't fail the request if memory storage fails
      }
    }

    // 4. Log the complete interaction
    // aiLogger.info("AI query completed", {
    //   query: query.substring(0, 200) + (query.length > 200 ? '...' : ''),
    //   answerLength: finalAnswer.length,
    //   sessionId,
    //   userId,
    //   memoryContextLength: memoryContext.length,
    //   chunksCount: chunks.length,
    // });

    return new NextResponse(readable, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error: any) {
    aiLogger.error("Query route error", {
      error: error.message,
      stack: error.stack,
    });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
  // });
}
