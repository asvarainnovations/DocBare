import axios from 'axios';

/**
 * Generate an embedding for a query using the OpenAI API.
 * @param query The input string to embed.
 * @returns Promise<number[]> The embedding vector.
 */
export async function getQueryEmbedding(query: string): Promise<number[]> {
  const response = await axios.post(
    'https://api.openai.com/v1/embeddings',
    {
      input: [query],
      model: process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-large',
    },
    {
      headers: { 'Authorization': `Bearer ${process.env.OPENAI_API_KEY}` }
    }
  );
  if (!response.data || !Array.isArray(response.data.data) || response.data.data.length === 0) {
    throw new Error('No embeddings returned from OpenAI API');
  }
  return response.data.data[0].embedding;
} 