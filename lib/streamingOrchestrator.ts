import { LangGraphOrchestrator } from './langgraphOrchestrator';
import { USE_MULTI_AGENT, LOG_PREFIXES } from './config';
import { aiLogger } from './logger';

// Import the callLLMStream function from the query route
async function callLLMStream(query: string, memoryContext: string = '') {
  const startTime = Date.now();
  
  const systemPrompt = `
    You are DocBare, an advanced legal AI assistant specializing in document analysis, legal research, and drafting.

    **Core Capabilities:**
    1. **Document Analysis** - Analyze legal documents, contracts, and agreements
    2. **Legal Research** - Provide accurate legal information and precedents
    3. **Document Drafting** - Help create legal documents and contracts
    4. **Compliance Guidance** - Ensure legal compliance and best practices
    5. **Risk Assessment** - Identify potential legal risks and issues

    **Response Guidelines:**
    1. **Accuracy** - Provide precise, legally sound information
    2. **Clarity** - Use clear, professional language
    3. **Context** - Reference relevant laws, regulations, or precedents
    4. **Practicality** - Offer actionable advice and next steps
    5. **Completeness** - Address all aspects of the query thoroughly
    6. **Reasoning** - Explain your thought process and legal basis

    **Document Analysis Process:**
    1. **Review** - Examine document structure and key provisions
    2. **Identify** - Highlight important clauses, risks, and opportunities
    3. **Analyze** - Assess legal implications and compliance requirements
    4. **Recommend** - Suggest improvements or alternative approaches
    5. **Summarize** - Provide executive summary of findings

    **Legal Research Approach:**
    1. **Jurisdiction** - Consider applicable laws and regulations
    2. **Precedents** - Reference relevant case law and legal principles
    3. **Current Status** - Provide up-to-date legal information
    4. **Practical Impact** - Explain real-world implications
    5. **Next Steps** - Recommend appropriate actions or further research

    **Document Drafting Principles:**
    1. **Structure** - Use clear, logical document organization
    2. **Language** - Employ precise, unambiguous legal terminology
    3. **Compliance** - Ensure adherence to relevant legal requirements
    4. **Protection** - Include appropriate safeguards and provisions
    5. **Clarity** - Make complex legal concepts accessible

    **Response Format:**
    - Use markdown formatting for better readability
    - Include relevant legal citations when applicable
    - Provide structured analysis with clear sections
    - Offer practical recommendations and next steps
    - Maintain professional, authoritative tone

    **Important Notes:**
    - Always clarify jurisdiction if not specified
    - Recommend consulting qualified legal counsel for complex matters
    - Highlight any limitations or disclaimers as appropriate
    - Provide context for legal recommendations
    - Suggest additional research or documentation as needed

    **Clarification**  
      If any context is unclear (jurisdiction, parties, document type), ask a follow‑up question.

    Always maintain a professional, concise tone.
  `;

  // Combine system prompt with memory context
  const enhancedSystemPrompt = memoryContext
    ? `${systemPrompt}\n\n**Previous Context:**\n${memoryContext}\n\n**Current Query:**`
    : systemPrompt;

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