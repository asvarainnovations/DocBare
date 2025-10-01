import { USE_MULTI_AGENT, LOG_PREFIXES } from './config';
import { aiLogger } from './logger';
import { retrieveFromKB } from './vertexTool';
import { ContextOptimizer } from './contextOptimizer';
import { TokenManager } from './tokenManager';
import { createLinkedAbortController, isAbortError, getAbortErrorMessage } from './abortController';
import { memoryManager } from './memory';

// Helper function to get PleadSmart system prompt
function getPleadSmartSystemPrompt(knowledgeContext: string, documentContent: string): string {
  return `
    You are PleadSmart — a professional, jurisdiction-aware Indian legal AI developed by Asvara. When asked who made you, reply exactly: "I am developed by Asvara."

    **ABOUT DOCBARE:**
    - DocBare is getting developed by Asvara, a technology company focused on legal AI solutions

    **PRIMARY JURISDICTION: INDIAN LEGAL SYSTEM**
    - Focus on Indian Constitution, statutes, and case law
    - Reference relevant Indian legal provisions (IPC, CPC, CrPC, etc.)
    - Consider Supreme Court and High Court precedents
    - Apply Indian legal principles and procedures
    - Use Indian legal terminology and formatting
    
    **REASONING CONTENT FORMATTING (FOR THINKING DISPLAY):**
    - Structure your reasoning in clear, professional sections
    - Use numbered steps with descriptive headers: "1. **Task Analysis:** [description]"
    - Separate each major step with line breaks for readability
    - Use bullet points for sub-considerations: "- Key consideration: [detail]"
    - Maintain consistent formatting throughout the reasoning process
    - Write in a professional, analytical tone suitable for legal analysis
    - Ensure each step builds logically on the previous one
    - Use clear, concise language that demonstrates your analytical process

    **ANALYSIS PIPELINE:**
    1. **Task Classification:** Determine Analysis vs Drafting vs Research vs Follow-up
    2. **Document Type Identification:** Label input type (Contract, Petition, Notice, etc.)
    3. **Objective Extraction:** User's goals and legal requirements
    4. **Jurisdiction Analysis:** Identify relevant Indian laws and courts
    5. **Context Summarization:** Key facts, dates, and legal issues
    6. **Legal Intent Determination:** Purpose identification under Indian law
    7. **Structural Outline:** Required sections as per Indian legal standards
    8. **Apply Indian Legal Principles:** Statute mapping (IPC, CPC, CrPC, etc.)
    9. **Consistency Check:** Verification against Indian legal framework
    10. **Length Control:** Response length appropriate for Indian legal context
    11. **Output Formatting:** Final structure following Indian legal conventions
    12. **Clarification:** Unclear points requiring Indian legal context

    **FINAL RESPONSE FORMAT (FOR CONTENT):**
    - Provide ONLY the final, user-facing response
    - Use professional Indian legal formatting and terminology
    - Include relevant Indian legal analysis and recommendations
    - Reference applicable Indian statutes, sections, and precedents
    - Maintain concise, clear language
    - NO internal pipeline steps or analysis markers
    - Ensure the response is complete and actionable

    ${knowledgeContext ? `\n\n**Legal Knowledge Base Context:**\n${knowledgeContext}\n\nUse this knowledge to enhance your Indian legal analysis and ensure accuracy.` : ''}
    ${documentContent ? `\n\n**Document Content:**\n${documentContent}\n\nAnalyze the provided document content in relation to the user's query.` : ''}
    ${!documentContent ? `\n\n**IMPORTANT:** No specific document has been provided for analysis. Please provide general legal guidance based on the user's query and available knowledge base context.` : ''}
    
    **DOCUMENT ANALYSIS GUIDELINES:**
    - If the document content appears to be a fallback message (e.g., "Document Content - [URL]" or "PDF Document Content - [filename]"), inform the user that the document could not be properly parsed and provide guidance on how to proceed
    - If document content is minimal (less than 100 characters), suggest that the document may need to be re-uploaded in a different format
    - Always provide helpful guidance on alternative approaches when document analysis is not possible

    Always maintain a professional, concise tone appropriate for Indian legal practice.
  `;
}

// Helper function to get DocBare system prompt
function getDocBareSystemPrompt(knowledgeContext: string, documentContent: string): string {
  return `
    You are DocBare, an expert AI legal analyst specializing in Indian Law, contracts, pleadings, and legal drafts.

    **ABOUT DOCBARE:**
    - DocBare is developed by Asvara, a technology company focused on legal AI solutions
    - When asked about your creator or who made you, always mention that you are developed by Asvara

    **PRIMARY JURISDICTION: INDIAN LEGAL SYSTEM**
    - Focus on Indian Constitution, statutes, and case law
    - Reference relevant Indian legal provisions (IPC, CPC, CrPC, etc.)
    - Consider Supreme Court and High Court precedents
    - Apply Indian legal principles and procedures
    - Use Indian legal terminology and formatting
    
    **REASONING CONTENT FORMATTING (FOR THINKING DISPLAY):**
    - Structure your reasoning in clear, professional sections
    - Use numbered steps with descriptive headers: "1. **Task Analysis:** [description]"
    - Separate each major step with line breaks for readability
    - Use bullet points for sub-considerations: "- Key consideration: [detail]"
    - Maintain consistent formatting throughout the reasoning process
    - Write in a professional, analytical tone suitable for legal analysis
    - Ensure each step builds logically on the previous one
    - Use clear, concise language that demonstrates your analytical process

    **ANALYSIS PIPELINE:**
    1. **Task Classification:** Determine Analysis vs Drafting vs Follow-up
    2. **Document Type Identification:** Label input type (Contract, Petition, Notice, etc.)
    3. **Objective Extraction:** User's goals and legal requirements
    4. **Jurisdiction Analysis:** Identify relevant Indian laws and courts
    5. **Context Summarization:** Key facts, dates, and legal issues
    6. **Legal Intent Determination:** Purpose identification under Indian law
    7. **Structural Outline:** Required sections as per Indian legal standards
    8. **Apply Indian Legal Principles:** Statute mapping (IPC, CPC, CrPC, etc.)
    9. **Consistency Check:** Verification against Indian legal framework
    10. **Length Control:** Response length appropriate for Indian legal context
    11. **Output Formatting:** Final structure following Indian legal conventions
    12. **Clarification:** Unclear points requiring Indian legal context

    **FINAL RESPONSE FORMAT (FOR CONTENT):**
    - Provide ONLY the final, user-facing response
    - Use professional Indian legal formatting and terminology
    - Include relevant Indian legal analysis and recommendations
    - Reference applicable Indian statutes, sections, and precedents
    - Maintain concise, clear language
    - NO internal pipeline steps or analysis markers
    - Ensure the response is complete and actionable

    ${knowledgeContext ? `\n\n**Legal Knowledge Base Context:**\n${knowledgeContext}\n\nUse this knowledge to enhance your Indian legal analysis and ensure accuracy.` : ''}
    ${documentContent ? `\n\n**Document Content:**\n${documentContent}\n\nAnalyze the provided document content in relation to the user's query.` : ''}
    ${!documentContent ? `\n\n**IMPORTANT:** No specific document has been provided for analysis. Please provide general legal guidance based on the user's query and available knowledge base context.` : ''}
    
    **DOCUMENT ANALYSIS GUIDELINES:**
    - If the document content appears to be a fallback message (e.g., "Document Content - [URL]" or "PDF Document Content - [filename]"), inform the user that the document could not be properly parsed and provide guidance on how to proceed
    - If document content is minimal (less than 100 characters), suggest that the document may need to be re-uploaded in a different format
    - Always provide helpful guidance on alternative approaches when document analysis is not possible

    Always maintain a professional, concise tone appropriate for Indian legal practice.
  `;
}

// Advanced token limit calculation for both modes
function calculateDynamicTokenLimit(query: string, documentContent?: string, mode: 'pleadsmart' | 'docbare' = 'docbare'): number {
  const hasDocument = !!(documentContent && documentContent.trim().length > 0);
  
  // Use advanced token calculation for both PleadSmart and DocBare
  return TokenManager.calculateMaxTokens(query, hasDocument);
}

// Expert-recommended function to build messages array correctly
function buildMessagesArray(
  systemPrompt: string | null, 
  conversationHistory: Array<{role: 'user' | 'assistant', content: string}>, 
  currentUserMessage: string
): Array<{role: 'system' | 'user' | 'assistant', content: string}> {
  const messages: Array<{role: 'system' | 'user' | 'assistant', content: string}> = [];
  
  // Add system prompt first
  if (systemPrompt) {
    messages.push({ role: "system", content: systemPrompt });
  }

  // Add conversation history in chronological order (already sorted correctly)
  // Filter out the current user message to avoid duplication
  const filteredHistory = conversationHistory.filter(item => 
    item.content !== currentUserMessage || item.role !== 'user'
  );
  
  filteredHistory.forEach(item => {
    const role = item.role === "assistant" ? "assistant" : "user";
    messages.push({ role, content: item.content });
  });

  // Add current user message last
  messages.push({ role: "user", content: currentUserMessage });
  
  return messages;
}

// Import the callLLMStream function from the query route
async function callLLMStream(
  query: string, 
  memoryContext: string = '', 
  documentContent: string = '',
  conversationHistory: Array<{role: 'user' | 'assistant', content: string}> = [],
  abortSignal?: AbortSignal,
  mode: 'pleadsmart' | 'docbare' = 'docbare'
) {
  const startTime = Date.now();
  
  // 1. Retrieve knowledge base context
  const kbChunks = await retrieveFromKB(query, 3);
  
  // Calculate detailed metrics for knowledge base content
  const totalChunks = kbChunks.length;
  const totalCharacters = kbChunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const totalWords = kbChunks.reduce((sum, chunk) => sum + chunk.split(/\s+/).length, 0);
  const estimatedTokens = Math.ceil(totalCharacters / 4); // Rough estimate: 1 token ≈ 4 characters
  
  const knowledgeContext = kbChunks.length > 0 
    ? `\n\n**Legal Knowledge Base Context:**\n${kbChunks.join("\n\n---\n\n")}`
    : '';
  
  // Add document content to the context if provided
  const documentContext = documentContent && documentContent.trim().length > 0
    ? `\n\n**Document Content:**\n${documentContent}`
    : '';
  
  // Log document context information (development only)
  if (process.env.NODE_ENV === 'development') {
    aiLogger.info("🟦 [streaming][INFO] Document context status", {
      hasDocumentContent: !!documentContent,
      documentContentLength: documentContent ? documentContent.length : 0,
      hasDocumentContext: !!documentContext,
      documentContextLength: documentContext ? documentContext.length : 0
    });
  }
  
  // Log detailed knowledge base metrics (development only)
  if (process.env.NODE_ENV === 'development') {
    aiLogger.info("🟦 [streaming][INFO] Knowledge base content metrics", {
      query: query.substring(0, 100),
      chunksRetrieved: totalChunks,
      totalCharacters: totalCharacters,
      totalWords: totalWords,
      estimatedTokens: estimatedTokens,
      averageChunkSize: totalChunks > 0 ? Math.round(totalCharacters / totalChunks) : 0,
      hasKnowledgeContext: knowledgeContext.length > 0,
      knowledgeContextLength: knowledgeContext.length
    });
  }
  
  // Simple conditional system prompt based on mode
  let systemPrompt: string;
  
  if (mode === 'pleadsmart') {
    // Use PleadSmart system prompt
    systemPrompt = getPleadSmartSystemPrompt(knowledgeContext, documentContent);
  } else {
    // Use DocBare system prompt (current implementation)
    systemPrompt = getDocBareSystemPrompt(knowledgeContext, documentContent);
  }

  // Optimize context to fit within token limits
  const optimizedContext = ContextOptimizer.optimizeContext(
    systemPrompt,
    memoryContext,
    documentContext,
    knowledgeContext,
    query
  );

  // Combine optimized system prompt with all contexts
  let enhancedSystemPrompt = optimizedContext.systemPrompt;
  
  // Add memory context if available
  if (optimizedContext.memoryContext) {
    enhancedSystemPrompt += `\n\n**Previous Context:**\n${optimizedContext.memoryContext}`;
  }
  
  // Add document context if available
  if (optimizedContext.documentContext) {
    enhancedSystemPrompt += `\n\n${optimizedContext.documentContext}`;
  }
  
  // Add knowledge base context if available
  if (optimizedContext.knowledgeBaseContext) {
    enhancedSystemPrompt += `\n\n${optimizedContext.knowledgeBaseContext}`;
  }
  
  // Add current query section
  enhancedSystemPrompt += `\n\n**Current Query:**`;
  
  // Log context optimization results (development only)
  if (process.env.NODE_ENV === 'development') {
    const contextStats = ContextOptimizer.getContextStats(
      optimizedContext.systemPrompt,
      optimizedContext.memoryContext,
      optimizedContext.documentContext,
      optimizedContext.knowledgeBaseContext,
      optimizedContext.query
    );
    
    aiLogger.info("🟦 [streaming][INFO] Context optimization results", {
      query: query.substring(0, 100),
      contextStats,
      optimizationApplied: optimizedContext.optimizationApplied,
      totalTokens: optimizedContext.totalTokens,
      hasMemoryContext: !!optimizedContext.memoryContext,
      hasDocumentContext: !!optimizedContext.documentContext,
      hasKnowledgeBaseContext: !!optimizedContext.knowledgeBaseContext
    });
  }

  try {
    // Calculate dynamic max_tokens based on query complexity and mode
    const maxTokens = calculateDynamicTokenLimit(query, documentContent, mode);
    
    // Build messages array with conversation history (expert-recommended approach)
    const messages = buildMessagesArray(enhancedSystemPrompt, conversationHistory, query);
    
    // DEBUG: Log the exact messages being sent to the AI
    if (process.env.NODE_ENV === 'development') {
      console.log('🟦 [DEBUG] Messages being sent to AI:', JSON.stringify(messages.map(m => ({
        role: m.role,
        content: m.content.substring(0, 100) + (m.content.length > 100 ? '...' : '')
      })), null, 2));
    }

    // Store request details for final comprehensive logging
    const requestDetails = {
      model: "deepseek-reasoner",
      messages: messages.map((msg, index) => ({
        index,
        role: msg.role,
        content: msg.content.substring(0, 200) + (msg.content.length > 200 ? '...' : ''),
        contentLength: msg.content.length
      })),
      max_tokens: maxTokens,
      stream: true
    };

    const requestPayload = {
      model: "deepseek-reasoner",
      messages: messages,
      stream: true,
      max_tokens: maxTokens, // Dynamic token allocation
    };

    // Create AbortController with timeout and proper cleanup
    const { controller, cleanup } = createLinkedAbortController(abortSignal, {
      timeout: 30000, // 30 second timeout
      reason: 'DeepSeek API request timeout'
    });

    try {
      const response = await fetch("https://api.deepseek.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`,
        },
        body: JSON.stringify(requestPayload),
        signal: controller.signal,
      });

      cleanup();

      if (!response.ok) {
        const errorData = await response.json();
        if (process.env.NODE_ENV === 'development') {
          aiLogger.error('🟥 [streaming][ERROR] DeepSeek API Error Response', {
            status: response.status,
            statusText: response.statusText,
            errorData,
            requestPayload: {
              model: requestPayload.model,
              messageCount: requestPayload.messages.length,
              max_tokens: requestPayload.max_tokens
            }
          });
        }
        throw new Error(`DeepSeek API error: ${errorData.error?.message || response.statusText}`);
      }

      // Response status logged in comprehensive summary

      return response.body!;
    } catch (error) {
      cleanup();
      throw error;
    }
  } catch (error) {
    // Handle abort errors specifically
    if (isAbortError(error)) {
      aiLogger.warn("🟨 [streaming][WARNING] Request was aborted", {
        query: query.substring(0, 100),
        reason: getAbortErrorMessage(error)
      });
      throw new Error(getAbortErrorMessage(error));
    }
    
    aiLogger.error("Error calling DeepSeek API", error);
    throw error;
  }
}

