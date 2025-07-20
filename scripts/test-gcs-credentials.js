const { Storage } = require('@google-cloud/storage');

console.log('GOOGLE_CLOUD_KEY_FILE:', process.env.GOOGLE_CLOUD_KEY_FILE);
console.log('GOOGLE_APPLICATION_CREDENTIALS:', process.env.GOOGLE_APPLICATION_CREDENTIALS);

async function testGCS() {
  try {
    const storage = new Storage();
    const [buckets] = await storage.getBuckets();
    console.log('Buckets:', buckets.map(b => b.name));
    console.log('GCS credentials are valid!');
  } catch (err) {
    console.error('GCS credentials test failed:', err);
    process.exit(1);
  }
}

testGCS(); 