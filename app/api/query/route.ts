import { NextRequest, NextResponse } from "next/server";
import axios from "axios";
import { prisma } from "@/lib/prisma";
import firestore from "@/lib/firestore";
import { validateQuery } from "@/lib/validation";
import { withRateLimit, rateLimitConfigs } from "@/lib/rateLimit";
import { aiLogger } from "@/lib/logger";

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY!;

// Call DeepSeek LLM for answer (streaming)
async function callLLMStream(query: string) {
  aiLogger.aiRequest('DeepSeek', 'deepseek-reasoner', { query });
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

  const response = await axios({
    method: "post",
    url: "https://api.deepseek.com/v1/chat/completions",
    data: {
      model: "deepseek-reasoner",
      messages: [
        { role: "system", content: systemPrompt },
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
  return withRateLimit(rateLimitConfigs.ai)(async (req: NextRequest) => {
    try {
      // Validate request
      const validation = await validateQuery(req);
      if (validation.error) {
        return validation.error;
      }

      const { query, userId, sessionId } = validation.data;
      
      aiLogger.info("Received AI query request", {
        query: query.substring(0, 100) + (query.length > 100 ? '...' : ''),
        userId,
        sessionId,
      });

    // 1. Call DeepSeek (streaming)
    let answer = "";
    let errorDuringStream: any = null;
    let chunks = [];
    let stream;
    try {
      stream = await callLLMStream(query);
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
                const content = parsed.choices?.[0]?.delta?.content;
                if (content) {
                  answer += content;
                  controller.enqueue(encoder.encode(content));
                }
              } catch (e) {
                // Ignore malformed lines
              }
            }
          }
        });
        stream.on("end", async () => {
          if (!closed) {
            closed = true;
            controller.close();
          }
          if (errorDuringStream) return;
          try {
            await prisma.ragQueryLog.create({
              data: {
                userId: userId || null,
                query: query || "",
                answer: answer || "",
                sources: [],
              },
            });
            aiLogger.success("Logged to Prisma ragQueryLog", { userId, sessionId });
          } catch (prismaErr: any) {
            aiLogger.error("Prisma log error", prismaErr);
          }
          try {
            await firestore.collection("docbare_rag_logs").add({
              userId: userId || null,
              query: query || "",
              answer: answer || "",
              sessionId: sessionId || null,
              sources: [],
              createdAt: new Date(),
            });
            aiLogger.success("Logged to Firestore docbare_rag_logs", { userId, sessionId });
          } catch (fsErr: any) {
            aiLogger.error("Firestore log error", fsErr);
          }
          try {
            await firestore.collection("chat_messages").add({
              sessionId: sessionId || null,
              userId: "ai",
              role: "ASSISTANT",
              content: answer || "",
              createdAt: new Date(),
            });
            aiLogger.success("Saved assistant message to chat_messages", { userId, sessionId });
          } catch (msgErr: any) {
            aiLogger.error("Failed to save assistant message", msgErr);
          }
        });
        stream.on("error", async (err: any) => {
          errorDuringStream = err;
          aiLogger.error("Stream error during AI response", err);
          controller.error(err);
        });
      },
    });

    // 4. Return streaming response
    return new NextResponse(readable, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Transfer-Encoding": "chunked",
        "Cache-Control": "no-cache",
      },
    });
    } catch (err: any) {
      aiLogger.error("Unhandled error in query route", err);
      return NextResponse.json(
        { error: err.message || "Internal error" },
        { status: 500 }
      );
    }
  });
}

