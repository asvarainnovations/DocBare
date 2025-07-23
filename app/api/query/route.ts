import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { prisma } from '@/lib/prisma';
import firestore from '@/lib/firestore';

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY!;

// Call DeepSeek LLM for answer
async function callLLM(query: string) {
  console.info('🟦 [chatbot][INFO] Sending to DeepSeek:', query);
  const response = await axios.post(
    'https://api.deepseek.com/v1/chat/completions',
    {
      model: 'deepseek-reasoner',
      messages: [{ role: 'user', content: query }],
      max_tokens: 4096, // Increased to prevent truncation
      temperature: 0.2,
    },
    { headers: { 'Authorization': `Bearer ${DEEPSEEK_API_KEY}` } }
  );
  console.info('🟩 [chatbot][SUCCESS] DeepSeek raw response:', response.data);
  return response.data.choices[0].message.content;
}

export async function POST(req: NextRequest) {
  try {
    const { query, userId, sessionId } = await req.json();
    console.info('🟦 [chatbot][INFO] Received request:', { query, userId, sessionId });
    if (!query) {
      console.error('🟥 [chatbot][ERROR] Missing query');
      return NextResponse.json({ error: 'Missing query' }, { status: 400 });
    }

    // 1. Call DeepSeek
    let answer = '';
    try {
      answer = await callLLM(query);
      console.info('🟩 [chatbot][SUCCESS] DeepSeek answer:', answer);
    } catch (llmErr: any) {
      const apiError = llmErr?.response?.data?.error;
      if (apiError && apiError.message === 'Insufficient Balance') {
        console.error('🟥 [chatbot][ERROR] DeepSeek: Insufficient Balance. Please top up your account.');
        return NextResponse.json({ error: 'DeepSeek API: Insufficient balance. Please check your account credits.' }, { status: 402 });
      }
      console.error('🟥 [chatbot][ERROR] DeepSeek error:', llmErr?.response?.data || llmErr.message);
      return NextResponse.json({ error: 'Failed to get response from DeepSeek AI.' }, { status: 500 });
    }

    // 2. Log to Cloud SQL (Prisma)
    try {
      await prisma.ragQueryLog.create({
        data: {
          userId: userId || null,
          query: query || '',
          answer: answer || '',
          sources: [],
        },
      });
      console.info('🟩 [chatbot][SUCCESS] Logged to Prisma ragQueryLog');
    } catch (prismaErr: any) {
      console.error('🟥 [chatbot][ERROR] Prisma log error:', prismaErr.message);
    }

    // 3. Log to Firestore
    try {
      await firestore.collection('docbare_rag_logs').add({
        userId: userId || null,
        query: query || '',
        answer: answer || '',
        sessionId: sessionId || null,
        sources: [],
        createdAt: new Date(),
      });
      console.info('🟩 [chatbot][SUCCESS] Logged to Firestore docbare_rag_logs');
    } catch (fsErr: any) {
      console.error('🟥 [chatbot][ERROR] Firestore log error:', fsErr.message);
    }

    // 4. Return answer
    console.info('🟦 [chatbot][INFO] Returning:', { answer });
    return NextResponse.json({ answer });
  } catch (err: any) {
    console.error('🟥 [chatbot][ERROR] Unhandled error:', err);
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 });
  }
} 