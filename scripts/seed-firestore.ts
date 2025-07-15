import firestore from '../lib/firestore';

async function seed() {
  // Sample users
  const users = [
    { id: 'user1', email: 'user1@example.com' },
    { id: 'user2', email: 'user2@example.com' },
  ];

  // Sample documents
  const documents = [
    {
      userId: 'user1',
      filename: 'sample1.pdf',
      contentType: 'application/pdf',
      uploadDate: new Date(),
      status: 'processed',
      metadata: {},
      text: 'This is a sample document for user1. It contains legal information.'
    },
    {
      userId: 'user2',
      filename: 'sample2.pdf',
      contentType: 'application/pdf',
      uploadDate: new Date(),
      status: 'processed',
      metadata: {},
      text: 'This is a sample document for user2. It contains contract details.'
    },
  ];

  // Add documents and related chunks/embeddings
  for (const doc of documents) {
    const docRef = await firestore.collection('documents').add(doc);
    const docId = docRef.id;
    // Add chunks
    for (let i = 0; i < 2; i++) {
      const chunkText = `${doc.text} [Chunk ${i + 1}]`;
      const chunkDoc = {
        documentId: docId,
        userId: doc.userId,
        chunkIndex: i,
        text: chunkText,
        tokenCount: chunkText.split(/\s+/).length,
        createdAt: new Date(),
      };
      const chunkRef = await firestore.collection('document_chunks').add(chunkDoc);
      // Add embedding
      const embeddingDoc = {
        chunkId: chunkRef.id,
        userId: doc.userId,
        vector: Array(10).fill(Math.random()), // Dummy vector
        model: 'text-embedding-3-small',
        createdAt: new Date(),
      };
      await firestore.collection('embeddings').add(embeddingDoc);
    }
  }
  console.log('Firestore seeded with sample users, documents, chunks, and embeddings.');
}

seed().catch((err) => {
  console.error('Seeding failed:', err);
  process.exit(1);
}); 