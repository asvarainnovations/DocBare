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
    console.log('Fetched chat sessions:', chats);
  } catch (err) {
    console.error('Firestore chat session fetch error:', err);
  }
}

test(); 