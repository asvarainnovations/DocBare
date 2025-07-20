import { config as dotenvConfig } from 'dotenv';
dotenvConfig();

import axios from 'axios';

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions';

async function test() {
  try {
    const res = await axios.post(
      DEEPSEEK_API_URL,
      {
        model: 'deepseek-chat',
        messages: [
          { role: 'user', content: 'Hello, DeepSeek!' }
        ]
      },
      {
        headers: {
          'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );
    console.log('DeepSeek response:', res.data);
  } catch (err) {
    const error = err as any;
    console.error('DeepSeek API error:', error.response?.data || error.message || error);
  }
}

test(); 