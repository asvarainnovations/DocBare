import { NextRequest, NextResponse } from "next/server";
import axios from "axios";
import { aiLogger } from "@/lib/logger";
import { validateQuery } from "@/lib/validation";
import { memoryManager } from "@/lib/memory";
import { StreamingOrchestrator } from "@/lib/streamingOrchestrator";
import { USE_MULTI_AGENT } from "@/lib/config";

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY!;

async function callLLMStream(query: string, memoryContext: string = '') {
  const startTime = Date.now();
  
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
      • **Simple questions** (“What is indemnity?”): 2–3 sentences.  
      • **Clause‑level review** (“Review clause 5”): 3–5 bullet points + 1–2 sentence summary.  
      • **Detailed analysis** (user asks “detailed” or long document): up to 500 words.  
      • **Drafting tasks**: full legal text ready to insert.  
      • **Default**: balanced clause‑level response.

    11. **Output Formatting**  
      - For **Analysis**, use bullet lists under headings **Risk**, **Recommendation**, **Rationale**.  
      - For **Drafting**, return a complete, structurally sound document.

    12. **Clarification**  
      If any context is unclear (jurisdiction, parties, type), ask a follow‑up question.

    Always maintain a professional, concise tone.  
  `;

  // Combine system prompt with memory context
  const enhancedSystemPrompt = memoryContext 
    ? `${systemPrompt}\n\n## Memory Context:${memoryContext}`
    : systemPrompt;

  const response = await axios({
    method: "post",
    url: "https://api.deepseek.com/v1/chat/completions",
    data: {
      model: "deepseek-reasoner",
      messages: [
        { role: "system", content: enhancedSystemPrompt.trim() },
        { role: "user",   content: query }
      ],
      max_tokens: 4096,
      temperature: 0.2,
      stream: true
    },
    headers: {
      Authorization: `Bearer ${DEEPSEEK_API_KEY}`
    },
    responseType: "stream"
  });

  const duration = Date.now() - startTime;
  aiLogger.aiResponse('DeepSeek', 'deepseek-reasoner', duration, { query });
  return response.data;
}

export async function GET(req: NextRequest) {
  aiLogger.info("Query route GET method called", { 
    method: req.method,
    url: req.url,
    headers: Object.fromEntries(req.headers.entries())
  });
  
  return NextResponse.json({ 
    status: "Query API is working", 
    timestamp: new Date().toISOString(),
    method: "GET"
  });
}

export async function POST(req: NextRequest) {
  // Temporarily disable rate limiting to debug the issue
  // return withRateLimit(rateLimitConfigs.ai)(async (req: NextRequest) => {
  try {
    aiLogger.info("Query route called", { 
      method: req.method,
      url: req.url,
      headers: Object.fromEntries(req.headers.entries())
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
        mode: USE_MULTI_AGENT ? 'Multi-Agent' : 'Single-Agent',
        sessionId,
        userId,
        queryLength: query.length
      });

      // Generate memory context if sessionId is provided
      let memoryContext = '';
      if (sessionId) {
        try {
          memoryContext = await memoryManager.generateMemoryContext(sessionId, userId, query);
        } catch (error) {
          // Continue without memory context if it fails
        }
      }

      // Use the streaming orchestrator to handle both single-agent and multi-agent modes
      let stream;
      let finalAnswer = ""; // Store the final answer for memory storage
      
      try {
        const streamingContext = {
          query,
          sessionId: sessionId || '',
          userId,
          documentContent: '', // Will be enhanced later to support document uploads
          documentName: ''
        };
        
        stream = await StreamingOrchestrator.streamResponse(streamingContext);
      } catch (llmErr: any) {
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
        // Store user query as conversation memory
        await memoryManager.storeConversationMemory(sessionId, userId, 'user', query);
        
        // Store AI response as conversation memory
        await memoryManager.storeConversationMemory(sessionId, userId, 'assistant', finalAnswer);
        
        // Extract and store reasoning from the response
        const reasoningMatch = finalAnswer.match(/## Reasoning:([\s\S]*?)(?=##|$)/);
        if (reasoningMatch) {
          await memoryManager.storeReasoningMemory(
            sessionId, 
            userId, 
            reasoningMatch[1].trim(),
            { source: 'response_analysis' }
          );
        }
      } catch (error) {
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
        "Connection": "keep-alive",
      },
    });
  } catch (error: any) {
    aiLogger.error("Query route error", { error: error.message, stack: error.stack });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
  // });
}

