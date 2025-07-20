import { Storage } from '@google-cloud/storage';

const gcsConfig: any = {
  projectId: process.env.FIRESTORE_PROJECT_ID,
};

if (process.env.GOOGLE_CLOUD_KEY_FILE) {
  gcsConfig.keyFilename = process.env.GOOGLE_CLOUD_KEY_FILE;
}

const storage = new Storage(gcsConfig);
const bucket = storage.bucket(process.env.GCS_BUCKET_NAME!);

export async function uploadFile(fileName: string, file: File) {
  try {
    const blob = bucket.file(fileName);
    const stream = blob.createWriteStream({
      resumable: false,
      contentType: file.type,
    });

    // Convert File to Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    await new Promise((resolve, reject) => {
      stream.on('error', reject);
      stream.on('finish', resolve);
      stream.end(buffer);
    });

    // Make file public (optional)
    // await blob.makePublic();

    const url = `https://storage.googleapis.com/${process.env.GCS_BUCKET_NAME}/${fileName}`;
    return { url };
  } catch (error: any) {
    return { url: null, error };
  }
}

export async function getSignedUrl(filePath: string, expiresInSeconds = 60 * 10) {
  const file = bucket.file(filePath);
  const [url] = await file.getSignedUrl({
    action: 'read',
    expires: Date.now() + expiresInSeconds * 1000,
  });
  return url;
} 