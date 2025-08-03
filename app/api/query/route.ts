import { NextRequest, NextResponse } from "next/server";
import axios from "axios";
import { aiLogger } from "@/lib/logger";
import { validateQuery } from "@/lib/validation";
import { memoryManager } from "@/lib/memory";

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY!;

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
      
      aiLogger.info("Received AI query request", {
        query: query.substring(0, 100) + (query.length > 100 ? '...' : ''),
        userId,
        sessionId,
      });

      // Generate memory context if sessionId is provided
      let memoryContext = '';
      if (sessionId) {
        try {
          memoryContext = await memoryManager.generateMemoryContext(sessionId, userId, query);
          aiLogger.info("Memory context generated", { 
            sessionId, 
            contextLength: memoryContext.length 
          });
        } catch (error) {
          aiLogger.error("Failed to generate memory context", { error, sessionId });
          // Continue without memory context if it fails
        }
      }

    // 1. Call DeepSeek (streaming)
    let answer = "";
    let errorDuringStream: any = null;
    let chunks = [];
    let stream;
    let finalAnswer = ""; // Store the final answer for memory storage
    try {
      stream = await callLLMStream(query, memoryContext);
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
      aiLogger.error("DeepSeek API error", llmErr);
      return NextResponse.json(
        { error: "Failed to get response from DeepSeek AI." },
        { status: 500 }
      );
    }

    // 2. Stream response to client and collect answer for logging
    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        let buffer = "";
        let closed = false;
        stream.on("data", (chunk: Buffer) => {
          const str = chunk.toString();
          buffer += str;
          // DeepSeek streams OpenAI-style data: lines starting with 'data: '
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";
          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const data = line.replace("data: ", "").trim();
              if (data === "[DONE]") {
                if (!closed) {
                  closed = true;
                  controller.close();
                }
                return;
              }
              try {
                const parsed = JSON.parse(data);
                if (parsed.choices && parsed.choices[0]?.delta?.content) {
                  const content = parsed.choices[0].delta.content;
                  answer += content;
                  chunks.push(content);
                  controller.enqueue(encoder.encode(content));
                }
              } catch (e) {
                // Ignore parsing errors for incomplete JSON
              }
            }
          }
        });

        stream.on("end", () => {
          if (!closed) {
            closed = true;
            finalAnswer = answer; // Store the final answer
            controller.close();
          }
        });

        stream.on("error", (error: any) => {
          errorDuringStream = error;
          if (!closed) {
            closed = true;
            controller.error(error);
          }
        });
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
        
        aiLogger.info("Memories stored successfully", { sessionId, userId });
      } catch (error) {
        aiLogger.error("Failed to store memories", { error, sessionId, userId });
        // Don't fail the request if memory storage fails
      }
    }

    // 4. Log the complete interaction
    aiLogger.info("AI query completed", {
      query: query.substring(0, 200) + (query.length > 200 ? '...' : ''),
      answerLength: finalAnswer.length,
      sessionId,
      userId,
      memoryContextLength: memoryContext.length,
      chunksCount: chunks.length,
    });

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

