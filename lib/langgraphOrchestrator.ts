import { ChatOpenAI } from "@langchain/openai";
import {
  HumanMessage,
  AIMessage,
  SystemMessage,
} from "@langchain/core/messages";
import { memoryManager } from "./memory";
import {
  AGENT_CONFIG,
  MEMORY_CONFIG,
  ERROR_MESSAGES,
  LOG_PREFIXES,
} from "./config";
import { aiLogger } from "./logger";
import axios from "axios";

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY!;

// Define the state interface for our workflow
export interface AgentState {
  sessionId: string;
  userId: string;
  query: string;
  documentContent?: string;
  documentName?: string;
  hasDocument: boolean;
  needAnalysis?: boolean; // New: Orchestrator decision
  orchestratorDecision?: any; // New: Parsed orchestrator JSON response
  analysisResult?: string;
  analysisJson?: any; // New: Parsed analysis JSON response
  draftingResult?: string;
  finalResponse?: string;
  error?: string;
  memoryContext: string;
  messages: (HumanMessage | AIMessage | SystemMessage)[];
}

// Helper function to call DeepSeek API directly
async function callDeepSeekLLM(systemPrompt: string, userMessage: string) {
  const response = await axios({
    method: "post",
    url: "https://api.deepseek.com/v1/chat/completions",
    data: {
      model: "deepseek-reasoner",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage }
      ],
      max_tokens: 4096,
      temperature: 0.1,
      stream: false
    },
    headers: {
      Authorization: `Bearer ${DEEPSEEK_API_KEY}`
    }
  });

  return response.data.choices[0].message.content;
}

