import { config as dotenvConfig } from 'dotenv';
dotenvConfig();
import firestore from '@/lib/firestore';

async function test() {
  const testUserId = process.env.TEST_USER_ID || 'test-user-id';
  try {
    const snapshot = await firestore.collection('chat_sessions')
      .where('userId', '==', testUserId)
      .orderBy('createdAt', 'desc')
      .get();
    const chats = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    console.info('🟦 [test_firestore_chat][INFO] Fetched chat sessions:', chats);
  } catch (err) {
    console.error('🟥 [test_firestore_chat][ERROR] Firestore chat session fetch error:', err);
  }
}

test(); 