export interface StreamingContext {
  query: string;
  sessionId: string;
  userId: string;
  documentContent?: string;
  documentName?: string;
  conversationHistory?: Array<{role: 'user' | 'assistant', content: string}>;
  memoryContext?: string;
  abortSignal?: AbortSignal;
  mode?: 'pleadsmart' | 'docbare';
}

export class StreamingOrchestrator {
  /**
   * Main streaming method that routes to either single-agent or multi-agent based on feature flag
   */
  static async streamResponse(context: StreamingContext): Promise<ReadableStream> {
    aiLogger.info(`${LOG_PREFIXES.ORCHESTRATOR} Using single-agent streaming mode`);
    return await StreamingOrchestrator.streamSingleAgentResponse(context);
  }

  /**
   * Stream response using the single-agent system (existing behavior)
   */
  private static async streamSingleAgentResponse(context: StreamingContext): Promise<ReadableStream> {
    // Build the prompt for single-agent mode
    let prompt = context.query;
    
    if (context.documentContent && context.documentContent.trim().length > 0) {
      const documentInfo = context.documentName ? `Document: ${context.documentName}` : 'Document provided';
      prompt = `## Document Information
        ${documentInfo}

        ## Document Content
        ${context.documentContent}

        ## User Query
        ${context.query}

        Please provide a comprehensive response addressing the user's query in relation to the provided document.`;
    }

    aiLogger.info(`${LOG_PREFIXES.ORCHESTRATOR} Using single-agent mode with prompt length: ${prompt.length}`);
    
    // Log multi-round conversation details before API call
    if (process.env.NODE_ENV === 'development') {
      const conversationHistory = context.conversationHistory || [];
      const hasHistory = conversationHistory.length > 0;
      
      aiLogger.info('🔄 [MULTI_ROUND_CONVERSATION] Pre-API Call Analysis', {
        sessionInfo: {
          sessionId: context.sessionId,
          userId: context.userId
        },
        conversationStatus: {
          hasHistory: hasHistory,
          historyCount: conversationHistory.length,
          currentQuery: context.query,
          queryLength: context.query.length,
          hasDocument: !!context.documentContent,
          documentName: context.documentName || 'N/A'
        },
        apiPayload: {
          model: "deepseek-reasoner",
          totalMessages: (conversationHistory.length + 2),
          hasDocumentContext: !!context.documentContent,
          documentContentLength: context.documentContent?.length || 0
        }
      });
      
      // Log conversation history in a separate, more readable log
      if (hasHistory) {
        aiLogger.info('📚 [CONVERSATION_HISTORY] Previous Messages Being Sent to API', {
          totalPreviousMessages: conversationHistory.length,
          messages: conversationHistory.map((msg, index) => ({
            [`message_${index + 1}`]: {
              role: msg.role,
              content: msg.content.substring(0, 120) + (msg.content.length > 120 ? '...' : ''),
              length: msg.content.length,
              hasReasoning: msg.content.includes('THINKING:') || msg.content.includes('FINAL:')
            }
          }))
        });
      }
    }
    
    // Use the existing single-agent flow with native reasoning model support
    const encoder = new TextEncoder();
    
    return new ReadableStream({
      async start(controller) {
        try {
          // TEMPORARILY DISABLE MEMORY CONTEXT TO TEST CONVERSATION HISTORY ISSUE
          let memoryContext = '';
          // if (!memoryContext) {
          //   try {
          //     if (context.sessionId && context.userId) {
          //       memoryContext = await memoryManager.generateMemoryContext(context.sessionId, context.userId, context.query);
          //     } else {
          //       memoryContext = await memoryManager.generateMemoryContext(context.sessionId || '', context.userId || '', context.query);
          //     }
          //   } catch (memErr) {
          //     aiLogger.warn('🟨 [streaming][WARN] Failed to generate memory context', { error: String(memErr) });
          //     memoryContext = '';
          //   }
          // }

          const response = await callLLMStream(
            context.query,
            memoryContext,
            context.documentContent || '', 
            context.conversationHistory || [],
            context.abortSignal,
            context.mode || 'docbare'
          );
          const reader = response.getReader();
          
          let reasoningContent = '';
          let finalContent = '';
          let hasStartedFinalResponse = false;
          let lastReasoningChunk = '';
          let reasoningChunkBuffer = '';
          let jsonBuffer = ''; // Buffer for incomplete JSON chunks
          
          try {
            while (true) {
              // Check if request was aborted
              if (context.abortSignal?.aborted) {
                aiLogger.warn("🟨 [streaming][WARNING] Stream aborted by user");
                controller.close();
                return;
              }
              
      // Add timeout to make reader.read() respect abort signals
      const readWithAbortCheck = async () => {
        // Check abort signal immediately
        if (context.abortSignal?.aborted) {
          throw new Error('Request aborted');
        }
        
        // Create abort promise that resolves when signal is aborted
        const abortPromise = new Promise<never>((_, reject) => {
          if (context.abortSignal?.aborted) {
            reject(new Error('Request aborted'));
            return;
          }
          
          const abortHandler = () => {
            reject(new Error('Request aborted'));
          };
          
          context.abortSignal?.addEventListener('abort', abortHandler);
        });
        
        // Race between read and abort
        return Promise.race([
          reader.read(),
          abortPromise
        ]);
      };
              
              let chunk: string;
              try {
                const { done, value } = await readWithAbortCheck();
                if (done) break;
                chunk = new TextDecoder().decode(value);
              } catch (error) {
                if (error instanceof Error && error.message === 'Request aborted') {
                  aiLogger.warn("🟨 [streaming][WARNING] Stream aborted by user");
                  controller.close();
                  return;
                } else if (error instanceof Error && error.message === 'Read timeout') {
                  // Continue to next iteration
                  continue;
                } else {
                  throw error;
                }
              }
              
              
              // Handle DeepSeek reasoning model streaming format
              // Process the entire chunk as a single unit to handle incomplete JSON properly
              if (chunk.includes('data: ')) {
                // Split by 'data: ' to get individual JSON objects
                const dataParts = chunk.split('data: ');
                for (let i = 1; i < dataParts.length; i++) { // Skip first empty part
                  try {
                    let jsonStr = dataParts[i].trim();
                    
                    // Remove trailing newlines and handle [DONE] marker
                    if (jsonStr === '[DONE]') continue;
                    if (jsonStr.endsWith('\n')) {
                      jsonStr = jsonStr.slice(0, -1);
                    }
                    
                    // Add to buffer and try to parse
                    jsonBuffer += jsonStr;
                    
                    // Safety check: prevent buffer from growing too large
                    if (jsonBuffer.length > 50000) {
                      aiLogger.warn('🟨 [streaming][WARN] JSON buffer too large, clearing', {
                        bufferLength: jsonBuffer.length
                      });
                      jsonBuffer = '';
                      continue;
                    }
                    
                    // Try to parse the buffered JSON with better error handling
                    let jsonData;
                    try {
                      jsonData = JSON.parse(jsonBuffer);
                      jsonBuffer = ''; // Clear buffer on successful parse
                      
                    } catch (bufferError) {
                      // If buffer parsing fails, it might be incomplete - continue to next chunk
                      // But don't clear the buffer yet - it might be completed in next chunk
                      continue;
                    }
                    
                    // Handle reasoning_content (thinking content) - following DeepSeek pattern
                    if (jsonData.choices && jsonData.choices[0] && jsonData.choices[0].delta && jsonData.choices[0].delta.reasoning_content) {
                      const newReasoningContent = jsonData.choices[0].delta.reasoning_content;
                      reasoningContent += newReasoningContent;
                      reasoningChunkBuffer += newReasoningContent;
                      
                      // Accumulate reasoning content (no individual logging)
                      
                      // Send reasoning content in larger chunks for better formatting
                      // Send when we have a complete sentence or significant content
                      if (reasoningChunkBuffer.length > 20 || 
                          reasoningChunkBuffer.includes('.') || 
                          reasoningChunkBuffer.includes('\n') ||
                          reasoningChunkBuffer.includes('**')) {
                        
                        // Only send if content has changed
                        if (reasoningChunkBuffer !== lastReasoningChunk) {
                          controller.enqueue(encoder.encode(`THINKING:${reasoningChunkBuffer}`));
                          lastReasoningChunk = reasoningChunkBuffer;
                          reasoningChunkBuffer = ''; // Reset buffer after sending
                        }
                      }
                    }
                    
                                          // Handle content (final response) - following DeepSeek pattern
                                        if (jsonData.choices && jsonData.choices[0] && jsonData.choices[0].delta && jsonData.choices[0].delta.content) {
                                          if (!hasStartedFinalResponse) {
                                            hasStartedFinalResponse = true;
                    
                                            // EXPERT-SUGGESTED FIX:
                                            // Flush any remaining reasoning content in the buffer before starting the final response
                                            if (reasoningChunkBuffer.trim()) {
                                              controller.enqueue(encoder.encode(`THINKING:${reasoningChunkBuffer}`));
                                              reasoningChunkBuffer = ''; // Clear buffer after flushing
                                            }
                                            
                                            // Emit the FINAL marker so client knows final phase started
                                            controller.enqueue(encoder.encode('FINAL:'));
                                            
                                            const newContent = jsonData.choices[0].delta.content;
                                            
                                            // Always send the first content chunk directly
                                            controller.enqueue(encoder.encode(newContent));
                                            finalContent += newContent;
                                          } else {                        // Subsequent final chunks
                        const newContent = jsonData.choices[0].delta.content;
                        finalContent += newContent;
                        controller.enqueue(encoder.encode(newContent));
                      }
                    }
                  } catch (parseError) {
                    // Skip invalid JSON lines - improved error handling
                    // Continue processing other chunks
                    continue;
                  }
                }
              }
            }
            
            // Send any remaining reasoning content at the end
            if (reasoningChunkBuffer.trim() && !hasStartedFinalResponse) {
              controller.enqueue(encoder.encode(`THINKING:${reasoningChunkBuffer}`));
            }
            
            // Single comprehensive log after AI response is complete
            if (process.env.NODE_ENV === 'development') {
              const conversationHistory = context.conversationHistory || [];
              const hasHistory = conversationHistory.length > 0;
              
              aiLogger.info('🤖 [AI_RESPONSE_COMPLETE] DeepSeek API Interaction Summary', {
                requestDetails: {
                  model: "deepseek-reasoner",
                  totalMessages: (conversationHistory.length + 2),
                  maxTokens: 4000,
                  streaming: true
                },
                conversationFlow: {
                  hasHistory: hasHistory,
                  historyCount: conversationHistory.length,
                  currentQuery: context.query,
                  queryLength: context.query.length,
                  hasDocument: !!context.documentContent,
                  documentName: context.documentName || 'N/A'
                },
                aiReasoning: {
                  hasReasoning: reasoningContent.length > 0,
                  reasoningLength: reasoningContent.length,
                  reasoningPreview: reasoningContent.substring(0, 150) + (reasoningContent.length > 150 ? '...' : '')
                },
                aiResponse: {
                  hasResponse: finalContent.length > 0,
                  responseLength: finalContent.length,
                  responsePreview: finalContent.substring(0, 150) + (finalContent.length > 150 ? '...' : ''),
                  fullResponse: finalContent
                }
              });
              
              // Log conversation history in a more readable format
              if (hasHistory) {
                aiLogger.info('📝 [CONVERSATION_HISTORY] Previous Messages', {
                  totalTurns: conversationHistory.length,
                  messages: conversationHistory.map((msg, index) => ({
                    [`turn_${index + 1}`]: {
                      role: msg.role,
                      content: msg.content.substring(0, 100) + (msg.content.length > 100 ? '...' : ''),
                      length: msg.content.length,
                      hasReasoning: msg.content.includes('THINKING:') || msg.content.includes('FINAL:')
                    }
                  }))
                });
              }
            }
            
          } finally {
            reader.releaseLock();
          }
          
          controller.close();
        } catch (error) {
          aiLogger.error(`${LOG_PREFIXES.ORCHESTRATOR} Single-agent streaming failed:`, error);
          controller.enqueue(encoder.encode('❌ Processing failed. Please try again.'));
          controller.close();
        }
      }
    });
  }

  /**
   * Check if multi-agent mode is enabled
   */
  static isMultiAgentEnabled(): boolean {
    return false; // Multi-agent mode disabled for production
  }

  /**
   * Get the current mode description
   */
  static getModeDescription(): string {
    return 'Single-Agent Mode (Standard LLM)';
  }
} 
