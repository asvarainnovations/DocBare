import { config as dotenvConfig } from 'dotenv';
dotenvConfig();
import firestore from '@/lib/firestore';

async function test() {
  const testUserId = process.env.TEST_USER_ID || 'test-user-id';
  const testSessionId = process.env.TEST_SESSION_ID || 'test-session-id';
  try {
    const feedback = {
      sessionId: testSessionId,
      userId: testUserId,
      rating: 5,
      comments: 'Great session!',
      createdAt: new Date(),
    };
    const result = await firestore.collection('feedback').add(feedback);
    console.log('Submitted feedback with ID:', result.id);
  } catch (err) {
    console.error('Firestore feedback submission error:', err);
  }
}

test(); 