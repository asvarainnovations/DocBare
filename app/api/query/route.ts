import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { prisma } from '@/lib/prisma';
import firestore from '@/lib/firestore';
import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { v1 } from '@google-cloud/aiplatform';
import { getQueryEmbedding } from '@/lib/embeddings';
import { getChunkTexts } from '@/lib/chunkText';
import { GoogleAuth } from 'google-auth-library';

const indexEndpointServiceClient = new v1.IndexEndpointServiceClient();
const endpoint = process.env.VERTEX_AI_INDEX_ENDPOINT;

// Function to get Google Cloud access token
async function getAccessToken(): Promise<string> {
  const auth = new GoogleAuth({
    scopes: ['https://www.googleapis.com/auth/cloud-platform'],
  });
  const client = await auth.getClient();
  const token = await client.getAccessToken();
  return token.token || '';
}

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY!;
const CHUNKS_FILE = 'kb_data/datasets/legal_kb_embeddings_batch.json';
const TOP_K = 5;

console.log('[query] NODE_ENV:', process.env.NODE_ENV);



// 4. Construct RAG prompt
function buildPrompt(query: string, docs: { id: string, text: string }[]) {
  return `You are a legal assistant. Using the following knowledge, answer the question with clear reasoning:\n---\n${docs.map((d, i) => `[Doc${i + 1}]: ${d.text}`).join('\n')}\n---\nQuestion: ${query}\nAnswer:`;
}

// 5. Call DeepSeek LLM for answer
async function callLLM(prompt: string) {
  const response = await axios.post(
    'https://api.deepseek.com/v1/chat/completions',
    {
      model: 'deepseek-r1-0528-maas',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 512,
      temperature: 0.2,
    },
    { headers: { 'Authorization': `Bearer ${DEEPSEEK_API_KEY}` } }
  );
  return response.data.choices[0].message.content;
}

export async function POST(req: NextRequest) {
  try {
    const { query, userId, sessionId } = await req.json();
    console.log('[query] Received:', { query, userId, sessionId });
    if (!query) {
      console.error('[query] Missing query');
      return NextResponse.json({ error: 'Missing query' }, { status: 400 });
    }

    let chunks = [];
    let answer = '';

    if (process.env.NODE_ENV === 'development') {
      // Use local embeddings file for retrieval (stream first 3 lines)
      const embeddingsPath = path.join(process.cwd(), 'kb_data/datasets/legal_kb_embeddings_batch.json');
      console.log('[query] Using local embeddings file:', embeddingsPath);
      const stream = fs.createReadStream(embeddingsPath);
      const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });
      chunks = [];
      for await (const line of rl) {
        if (chunks.length >= 3) break;
        try {
          const item = JSON.parse(line);
          chunks.push({ id: item.id, text: item.text });
        } catch {}
      }
      // Simple answer synthesis: concatenate the chunk texts
      answer = `Context:\n${chunks.map((c) => c.text).join('\n---\n')}\n\nUser question: ${query}\n\n(This is a development mode answer. No LLM used.)`;
      console.log('[query] Local dev answer:', answer);
    } else {
      // 1. Embedding
      const embedding = await getQueryEmbedding(query);
      console.log('[query] Embedding length:', embedding.length, 'First 5 values:', embedding.slice(0, 5));

      // 2. Retrieval (Vertex AI via SDK)
      console.log('[query] Vertex endpoint:', endpoint);
      
      let neighbors: any[] = [];
      try {
        // Use findNeighbors method for Vector Search endpoints
        const deployedIndexId = process.env.VERTEX_AI_DEPLOYED_INDEX_ID;
        console.log('[query] Using deployed index ID:', deployedIndexId);
        
        // Correct payload format for Vector Search
        const request = {
          indexEndpoint: endpoint,
          deployedIndexId: deployedIndexId,
          queries: [{
            datapoint: {
              datapointId: 'query',
              featureVector: embedding,
            },
            neighborCount: TOP_K,
          }],
          returnFullDatapoint: true,
        };
        
        console.log('[query] Vertex request:', JSON.stringify({
          indexEndpoint: endpoint,
          deployedIndexId: deployedIndexId,
          queries: [{
            datapoint: {
              datapointId: 'query',
              featureVector: embedding.slice(0, 5), // Log first 5 values
              _note: `... and ${embedding.length - 5} more values`
            },
            neighborCount: TOP_K,
          }],
          returnFullDatapoint: true,
        }, null, 2));
        
        // Use REST API approach for Vector Search
        const response = await fetch(`https://${process.env.VERTEX_AI_LOCATION || 'us-central1'}-aiplatform.googleapis.com/v1/${endpoint}:findNeighbors`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${await getAccessToken()}`,
          },
          body: JSON.stringify(request),
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`HTTP ${response.status}: ${errorText}`);
        }
        
        const responseData = await response.json();
        console.log('[query] Vertex response:', responseData);
        
        // Parse the response to extract neighbors
        if (responseData.nearestNeighbors && responseData.nearestNeighbors.length > 0) {
          neighbors = responseData.nearestNeighbors[0].neighbors || [];
        }
        console.log('[query] Neighbors:', neighbors);
      } catch (vertexError: any) {
        console.error('[query] Vertex AI error details:', {
          code: vertexError.code,
          details: vertexError.details,
          message: vertexError.message,
          metadata: vertexError.metadata
        });
        throw vertexError;
      }

      // 3. Get chunk texts
      const chunkIds = Array.isArray(neighbors) ? neighbors.map((n: any) => n.id) : [];
      chunks = await getChunkTexts(chunkIds);
      console.log('[query] Chunks:', chunks);

      // 4. Build prompt
      const prompt = buildPrompt(query, chunks);
      console.log('[query] Prompt:', prompt);

      // 5. LLM answer
      answer = await callLLM(prompt);
      console.log('[query] LLM answer:', answer);
    }

    // 6. Log to Cloud SQL (Prisma)
    await prisma.ragQueryLog.create({
      data: {
        userId: userId || null,
        query,
        answer,
        sources: chunks,
      },
    });
    console.log('[query] Logged to Prisma ragQueryLog');

    // 7. Log to Firestore (chat transcript, etc.)
    await firestore.collection('docbare_rag_logs').add({
      userId: userId || null,
      query,
      answer,
      sources: chunks,
      createdAt: new Date(),
    });
    console.log('[query] Logged to Firestore docbare_rag_logs');

    // 8. Return answer and sources
    console.log('[query] Returning:', { answer, sources: chunks });
    return NextResponse.json({ answer, sources: chunks });
  } catch (err: any) {
    console.error('[query] Error:', err);
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 });
  }
} 