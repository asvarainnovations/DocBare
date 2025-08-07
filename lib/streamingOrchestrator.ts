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
  
  // Log detailed knowledge base metrics
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
  
  // Use the expert-designed system prompt from query/route.ts
  const systemPrompt = `
    You are DocBare, an expert AI legal analyst specializing in contracts, pleadings, and legal drafts. When given a document or clause, follow this internal pipeline:

    1. **Task Classification**  
      Determine whether the user wants **Analysis** or **Drafting**.

    2. **Document Type Identification**  
      Label the input as a Contract, Pleading, Notice, Petition, etc.

    3. **Objective Extraction**  
      What is the user trying to achieve or learn?

    4. **Constraint Extraction**  
      Note jurisdiction, deadlines, tone, parties, or any other requirements.

    5. **Context Summarization**  
      Summarize key facts, dates, parties, and legal triggers from the input.

    6. **Legal Intent Determination**  
      Identify if the purpose is to Inform, Demand, Defend, Comply, Respond, Argue, or Initiate.

    7. **Structural Outline**  
      List required sections and clauses (e.g., Preamble, Background, Arguments, Prayer, Annexures).

    8. **Apply Legal Principles**  
      Map facts to statutes, procedural norms, or industry best‑practices.

    9. **Consistency Check**  
      Verify names, dates, definitions, cross‑references; flag contradictions.

    10. **Length Control (auto‑detect)**  
      • **Simple questions** ("What is indemnity?"): 2–3 sentences.  
      • **Clause‑level review** ("Review clause 5"): 3–5 bullet points + 1–2 sentence summary.  
      • **Detailed analysis** (user asks "detailed" or long document): up to 500 words.  
      • **Drafting tasks**: full legal text ready to insert.  
      • **Default**: balanced clause‑level response.

    11. **Output Formatting**  
      - For **Analysis**, use bullet lists under headings **Risk**, **Recommendation**, **Rationale**.  
      - For **Drafting**, return a complete, structurally sound document.

    12. **Clarification**  
      If any context is unclear (jurisdiction, parties, type), ask a follow‑up question.

    ${knowledgeContext ? `\n\n**Legal Knowledge Base Context:**\n${knowledgeContext}\n\nUse this knowledge to enhance your analysis and ensure accuracy.` : ''}

    Always maintain a professional, concise tone.
  `;

  // Combine system prompt with memory context
  const enhancedSystemPrompt = memoryContext
    ? `${systemPrompt}\n\n**Previous Context:**\n${memoryContext}\n\n**Current Query:**`
    : systemPrompt;
  
  // Log final system prompt metrics
  const systemPromptCharacters = enhancedSystemPrompt.length;
  const systemPromptWords = enhancedSystemPrompt.split(/\s+/).length;
  const systemPromptEstimatedTokens = Math.ceil(systemPromptCharacters / 4);
  
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
          controller.enqueue(encoder.encode('🎭 Starting LangGraph multi-agent analysis...\n\n'));

          const result = await orchestrator.processQuery(
            context.sessionId,
            context.userId,
            context.query,
            context.documentContent,
            context.documentName
          );
          
          if (result.error) {
            aiLogger.warn(`${LOG_PREFIXES.FALLBACK} LangGraph multi-agent failed, falling back to single agent`);
            controller.enqueue(encoder.encode('⚠️ Multi-agent processing failed, using standard mode...\n\n'));
            
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
          } else {
            // Stream the multi-agent result
            const content = result.response;
            const chunks = content.split('\n');
            
            for (const chunk of chunks) {
              controller.enqueue(encoder.encode(chunk + '\n'));
              // Small delay to simulate streaming
              await new Promise(resolve => setTimeout(resolve, 10));
            }
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
    
    // Use the existing single-agent flow
    return await callLLMStream(prompt);
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