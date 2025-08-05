import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage, AIMessage, SystemMessage } from "@langchain/core/messages";
import { memoryManager } from "./memory";
import { AGENT_CONFIG, MEMORY_CONFIG, ERROR_MESSAGES, LOG_PREFIXES } from "./config";
import { aiLogger } from "./logger";

// Define the state interface for our workflow
export interface AgentState {
  sessionId: string;
  userId: string;
  query: string;
  documentContent?: string;
  documentName?: string;
  hasDocument: boolean;
  analysisResult?: string;
  draftingResult?: string;
  finalResponse?: string;
  error?: string;
  memoryContext: string;
  messages: (HumanMessage | AIMessage | SystemMessage)[];
}

// Initialize the LLM
const llm = new ChatOpenAI({
  modelName: "gpt-4o-mini",
  temperature: 0.1,
  streaming: true,
});

// Main orchestrator class using LangGraph-inspired workflow
export class LangGraphOrchestrator {
  async processQuery(
    sessionId: string,
    userId: string,
    query: string,
    documentContent?: string,
    documentName?: string
  ): Promise<{ response: string; error?: string }> {
    aiLogger.info(`${LOG_PREFIXES.ORCHESTRATOR} Starting LangGraph-inspired processing`, {
      sessionId,
      userId,
      hasDocument: !!documentContent,
      queryLength: query.length
    });

    try {
      // Get memory context
      let memoryContext = '';
      try {
        const memories = await memoryManager.retrieveMemories(sessionId, userId, query, 10);
        memoryContext = memories.map(m => m.content).join('\n\n');
      } catch (error) {
        aiLogger.warn(`${LOG_PREFIXES.MEMORY} Failed to load memory context`, error);
      }

      // Store user query in memory
      await memoryManager.storeConversationMemory(sessionId, userId, 'user', query);

      // Initialize state
      const state: AgentState = {
        sessionId,
        userId,
        query,
        documentContent: documentContent || '',
        documentName: documentName || '',
        hasDocument: !!documentContent,
        memoryContext,
        messages: []
      };

      // Execute workflow using LangGraph-inspired pattern
      const result = await this.executeWorkflow(state);

      aiLogger.info(`${LOG_PREFIXES.ORCHESTRATOR} LangGraph-inspired processing completed`, {
        sessionId,
        hasError: !!result.error,
        hasResponse: !!result.finalResponse
      });

      if (result.error) {
        return { response: '', error: result.error };
      }

      return { response: result.finalResponse || 'No response generated' };
    } catch (error) {
      aiLogger.error(`${LOG_PREFIXES.ORCHESTRATOR} LangGraph-inspired processing error`, error);
      return { 
        response: '', 
        error: ERROR_MESSAGES.ORCHESTRATION_FAILURE 
      };
    }
  }

  // Execute the workflow step by step (LangGraph-inspired pattern)
  private async executeWorkflow(state: AgentState): Promise<AgentState> {
    try {
      // Step 1: Orchestrator - Decide workflow
      aiLogger.info(`${LOG_PREFIXES.ORCHESTRATOR} Starting orchestration`);
      const orchestratorResult = await this.orchestratorNode(state);
      if (orchestratorResult.error) {
        return { ...state, ...orchestratorResult };
      }
      Object.assign(state, orchestratorResult);

      // Step 2: Analysis (if document present)
      if (state.hasDocument && !state.analysisResult) {
        aiLogger.info(`${LOG_PREFIXES.ANALYSIS} Starting document analysis`);
        const analysisResult = await this.analysisNode(state);
        if (analysisResult.error) {
          return { ...state, ...analysisResult };
        }
        Object.assign(state, analysisResult);
      }

      // Step 3: Drafting
      aiLogger.info(`${LOG_PREFIXES.DRAFTING} Starting legal drafting`);
      const draftingResult = await this.draftingNode(state);
      if (draftingResult.error) {
        return { ...state, ...draftingResult };
      }
      Object.assign(state, draftingResult);

      // Step 4: Finalize
      aiLogger.info(`${LOG_PREFIXES.ORCHESTRATOR} Finalizing response`);
      const finalizeResult = await this.finalizeNode(state);
      if (finalizeResult.error) {
        return { ...state, ...finalizeResult };
      }
      Object.assign(state, finalizeResult);

      return state;
    } catch (error) {
      aiLogger.error(`${LOG_PREFIXES.ORCHESTRATOR} Workflow execution error`, error);
      return { ...state, error: ERROR_MESSAGES.ORCHESTRATION_FAILURE };
    }
  }

  // Orchestrator Node - Decides workflow
  private async orchestratorNode(state: AgentState): Promise<Partial<AgentState>> {
    try {
      const orchestratorPrompt = new SystemMessage(AGENT_CONFIG.ORCHESTRATOR_PROMPT);
      const userMessage = new HumanMessage(
        `Query: ${state.query}\n\nDocument Available: ${state.hasDocument ? 'Yes' : 'No'}${
          state.hasDocument ? `\nDocument Name: ${state.documentName}` : ''
        }\n\nMemory Context: ${state.memoryContext}`
      );

      const response = await llm.invoke([orchestratorPrompt, userMessage]);
      const decision = response.content as string;

      aiLogger.info(`${LOG_PREFIXES.ORCHESTRATOR} Decision made`, { decision: decision.substring(0, 100) });

      // Store orchestrator decision in memory
      await memoryManager.storeReasoningMemory(
        state.sessionId,
        state.userId,
        `Orchestrator Decision: ${decision}`,
        { source: 'orchestrator', tag: MEMORY_CONFIG.ORCHESTRATION_TAG }
      );

      return {
        messages: [...state.messages, orchestratorPrompt, userMessage, response]
      };
    } catch (error) {
      aiLogger.error(`${LOG_PREFIXES.ORCHESTRATOR} Error`, error);
      return {
        error: ERROR_MESSAGES.ORCHESTRATION_FAILURE
      };
    }
  }

