import fs from 'fs';
import readline from 'readline';
import firestore from './firestore';

const CHUNKS_FILE = 'kb_data/datasets/legal_kb_embeddings_batch.json';

/**
 * Fetch chunk texts by ID. Uses local file in development, Firestore in production.
 * @param ids Array of chunk IDs
 * @returns Array of {id, text}
 */
export async function getChunkTexts(ids: string[]): Promise<{ id: string, text: string }[]> {
  if (process.env.NODE_ENV === 'development') {
    // Local file method
    const rl = readline.createInterface({
      input: fs.createReadStream(CHUNKS_FILE),
      crlfDelay: Infinity,
    });
    const results: { id: string, text: string }[] = [];
    for await (const line of rl) {
      const rec = JSON.parse(line);
      if (ids.includes(rec.id)) {
        results.push({ id: rec.id, text: rec.text });
        if (results.length === ids.length) break;
      }
    }
    return results;
  } else {
    // Firestore method
    const results: { id: string, text: string }[] = [];
    for (const id of ids) {
      const doc = await firestore.collection('legal_kb_chunks').doc(id).get();
      if (doc.exists) {
        const data = doc.data();
        results.push({ id, text: data?.text || '' });
      }
    }
    return results;
  }
} 