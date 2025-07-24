import { NextRequest, NextResponse } from "next/server";
import axios from "axios";
import { prisma } from "@/lib/prisma";
import firestore from "@/lib/firestore";

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY!;

// Call DeepSeek LLM for answer (streaming)
async function callLLMStream(query: string) {
  console.info("🟦 [chatbot][INFO] Sending to DeepSeek (streaming):", query);

  const response = await axios({
    method: "post",
    url: "https://api.deepseek.com/v1/chat/completions",
    data: {
      model: "deepseek-reasoner",
      messages: [
        {
          role: "system",
          content: `
            You are DocBare, an expert AI legal analyst specializing in contracts, pleadings, and legal drafts. When given a document or clause, you must:

            1. Perform a clause-by-clause legal audit:
              • Identify which provisions favor the client, which are neutral, and which pose risks.  
              • Flag missing or vague terms (e.g., indemnity, termination, liability caps).

            2. Provide clear, actionable suggestions:
              • Offer alternative language or additional clauses grounded in best practices.  
              • Explain the legal purpose and impact of each suggested change.

            3. Cite relevant legal principles or standard industry norms (no case law required):
              • Use headings like “Risk,” “Recommendation,” and “Rationale.”

            4. Maintain a professional, concise tone:
              • Bullet‑point summaries for quick scanning.  
              • Full sentences for explanations.

            5. When asked to draft or reword a clause, produce fully formed legal text ready to insert.

            6. Length control (auto‑detect based on query):
              • **Simple questions** (e.g., “What is indemnity?”): reply in 2–3 sentences.  
              • **Clause‑level review requests** (e.g., “Review clause 5”): reply as 3–5 bullet points plus a 1–2 sentence summary.  
              • **Detailed analysis** (user explicitly asks “detailed” or the document is long): you may use up to 500 words.  
              • **Otherwise**, default to a balanced “clause‑level” response.

            Always ask follow‑up questions if the document’s context (jurisdiction, parties, contract type) is unclear.`
        },
        { role: "user", content: query },
      ],
      max_tokens: 4096,
      temperature: 0.2,
      stream: true,
    },
    headers: { Authorization: `Bearer ${DEEPSEEK_API_KEY}` },
    responseType: "stream",
  });

  return response.data;
}

export async function POST(req: NextRequest) {
  try {
    const { query, userId, sessionId } = await req.json();
    console.info("🟦 [chatbot][INFO] Received request:", {
      query,
      userId,
      sessionId,
    });
    if (!query) {
      console.error("🟥 [chatbot][ERROR] Missing query");
      return NextResponse.json({ error: "Missing query" }, { status: 400 });
    }

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
        console.error(
          "🟥 [chatbot][ERROR] DeepSeek: Insufficient Balance. Please top up your account."
        );
        return NextResponse.json(
          {
            error:
              "DeepSeek API: Insufficient balance. Please check your account credits.",
          },
          { status: 402 }
        );
      }
      console.error(
        "🟥 [chatbot][ERROR] DeepSeek error:",
        llmErr?.response?.data || llmErr.message
      );
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
                controller.close();
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
        stream.on("end", () => {
          controller.close();
        });
        stream.on("error", (err: any) => {
          errorDuringStream = err;
          controller.error(err);
        });
      },
    });

    // 3. Log to Cloud SQL (Prisma) and Firestore after streaming is done
    readable.getReader().closed.then(async () => {
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
        console.info("🟩 [chatbot][SUCCESS] Logged to Prisma ragQueryLog");
      } catch (prismaErr: any) {
        console.error(
          "🟥 [chatbot][ERROR] Prisma log error:",
          prismaErr.message
        );
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
        console.info(
          "🟩 [chatbot][SUCCESS] Logged to Firestore docbare_rag_logs"
        );
      } catch (fsErr: any) {
        console.error(
          "🟥 [chatbot][ERROR] Firestore log error:",
          fsErr.message
        );
      }
      try {
        await firestore.collection("chat_messages").add({
          sessionId: sessionId || null,
          userId: "ai",
          role: "ASSISTANT",
          content: answer || "",
          createdAt: new Date(),
        });
        console.info(
          "🟩 [chatbot][SUCCESS] Saved assistant message to chat_messages"
        );
      } catch (msgErr: any) {
        console.error(
          "🟥 [chatbot][ERROR] Failed to save assistant message:",
          msgErr.message
        );
      }
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
    console.error("🟥 [chatbot][ERROR] Unhandled error:", err);
    return NextResponse.json(
      { error: err.message || "Internal error" },
      { status: 500 }
    );
  }
}