  // Analysis Node - Analyzes documents
  private async analysisNode(state: AgentState): Promise<Partial<AgentState>> {
    try {
      const analysisPrompt = new SystemMessage(AGENT_CONFIG.ANALYSIS_PROMPT);
      const userMessage = new HumanMessage(
        `Document Content:\n${state.documentContent}\n\nQuery: ${state.query}\n\nMemory Context: ${state.memoryContext}`
      );

      const response = await llm.invoke([analysisPrompt, userMessage]);
      const analysisResult = response.content as string;

      aiLogger.info(`${LOG_PREFIXES.ANALYSIS} Analysis completed`, { 
        resultLength: analysisResult.length 
      });

      // Store analysis result in memory
      await memoryManager.storeReasoningMemory(
        state.sessionId,
        state.userId,
        analysisResult,
        { source: 'analysis', tag: MEMORY_CONFIG.ANALYSIS_TAG }
      );

      return {
        analysisResult,
        messages: [...state.messages, analysisPrompt, userMessage, response]
      };
    } catch (error) {
      aiLogger.error(`${LOG_PREFIXES.ANALYSIS} Error`, error);
      return {
        error: ERROR_MESSAGES.ANALYSIS_FAILURE
      };
    }
  }

  // Drafting Node - Creates legal documents
  private async draftingNode(state: AgentState): Promise<Partial<AgentState>> {
    try {
      const draftingPrompt = new SystemMessage(AGENT_CONFIG.DRAFTING_PROMPT);
      
      let userMessage: HumanMessage;
      if (state.analysisResult) {
        userMessage = new HumanMessage(
          `Analysis Result:\n${state.analysisResult}\n\nOriginal Query: ${state.query}\n\nMemory Context: ${state.memoryContext}`
        );
      } else {
        userMessage = new HumanMessage(
          `Query: ${state.query}\n\nMemory Context: ${state.memoryContext}`
        );
      }

      const response = await llm.invoke([draftingPrompt, userMessage]);
      const draftingResult = response.content as string;

      aiLogger.info(`${LOG_PREFIXES.DRAFTING} Drafting completed`, { 
        resultLength: draftingResult.length 
      });

      // Store drafting result in memory
      await memoryManager.storeReasoningMemory(
        state.sessionId,
        state.userId,
        draftingResult,
        { source: 'drafting', tag: MEMORY_CONFIG.DRAFTING_TAG }
      );

      return {
        draftingResult,
        messages: [...state.messages, draftingPrompt, userMessage, response]
      };
    } catch (error) {
      aiLogger.error(`${LOG_PREFIXES.DRAFTING} Error`, error);
      return {
        error: ERROR_MESSAGES.DRAFTING_FAILURE
      };
    }
  }

  // Finalize Node - Combines results and creates final response
  private async finalizeNode(state: AgentState): Promise<Partial<AgentState>> {
    try {
      let finalResponse: string;

      if (state.analysisResult && state.draftingResult) {
        // Combine analysis and drafting results
        finalResponse = `# Legal Analysis & Document Drafting

## Document Analysis
${state.analysisResult}

## Legal Document
${state.draftingResult}

---
*Generated by DocBare Multi-Agent Legal AI System*`;
      } else if (state.draftingResult) {
        // Only drafting result available
        finalResponse = `# Legal Document

${state.draftingResult}

---
*Generated by DocBare Multi-Agent Legal AI System*`;
      } else {
        // Fallback response
        finalResponse = `# Legal Assistance

I apologize, but I encountered an issue processing your request. Please try again or contact support if the problem persists.

---
*DocBare Legal AI System*`;
      }

      // Store final response in memory
      await memoryManager.storeConversationMemory(
        state.sessionId,
        state.userId,
        'assistant',
        finalResponse
      );

      return {
        finalResponse,
        messages: [...state.messages, new AIMessage(finalResponse)]
      };
    } catch (error) {
      aiLogger.error(`${LOG_PREFIXES.ORCHESTRATOR} Finalization error`, error);
      return {
        error: "Failed to finalize response"
      };
    }
  }

  // Stream response method for compatibility with existing API
  async streamResponse(
    sessionId: string,
    userId: string,
    query: string,
    documentContent?: string,
    documentName?: string
  ): Promise<ReadableStream> {
    const result = await this.processQuery(sessionId, userId, query, documentContent, documentName);
    
    if (result.error) {
      throw new Error(result.error);
    }

    // Convert string response to ReadableStream
    const encoder = new TextEncoder();
    return new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode(result.response));
        controller.close();
      }
    });
  }
} 