// Main orchestrator class using LangGraph-inspired workflow
export class LangGraphOrchestrator {
  async processQuery(
    sessionId: string,
    userId: string,
    query: string,
    documentContent?: string,
    documentName?: string
  ): Promise<{ response: string; error?: string }> {
    aiLogger.info(
      `${LOG_PREFIXES.ORCHESTRATOR} Starting LangGraph-inspired processing`,
      {
        sessionId,
        userId,
        hasDocument: !!documentContent,
        queryLength: query.length,
      }
    );

    try {
      // Get memory context
      let memoryContext = "";
      try {
        const memories = await memoryManager.retrieveMemories(
          sessionId,
          userId,
          query,
          10
        );
        memoryContext = memories.map((m) => m.content).join("\n\n");
      } catch (error) {
        aiLogger.warn(
          `${LOG_PREFIXES.MEMORY} Failed to load memory context`,
          error
        );
      }

      // Store user query in memory
      await memoryManager.storeConversationMemory(
        sessionId,
        userId,
        "user",
        query
      );

      // Initialize state
      const state: AgentState = {
        sessionId,
        userId,
        query,
        documentContent: documentContent || "",
        documentName: documentName || "",
        hasDocument: !!documentContent,
        memoryContext,
        messages: [],
      };

      // Execute workflow using LangGraph-inspired pattern
      const result = await this.executeWorkflow(state);

      aiLogger.info(
        `${LOG_PREFIXES.ORCHESTRATOR} LangGraph-inspired processing completed`,
        {
          sessionId,
          hasError: !!result.error,
          hasResponse: !!result.finalResponse,
        }
      );

      if (result.error) {
        return { response: "", error: result.error };
      }

      return { response: result.finalResponse || "No response generated" };
    } catch (error) {
      aiLogger.error(
        `${LOG_PREFIXES.ORCHESTRATOR} LangGraph-inspired processing error`,
        error
      );
      return {
        response: "",
        error: ERROR_MESSAGES.ORCHESTRATION_FAILURE,
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

      // Step 2: Analysis (if orchestrator decided analysis is needed)
      if (state.needAnalysis && state.hasDocument && !state.analysisResult) {
        aiLogger.info(
          `${LOG_PREFIXES.ANALYSIS} Starting document analysis (orchestrator decision)`
        );
        const analysisResult = await this.analysisNode(state);
        if (analysisResult.error) {
          return { ...state, ...analysisResult };
        }
        Object.assign(state, analysisResult);
      } else if (state.needAnalysis && !state.hasDocument) {
        aiLogger.warn(
          `${LOG_PREFIXES.ANALYSIS} Orchestrator requested analysis but no document available`
        );
        // Continue to drafting without analysis
      }

      // Step 3: Drafting (always happens, with or without analysis)
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
      aiLogger.error(
        `${LOG_PREFIXES.ORCHESTRATOR} Workflow execution error`,
        error
      );
      return { ...state, error: ERROR_MESSAGES.ORCHESTRATION_FAILURE };
    }
  }

  // Orchestrator Node - Decides workflow
  private async orchestratorNode(
    state: AgentState
  ): Promise<Partial<AgentState>> {
    try {
      const response = await callDeepSeekLLM(
        AGENT_CONFIG.ORCHESTRATOR_PROMPT,
        `Query: ${state.query}\n\nDocument Available: ${
          state.hasDocument ? "Yes" : "No"
        }${
          state.hasDocument ? `\nDocument Name: ${state.documentName}` : ""
        }\n\nMemory Context: ${state.memoryContext}`
      );
      const decisionText = response as string;

      aiLogger.info(`${LOG_PREFIXES.ORCHESTRATOR} Raw decision received`, {
        decisionLength: decisionText.length,
        decisionPreview: decisionText.substring(0, 200),
      });

      // Parse the orchestrator's JSON decision
      let orchestratorDecision: any;
      let needAnalysis: boolean = false;

      try {
        // Try to extract JSON from the response
        const jsonMatch = decisionText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          orchestratorDecision = JSON.parse(jsonMatch[0]);
          needAnalysis = orchestratorDecision.needAnalysis === true;
        } else {
          // Fallback: try to parse the entire response as JSON
          orchestratorDecision = JSON.parse(decisionText);
          needAnalysis = orchestratorDecision.needAnalysis === true;
        }

        aiLogger.info(
          `${LOG_PREFIXES.ORCHESTRATOR} Decision parsed successfully`,
          {
            needAnalysis,
            orchestratorDecision,
          }
        );
      } catch (jsonError) {
        aiLogger.error(`${LOG_PREFIXES.ORCHESTRATOR} JSON parsing failed`, {
          error: jsonError,
          decisionText: decisionText.substring(0, 500),
        });

        // Enhanced fallback logic: determine needAnalysis based on content
        const lowerDecision = decisionText.toLowerCase();

        // Check for explicit needAnalysis indicators
        if (
          lowerDecision.includes("needanalysis=true") ||
          lowerDecision.includes("needanalysis: true") ||
          lowerDecision.includes("needanalysis:true")
        ) {
          needAnalysis = true;
        } else if (
          lowerDecision.includes("needanalysis=false") ||
          lowerDecision.includes("needanalysis: false") ||
          lowerDecision.includes("needanalysis:false")
        ) {
          needAnalysis = false;
        } else {
          // Fallback to content-based decision
          needAnalysis =
            state.hasDocument &&
            (lowerDecision.includes("analysis") ||
              lowerDecision.includes("audit") ||
              lowerDecision.includes("review") ||
              lowerDecision.includes("call analysis agent") ||
              lowerDecision.includes("analysis agent"));
        }

        orchestratorDecision = {
          needAnalysis,
          fallback: true,
          originalResponse: decisionText.substring(0, 200),
          error: "JSON parsing failed, using enhanced fallback logic",
          decisionMethod: "content_analysis",
        };

        aiLogger.warn(
          `${LOG_PREFIXES.ORCHESTRATOR} Using enhanced fallback decision logic`,
          {
            needAnalysis,
            decisionMethod: "content_analysis",
          }
        );
      }

      // Store orchestrator decision in memory
      await memoryManager.storeReasoningMemory(
        state.sessionId,
        state.userId,
        `Orchestrator Decision: ${JSON.stringify(orchestratorDecision)}`,
        { source: "orchestrator", tag: MEMORY_CONFIG.ORCHESTRATION_TAG }
      );

      return {
        needAnalysis,
        orchestratorDecision,
        messages: [
          ...state.messages,
          new SystemMessage(AGENT_CONFIG.ORCHESTRATOR_PROMPT),
          new HumanMessage(`Query: ${state.query}\n\nDocument Available: ${
            state.hasDocument ? "Yes" : "No"
          }${
            state.hasDocument ? `\nDocument Name: ${state.documentName}` : ""
          }\n\nMemory Context: ${state.memoryContext}`),
          new AIMessage(response),
        ],
      };
    } catch (error) {
      aiLogger.error(`${LOG_PREFIXES.ORCHESTRATOR} Error`, error);
      return {
        error: ERROR_MESSAGES.ORCHESTRATION_FAILURE,
      };
    }
  }

