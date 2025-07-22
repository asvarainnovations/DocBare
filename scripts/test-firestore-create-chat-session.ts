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
    console.info('🟩 [test_firestore_create_chat][SUCCESS] Created chat session with ID:', result.id);
  } catch (err) {
    console.error('🟥 [test_firestore_create_chat][ERROR] Firestore create chat session error:', err);
  }
}

test(); 