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
    You are DocBare, an expert AI legal analyst specializing in contracts, pleadings, and legal drafts.

    **INTERNAL ANALYSIS PROCESS (NOT FOR USER DISPLAY):**
    When processing requests, follow this internal pipeline but DO NOT include this in your final response:

    1. Task Classification - Determine Analysis vs Drafting
    2. Document Type Identification - Label input type
    3. Objective Extraction - User's goals
    4. Constraint Extraction - Jurisdiction, deadlines, etc.
    5. Context Summarization - Key facts and dates
    6. Legal Intent Determination - Purpose identification
    7. Structural Outline - Required sections
    8. Apply Legal Principles - Statute mapping
    9. Consistency Check - Verification
    10. Length Control - Response length
    11. Output Formatting - Final structure
    12. Clarification - Unclear points

    **FINAL RESPONSE FORMAT:**
    - Provide ONLY the final, user-facing response
    - Use professional legal formatting
    - Include relevant analysis and recommendations
    - Maintain concise, clear language
    - NO internal pipeline steps or analysis markers

    **THINKING DISPLAY:**
    - Your internal analysis will be shown to users in real-time
    - Focus on providing valuable insights in the thinking display
    - Keep final response clean and professional

    ${knowledgeContext ? `\n\n**Legal Knowledge Base Context:**\n${knowledgeContext}\n\nUse this knowledge to enhance your analysis and ensure accuracy.` : ''}

    Always maintain a professional, concise tone.
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
        model: "deepseek-chat",
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
        temperature: 0.1,
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
   * Parse response to separate internal analysis from final response
   */
  private static parseResponse(response: string) {
    const thinkingMarkers = [
      '1. Task Classification',
      '2. Document Type Identification', 
      '3. Objective Extraction',
      '4. Constraint Extraction',
      '5. Context Summarization',
      '6. Legal Intent Determination',
      '7. Structural Outline',
      '8. Apply Legal Principles',
      '9. Consistency Check',
      '10. Length Control',
      '11. Output Formatting',
      '12. Clarification'
    ];
    
    const hasInternalAnalysis = thinkingMarkers.some(marker => 
      response.includes(marker)
    );
    
    if (hasInternalAnalysis) {
      // Extract thinking content (everything before final response)
      let thinkingEnd = response.indexOf('**FINAL RESPONSE:**');
      if (thinkingEnd === -1) {
        thinkingEnd = response.indexOf('---');
      }
      if (thinkingEnd === -1) {
        thinkingEnd = response.length;
      }
      
      const thinkingContent = response.substring(0, thinkingEnd);
      const finalResponse = response.substring(thinkingEnd);
      
      return { thinkingContent, finalResponse };
    }
    
    return { thinkingContent: '', finalResponse: response };
  }

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
    
    // Use the existing single-agent flow with response parsing
    const encoder = new TextEncoder();
    
    return new ReadableStream({
      async start(controller) {
        try {
          const response = await callLLMStream(prompt);
          const reader = response.getReader();
          
          let fullResponse = '';
          let lastThinkingContent = '';
          let lastFinalResponse = '';
          let hasStartedFinalResponse = false;
          
          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              
              const chunk = new TextDecoder().decode(value);
              fullResponse += chunk;
              
              // Parse the accumulated response
              const { thinkingContent: parsedThinking, finalResponse: parsedFinal } = StreamingOrchestrator.parseResponse(fullResponse);
              
              // If we have new thinking content, send it
              if (parsedThinking && parsedThinking !== lastThinkingContent) {
                const newThinkingContent = parsedThinking.substring(lastThinkingContent.length);
                if (newThinkingContent) {
                  controller.enqueue(encoder.encode(`THINKING:${newThinkingContent}`));
                  lastThinkingContent = parsedThinking;
                }
              }
              
              // If we have final response, send it
              if (parsedFinal && parsedFinal !== lastFinalResponse) {
                if (!hasStartedFinalResponse) {
                  hasStartedFinalResponse = true;
                  controller.enqueue(encoder.encode('FINAL:'));
                }
                const newFinalContent = parsedFinal.substring(lastFinalResponse.length);
                if (newFinalContent) {
                  controller.enqueue(encoder.encode(newFinalContent));
                  lastFinalResponse = parsedFinal;
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