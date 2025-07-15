import { config as dotenvConfig } from 'dotenv';
dotenvConfig();
import axios from 'axios';

async function test() {
  const email = process.env.TEST_EMAIL || 'test@example.com';
  const password = process.env.TEST_PASSWORD || 'testpassword';
  try {
    const res = await axios.post('http://localhost:3000/api/auth/callback/credentials', {
      email,
      password,
    }, {
      headers: { 'Content-Type': 'application/json' },
      withCredentials: true,
    });
    console.log('Credentials auth response:', res.data);
  } catch (err) {
    console.error('Credentials auth error:', err.response?.data || err.message);
  }
}

test(); 