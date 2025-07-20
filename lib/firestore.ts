import { Firestore } from '@google-cloud/firestore';

const firestoreConfig: any = {
  projectId: process.env.FIRESTORE_PROJECT_ID,
  databaseId: process.env.FIRESTORE_DATABASE_ID,
};

if (process.env.GOOGLE_CLOUD_KEY_FILE) {
  firestoreConfig.keyFilename = process.env.GOOGLE_CLOUD_KEY_FILE;
}

const firestore = new Firestore(firestoreConfig);

export default firestore; 