  // Analysis Node - Analyzes documents
  private async analysisNode(state: AgentState): Promise<Partial<AgentState>> {
    try {
      const response = await callDeepSeekLLM(
        AGENT_CONFIG.ANALYSIS_PROMPT,
        `Document Content:\n${state.documentContent}\n\nQuery: ${state.query}\n\nMemory Context: ${state.memoryContext}`
      );
      const analysisText = response as string;

      aiLogger.info(`${LOG_PREFIXES.ANALYSIS} Raw analysis received`, {
        resultLength: analysisText.length,
        resultPreview: analysisText.substring(0, 200),
      });

      // Parse the analysis JSON response
      let analysisJson: any;
      let analysisResult: string;

      try {
        // Try to extract JSON from the response
        const jsonMatch = analysisText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          analysisJson = JSON.parse(jsonMatch[0]);
        } else {
          // Fallback: try to parse the entire response as JSON
          analysisJson = JSON.parse(analysisText);
        }

        // Validate the expected JSON structure
        if (!analysisJson.type || !analysisJson.facts || !analysisJson.audit) {
          throw new Error(
            "Invalid analysis JSON structure - missing required fields"
          );
        }

        // Format the analysis result for display
        analysisResult = `# Document Analysis

          ## Document Type: ${analysisJson.type}

          ## Key Facts:
          - **Party A**: ${analysisJson.facts.partyA || "Not specified"}
          - **Party B**: ${analysisJson.facts.partyB || "Not specified"}
          - **Date**: ${analysisJson.facts.date || "Not specified"}
          - **Subject**: ${analysisJson.facts.subject || "Not specified"}
          - **Legal Triggers**: ${
            analysisJson.facts.triggers?.join(", ") || "None identified"
          }

          ## Audit Results:
          ${analysisJson.audit
            .map(
              (item: any, index: number) => `
                ### Clause ${item.clause || index + 1}
                - **Status**: ${item.label}
                - **Issue**: ${item.issue}
                - **Recommendation**: ${item.recommendation}
                - **Rationale**: ${item.rationale}
              `
            )
            .join("\n")}

          ---
          *Analysis generated by DocBare Analysis Agent*
        `;

        aiLogger.info(
          `${LOG_PREFIXES.ANALYSIS} Analysis JSON parsed successfully`,
          {
            documentType: analysisJson.type,
            auditItemsCount: analysisJson.audit?.length || 0,
          }
        );
      } catch (jsonError) {
        aiLogger.error(`${LOG_PREFIXES.ANALYSIS} JSON parsing failed`, {
          error: jsonError,
          analysisText: analysisText.substring(0, 500),
        });

        // Fallback: use the raw text as analysis result
        analysisResult = `# Document Analysis

          ${analysisText}

          ---
          *Analysis generated by DocBare Analysis Agent (JSON parsing failed)*`;

        analysisJson = {
          error: "JSON parsing failed",
          fallback: true,
          originalResponse: analysisText.substring(0, 200),
        };

        aiLogger.warn(
          `${LOG_PREFIXES.ANALYSIS} Using fallback analysis result`
        );
      }

      // Store analysis result in memory
      await memoryManager.storeReasoningMemory(
        state.sessionId,
        state.userId,
        analysisResult,
        { source: "analysis", tag: MEMORY_CONFIG.ANALYSIS_TAG }
      );

      return {
        analysisResult,
        analysisJson,
        messages: [...state.messages, new AIMessage(response)],
      };
    } catch (error) {
      aiLogger.error(`${LOG_PREFIXES.ANALYSIS} Error`, error);
      return {
        error: ERROR_MESSAGES.ANALYSIS_FAILURE,
      };
    }
  }

  // Drafting Node - Creates legal documents
  private async draftingNode(state: AgentState): Promise<Partial<AgentState>> {
    try {
      let userMessageContent: string;

      if (state.analysisJson && !state.analysisJson.error) {
        // Format input with analysis report
        const analysisReport = JSON.stringify(state.analysisJson, null, 2);
        userMessageContent = `userQuery: ${state.query}

          analysisReport: ${analysisReport}

          Memory Context: ${state.memoryContext}
          `;
      } else if (state.analysisResult) {
        // Fallback: use formatted analysis result
        userMessageContent = `userQuery: ${state.query}

          analysisReport: ${state.analysisResult}

          Memory Context: ${state.memoryContext}`;
      } else {
        // No analysis available - draft from scratch
        userMessageContent = `userQuery: ${state.query}

          Memory Context: ${state.memoryContext}`;
      }

      const response = await callDeepSeekLLM(
        AGENT_CONFIG.DRAFTING_PROMPT,
        userMessageContent
      );
      const draftingResult = response as string;

      aiLogger.info(`${LOG_PREFIXES.DRAFTING} Drafting completed`, {
        resultLength: draftingResult.length,
        hasAnalysis: !!(state.analysisJson || state.analysisResult),
      });

      // Store drafting result in memory
      await memoryManager.storeReasoningMemory(
        state.sessionId,
        state.userId,
        draftingResult,
        { source: "drafting", tag: MEMORY_CONFIG.DRAFTING_TAG }
      );

      return {
        draftingResult,
        messages: [...state.messages, new AIMessage(response)],
      };
    } catch (error) {
      aiLogger.error(`${LOG_PREFIXES.DRAFTING} Error`, error);
      return {
        error: ERROR_MESSAGES.DRAFTING_FAILURE,
      };
    }
  }

  // Finalize Node - Combines results and creates final response
  private async finalizeNode(state: AgentState): Promise<Partial<AgentState>> {
    try {
      let finalResponse: string;

      if (
        state.analysisJson &&
        !state.analysisJson.error &&
        state.draftingResult
      ) {
        // Both analysis and drafting completed successfully
        finalResponse = `# Legal Document Analysis & Drafting

          ## Document Analysis Summary
          **Document Type**: ${state.analysisJson.type}
          **Key Parties**: ${
            state.analysisJson.facts.partyA || "Not specified"
          } & ${state.analysisJson.facts.partyB || "Not specified"}
          **Subject**: ${state.analysisJson.facts.subject || "Not specified"}

          **Risk Assessment**: ${
            state.analysisJson.audit.filter(
              (item: any) => item.label === "Risk"
            ).length
          } high-risk clauses identified
          **Recommendations**: ${
            state.analysisJson.audit.filter(
              (item: any) => item.label === "Favorable"
            ).length
          } favorable clauses found

          ## Legal Document
          ${state.draftingResult}

          ---
          *Generated by DocBare Multi-Agent Legal AI System*
      `;
      } else if (state.analysisResult && state.draftingResult) {
        // Analysis and drafting completed (fallback format)
        finalResponse = `# Legal Analysis & Document Drafting

          ## Document Analysis
          ${state.analysisResult}

          ## Legal Document
          ${state.draftingResult}

          ---
          *Generated by DocBare Multi-Agent Legal AI System*
        `;
      } else if (state.draftingResult) {
        // Only drafting completed (no analysis)
        finalResponse = `# Legal Document

          ${state.draftingResult}

          ---
          *Generated by DocBare Multi-Agent Legal AI System*
        `;
      } else {
        // Fallback response
        finalResponse = `# Legal Assistance

          I apologize, but I encountered an issue processing your request. Please try again or contact support if the problem persists.

          ---
          *DocBare Legal AI System*
        `;
      }

      // Store final response in memory
      await memoryManager.storeConversationMemory(
        state.sessionId,
        state.userId,
        "assistant",
        finalResponse
      );

      return {
        finalResponse,
        messages: [...state.messages, new AIMessage(finalResponse)],
      };
    } catch (error) {
      aiLogger.error(`${LOG_PREFIXES.ORCHESTRATOR} Finalization error`, error);
      return {
        error: "Failed to finalize response",
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
    const result = await this.processQuery(
      sessionId,
      userId,
      query,
      documentContent,
      documentName
    );

    if (result.error) {
      throw new Error(result.error);
    }

    // Convert string response to ReadableStream
    const encoder = new TextEncoder();
    return new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode(result.response));
        controller.close();
      },
    });
  }
}
