import { config as dotenvConfig } from 'dotenv';
dotenvConfig();
import firestore from '@/lib/firestore';

async function test() {
  const testUserId = process.env.TEST_USER_ID || 'test-user-id';
  try {
    const session = {
      userId: testUserId,
      sessionName: 'Test Chat Session',
      createdAt: new Date(),
    };
    const result = await firestore.collection('chat_sessions').add(session);
    console.log('Created chat session with ID:', result.id);
  } catch (err) {
    console.error('Firestore create chat session error:', err);
  }
}

test(); 