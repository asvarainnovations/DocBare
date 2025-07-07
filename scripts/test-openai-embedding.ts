import { config as dotenvConfig } from 'dotenv';
dotenvConfig();

import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function test() {
  try {
    const res = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: 'test',
    });
    console.log('Embedding response:', res.data[0].embedding.slice(0, 8), '...');
  } catch (err) {
    console.error('OpenAI embedding error:', err);
  }
}

test(); 