import { LangGraphOrchestrator } from './langgraphOrchestrator';
import { USE_MULTI_AGENT, LOG_PREFIXES } from './config';
import { aiLogger } from './logger';
import { retrieveFromKB } from './vertexTool';

// Import the callLLMStream function from the query route
async function callLLMStream(query: string, memoryContext: string = '') {
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

    **INTERNAL ANALYSIS PROCESS (FOR REASONING_CONTENT):**
    When processing requests, follow this structured internal pipeline and include it in your reasoning_content.
    
    **CRITICAL FORMATTING REQUIREMENTS:**
    - Each numbered item MUST be on a separate line with proper line breaks
    - Use clear formatting with line breaks between each step
    - Format numbered items as: "1. **Step Name:** Description" (each on new line)
    - Use bullet points (-) for sub-items with proper indentation
    - Ensure readability with proper spacing
    - Structure your reasoning content in a clean, organized manner
    - Use consistent formatting throughout the analysis

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
    
    **CRITICAL FINAL RESPONSE FORMATTING:**
    - ALWAYS use proper line breaks between numbered items
    - Format numbered lists as: "1. [Title]" followed by a line break, then content
    - Use bullet points (-) for sub-items with proper indentation
    - Ensure each numbered section has clear spacing
    - Use consistent formatting throughout the response
    - Structure content with proper headings and subheadings
    - Maintain professional document formatting standards

    ${knowledgeContext ? `\n\n**Legal Knowledge Base Context:**\n${knowledgeContext}\n\nUse this knowledge to enhance your Indian legal analysis and ensure accuracy.` : ''}

    Always maintain a professional, concise tone appropriate for Indian legal practice.
  `;

  // Combine system prompt with memory context
  const enhancedSystemPrompt = memoryContext
    ? `${systemPrompt}\n\n**Previous Context:**\n${memoryContext}\n\n**Current Query:**`
    : systemPrompt;
  
  // Log final system prompt metrics (development only)
  const systemPromptCharacters = enhancedSystemPrompt.length;
  const systemPromptWords = enhancedSystemPrompt.split(/\s+/).length;
  const systemPromptEstimatedTokens = Math.ceil(systemPromptCharacters / 4);
  
  if (process.env.NODE_ENV === 'development') {
    aiLogger.info("🟦 [streaming][INFO] Final system prompt metrics", {
      query: query.substring(0, 100),
      systemPromptCharacters: systemPromptCharacters,
      systemPromptWords: systemPromptWords,
      systemPromptEstimatedTokens: systemPromptEstimatedTokens,
      hasMemoryContext: !!memoryContext,
      memoryContextLength: memoryContext ? memoryContext.length : 0,
      knowledgeBaseContribution: knowledgeContext.length,
      knowledgeBaseContributionPercentage: systemPromptCharacters > 0 ? Math.round((knowledgeContext.length / systemPromptCharacters) * 100) : 0
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
          const response = await callLLMStream(prompt);
          const reader = response.getReader();
          
          let reasoningContent = '';
          let finalContent = '';
          let hasStartedFinalResponse = false;
          
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
                      controller.enqueue(encoder.encode(`THINKING:${newReasoningContent}`));
                    }
                    
                    // Handle content (final response) - following DeepSeek pattern
                    if (jsonData.choices && jsonData.choices[0] && jsonData.choices[0].delta && jsonData.choices[0].delta.content) {
                      if (!hasStartedFinalResponse) {
                        hasStartedFinalResponse = true;
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