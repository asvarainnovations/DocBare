import { initializeApp } from 'firebase/app';
import { getFirestore, collection, query, where, getDocs } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function testDocumentContent() {
  try {
    console.log('🔍 Testing document content retrieval...');
    
    // Get the latest document chunks
    const chunksRef = collection(db, 'document_chunks');
    const chunksQuery = query(chunksRef);
    const chunksSnapshot = await getDocs(chunksQuery);
    
    if (!chunksSnapshot.empty) {
      console.log(`📄 Found ${chunksSnapshot.size} document chunks`);
      
      chunksSnapshot.forEach((doc) => {
        const data = doc.data();
        console.log('\n--- Document Chunk ---');
        console.log('Document ID:', data.documentId);
        console.log('Chunk Index:', data.chunkIndex);
        console.log('Text Length:', data.text?.length || 0);
        console.log('Text Content:', data.text);
        console.log('--- End Chunk ---\n');
      });
      
      // Combine all chunks
      const allText = chunksSnapshot.docs
        .map((doc) => doc.data().text)
        .join('\n\n');
      
      console.log('📋 Combined Document Content:');
      console.log('Total Length:', allText.length);
      console.log('Content:', allText);
      
    } else {
      console.log('❌ No document chunks found');
    }
    
  } catch (error) {
    console.error('❌ Error testing document content:', error);
  }
}

testDocumentContent();
