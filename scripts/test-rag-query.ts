import { config as dotenvConfig } from 'dotenv';
dotenvConfig();
import axios from 'axios';

async function test() {
  const userId = process.env.TEST_USER_ID || 'test-user-id';
  try {
    const res = await axios.post('http://localhost:3000/api/query', {
      query: 'What is the capital of France?',
      userId,
    });
    console.info('🟩 [test_rag_query][SUCCESS] RAG query response:', res.data);
  } catch (err) {
    const error = err as any;
    console.error('🟥 [test_rag_query][ERROR] RAG query error:', error.response?.data || error.message || error);
  }
}

test(); 