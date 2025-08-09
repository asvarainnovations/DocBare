import axios from "axios";
import { aiLogger } from "./logger";
import { GoogleAuth } from 'google-auth-library';

/**
 * Retrieve relevant legal knowledge from Vertex AI Vector Search
 * @param query The search query
 * @param topK Number of top results to retrieve (default: 5)
 * @returns Array of knowledge base chunks
 */
export async function retrieveFromKB(query: string, topK: number = 5): Promise<string[]> {
  const startTime = Date.now();
  
  try {
    aiLogger.info("🟦 [vertex][INFO] Retrieving from knowledge base", { 
      query: query.substring(0, 100), 
      topK 
    });

    // Check if Vertex AI is configured
    if (!process.env.GCP_PROJECT_ID || !process.env.VERTEX_AI_LOCATION || !process.env.VERTEX_AI_INDEX_ENDPOINT) {
      aiLogger.warn("🟨 [vertex][WARN] Vertex AI not configured, skipping knowledge base retrieval");
      return [];
    }

    // Get authentication token using Application Default Credentials
    let authToken: string;
    
    try {
      let auth: GoogleAuth;
      
      if (process.env.NODE_ENV === 'development') {
        // Development: Use service account key file
        auth = new GoogleAuth({
          keyFile: './secrets/service-account-key.json',
          scopes: ['https://www.googleapis.com/auth/cloud-platform']
        });
        aiLogger.info("🟦 [vertex][INFO] Using service account key file (development)");
      } else {
        // Production: Use Application Default Credentials (Cloud Run, GKE, etc.)
        auth = new GoogleAuth({
          scopes: ['https://www.googleapis.com/auth/cloud-platform']
        });
        aiLogger.info("🟦 [vertex][INFO] Using Application Default Credentials (production)");
      }
      
      const client = await auth.getClient();
      const tokenResponse = await client.getAccessToken();
      authToken = tokenResponse.token || '';
      
    } catch (authError: any) {
      aiLogger.error("🟥 [vertex][ERROR] Authentication failed", { 
        error: authError.message,
        environment: process.env.NODE_ENV || 'unknown'
      });
      return [];
    }

    const response = await axios.post(
      `https://${process.env.VERTEX_AI_LOCATION}-aiplatform.googleapis.com/v1/projects/${process.env.GCP_PROJECT_ID}/locations/${process.env.VERTEX_AI_LOCATION}/indexEndpoints/${process.env.VERTEX_AI_INDEX_ENDPOINT}:predict`,
      {
        instances: [{ content: query }],
        parameters: { topK },
      },
      { 
        headers: { 
          Authorization: `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000 // 30 second timeout
      }
    );

    const chunks = response.data.predictions?.map((p: any) => p.content) || [];
    
    // Calculate detailed metrics for retrieved chunks
    const totalCharacters = chunks.reduce((sum: number, chunk: string) => sum + chunk.length, 0);
    const totalWords = chunks.reduce((sum: number, chunk: string) => sum + chunk.split(/\s+/).length, 0);
    const estimatedTokens = Math.ceil(totalCharacters / 4); // Rough estimate: 1 token ≈ 4 characters
    const averageChunkSize = chunks.length > 0 ? Math.round(totalCharacters / chunks.length) : 0;
    
    const duration = Date.now() - startTime;
    aiLogger.success("🟩 [vertex][SUCCESS] Retrieved knowledge base chunks", { 
      chunksCount: chunks.length,
      totalCharacters: totalCharacters,
      totalWords: totalWords,
      estimatedTokens: estimatedTokens,
      averageChunkSize: averageChunkSize,
      duration,
      query: query.substring(0, 100),
      chunkSizes: chunks.map((chunk: string, index: number) => ({
        chunkIndex: index,
        characters: chunk.length,
        words: chunk.split(/\s+/).length,
        estimatedTokens: Math.ceil(chunk.length / 4)
      }))
    });
    
    return chunks;
  } catch (error: any) {
    const duration = Date.now() - startTime;
    aiLogger.error("🟥 [vertex][ERROR] Knowledge base retrieval failed", { 
      error: error.message, 
      duration,
      query: query.substring(0, 100),
      status: error.response?.status,
      statusText: error.response?.statusText
    });
    
    // Graceful fallback - return empty array
    return [];
  }
}

/**
 * Check if Vertex AI knowledge base is available
 * @returns boolean indicating if knowledge base is configured and accessible
 */
export async function isKnowledgeBaseAvailable(): Promise<boolean> {
  try {
    const chunks = await retrieveFromKB("test query", 1);
    return chunks.length > 0;
  } catch (error) {
    return false;
  }
} 