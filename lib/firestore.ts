import { Firestore } from '@google-cloud/firestore';

const firestore = new Firestore({
  projectId: process.env.FIRESTORE_PROJECT_ID,
});

export default firestore; 