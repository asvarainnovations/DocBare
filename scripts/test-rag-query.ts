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
    console.log('RAG query response:', res.data);
  } catch (err) {
    console.error('RAG query error:', err.response?.data || err.message);
  }
}

test(); 