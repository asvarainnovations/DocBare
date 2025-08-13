import { Storage } from '@google-cloud/storage';

// Dynamic import for pdf-parse
let pdfParse: any = null;
try {
  pdfParse = require('pdf-parse');
  console.log('✅ pdf-parse loaded successfully');
} catch (error) {
  console.error('❌ Failed to load pdf-parse:', error);
  process.exit(1);
}

// Initialize GCS
const gcsConfig: any = {
  projectId: process.env.FIRESTORE_PROJECT_ID,
};

if (process.env.GOOGLE_CLOUD_KEY_FILE) {
  gcsConfig.keyFilename = process.env.GOOGLE_CLOUD_KEY_FILE;
}

const storage = new Storage(gcsConfig);
const bucket = storage.bucket(process.env.GCS_BUCKET_NAME!);

async function testPdfParsing() {
  try {
    console.log('🔍 Testing PDF parsing functionality...');
    
    // List files in the bucket
    const [files] = await bucket.getFiles();
    console.log(`📁 Found ${files.length} files in bucket`);
    
    // Find PDF files
    const pdfFiles = files.filter(file => file.name.toLowerCase().endsWith('.pdf'));
    console.log(`📄 Found ${pdfFiles.length} PDF files`);
    
    if (pdfFiles.length === 0) {
      console.log('❌ No PDF files found to test');
      return;
    }
    
    // Test the first PDF file
    const testFile = pdfFiles[0];
    console.log(`🧪 Testing PDF parsing on: ${testFile.name}`);
    
    // Download the file
    const [buffer] = await testFile.download();
    console.log(`📥 Downloaded: ${buffer.length} bytes`);
    
    // Parse with pdf-parse
    const data = await pdfParse(buffer);
    console.log(`📝 Parsed text length: ${data.text.length} characters`);
    console.log(`📊 Page count: ${data.numpages}`);
    console.log(`📋 First 200 characters: "${data.text.substring(0, 200)}..."`);
    
    if (data.text.trim().length < 50) {
      console.warn('⚠️  Warning: Extracted text is very short, PDF might be image-based or corrupted');
    } else {
      console.log('✅ PDF parsing successful!');
    }
    
  } catch (error) {
    console.error('❌ Error testing PDF parsing:', error);
  }
}

testPdfParsing();
