import { LangGraphOrchestrator } from './langgraphOrchestrator';
import { USE_MULTI_AGENT, LOG_PREFIXES } from './config';
import { aiLogger } from './logger';
import { retrieveFromKB } from './vertexTool';
import { ContextOptimizer } from './contextOptimizer';

// Import the callLLMStream function from the query route
async function callLLMStream(query: string, memoryContext: string = '', documentContent: string = '') {
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
  
  // Use the expert-designed system prompt from query/route.ts
  const systemPrompt = `
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
    1. **Task Classification:** Determine Analysis vs Drafting
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
    ${documentContext ? `\n\n**Document Content:**\n${documentContext}\n\nAnalyze the provided document content in relation to the user's query.` : ''}
    ${!documentContext ? `\n\n**IMPORTANT:** No specific document has been provided for analysis. Please provide general legal guidance based on the user's query and available knowledge base context.` : ''}
    
    **DOCUMENT ANALYSIS GUIDELINES:**
    - If the document content appears to be a fallback message (e.g., "Document Content - [URL]" or "PDF Document Content - [filename]"), inform the user that the document could not be properly parsed and provide guidance on how to proceed
    - If document content is minimal (less than 100 characters), suggest that the document may need to be re-uploaded in a different format
    - Always provide helpful guidance on alternative approaches when document analysis is not possible

    Always maintain a professional, concise tone appropriate for Indian legal practice.
  `;

  // Optimize context to fit within token limits
  const optimizedContext = ContextOptimizer.optimizeContext(
    systemPrompt,
    memoryContext,
    documentContext,
    knowledgeContext,
    query
  );

  // Combine optimized system prompt with memory context
  const enhancedSystemPrompt = optimizedContext.memoryContext
    ? `${optimizedContext.systemPrompt}\n\n**Previous Context:**\n${optimizedContext.memoryContext}\n\n**Current Query:**`
    : optimizedContext.systemPrompt;
  
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
    const response = await fetch("https://api.deepseek.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`,
      },
      body: JSON.stringify({
        model: "deepseek-reasoner",
        messages: [
          {
            role: "system",
            content: enhancedSystemPrompt,
          },
          {
            role: "user",
            content: query,
          },
        ],
        stream: true,
        max_tokens: 4000,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`DeepSeek API error: ${errorData.error?.message || response.statusText}`);
    }

    return response.body!;
  } catch (error) {
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
}

export class StreamingOrchestrator {
  /**
   * Main streaming method that routes to either single-agent or multi-agent based on feature flag
   */
  static async streamResponse(context: StreamingContext): Promise<ReadableStream> {
    if (USE_MULTI_AGENT) {
      aiLogger.info(`${LOG_PREFIXES.ORCHESTRATOR} Using LangGraph multi-agent streaming mode`);
      return await StreamingOrchestrator.streamMultiAgentResponse(context);
    } else {
      aiLogger.info(`${LOG_PREFIXES.ORCHESTRATOR} Using single-agent streaming mode`);
      return await StreamingOrchestrator.streamSingleAgentResponse(context);
    }
  }

  /**
   * Stream response using the LangGraph multi-agent system
   */
  private static async streamMultiAgentResponse(context: StreamingContext): Promise<ReadableStream> {
    const encoder = new TextEncoder();
    
    return new ReadableStream({
      async start(controller) {
        try {
          const orchestrator = new LangGraphOrchestrator();

          aiLogger.info(`${LOG_PREFIXES.ORCHESTRATOR} Starting LangGraph multi-agent orchestration`);
          
          // Send initial status
          controller.enqueue(encoder.encode('🎭 Starting multi-agent analysis...\n\n'));

          // Create a streaming version of the multi-agent response
          const streamResult = await orchestrator.streamResponse(
            context.sessionId,
            context.userId,
            context.query,
            context.documentContent,
            context.documentName
          );

          // Read from the stream and forward to the controller
          const reader = streamResult.getReader();
          
          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              controller.enqueue(value);
            }
          } finally {
            reader.releaseLock();
          }
          
          controller.close();
        } catch (error) {
          aiLogger.error(`${LOG_PREFIXES.ORCHESTRATOR} LangGraph multi-agent streaming failed:`, error);
          
          try {
            controller.enqueue(encoder.encode('❌ Multi-agent processing failed, falling back to standard mode...\n\n'));
            
            // Fallback to single agent
            const fallbackStream = await StreamingOrchestrator.streamSingleAgentResponse(context);
            const fallbackReader = fallbackStream.getReader();
            
            try {
              while (true) {
                const { done, value } = await fallbackReader.read();
                if (done) break;
                controller.enqueue(value);
              }
            } finally {
              fallbackReader.releaseLock();
            }
          } catch (fallbackError) {
            aiLogger.error(`${LOG_PREFIXES.FALLBACK} Fallback also failed:`, fallbackError);
            controller.enqueue(encoder.encode('❌ Processing failed. Please try again.'));
          }
          
          controller.close();
        }
      }
    });
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
    
    // Use the existing single-agent flow with native reasoning model support
    const encoder = new TextEncoder();
    
    return new ReadableStream({
      async start(controller) {
        try {
          const response = await callLLMStream(context.query, '', context.documentContent || '');
          const reader = response.getReader();
          
          let reasoningContent = '';
          let finalContent = '';
          let hasStartedFinalResponse = false;
          let lastReasoningChunk = '';
          let reasoningChunkBuffer = '';
          
          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              
              const chunk = new TextDecoder().decode(value);
              
              // Handle DeepSeek reasoning model streaming format
              const lines = chunk.split('\n');
              for (const line of lines) {
                if (line.startsWith('data: ')) {
                  try {
                    const jsonStr = line.slice(6); // Remove 'data: ' prefix
                    if (jsonStr.trim() === '[DONE]') continue;
                    
                    const jsonData = JSON.parse(jsonStr);
                    
                    // Handle reasoning_content (thinking content) - following DeepSeek pattern
                    if (jsonData.choices && jsonData.choices[0] && jsonData.choices[0].delta && jsonData.choices[0].delta.reasoning_content) {
                      const newReasoningContent = jsonData.choices[0].delta.reasoning_content;
                      reasoningContent += newReasoningContent;
                      reasoningChunkBuffer += newReasoningContent;
                      
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
                        // Send any remaining reasoning content before starting final response
                        if (reasoningChunkBuffer.trim()) {
                          controller.enqueue(encoder.encode(`THINKING:${reasoningChunkBuffer}`));
                          reasoningChunkBuffer = '';
                        }
                        controller.enqueue(encoder.encode('FINAL:'));
                      }
                      const newContent = jsonData.choices[0].delta.content;
                      finalContent += newContent;
                      controller.enqueue(encoder.encode(newContent));
                    }
                  } catch (parseError) {
                    // Skip invalid JSON lines - improved error handling
                    if (process.env.NODE_ENV === 'development') {
                      console.warn('🟨 [streaming][WARN] Failed to parse streaming chunk:', parseError);
                    }
                  }
                }
              }
            }
            
            // Send any remaining reasoning content at the end
            if (reasoningChunkBuffer.trim() && !hasStartedFinalResponse) {
              controller.enqueue(encoder.encode(`THINKING:${reasoningChunkBuffer}`));
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
    return USE_MULTI_AGENT;
  }

  /**
   * Get the current mode description
   */
  static getModeDescription(): string {
    return USE_MULTI_AGENT 
      ? 'Multi-Agent Mode (Analysis + Drafting Agents)' 
      : 'Single-Agent Mode (Standard LLM)';
  }
} 