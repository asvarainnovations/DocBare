import { config as dotenvConfig } from 'dotenv';
dotenvConfig();
import { uploadFile } from '@/lib/gcs';

async function test() {
  // Create a dummy file (Buffer)
  const fileContent = Buffer.from('Hello, GCS!');
  const file = new File([fileContent], 'test.txt', { type: 'text/plain' });
  try {
    const { url, error } = await uploadFile('test-upload.txt', file);
    if (error) throw error;
    console.info('🟩 [test_gcs][SUCCESS] Uploaded file URL:', url);
  } catch (err) {
    console.error('🟥 [test_gcs][ERROR] GCS upload error:', err);
  }
}

test(); 