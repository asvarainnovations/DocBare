import { Storage } from '@google-cloud/storage';

// Test pdf-parse loading
let pdfParse: any = null;

async function testPdfParseLoading() {
  console.log('🔍 Testing pdf-parse loading...');
  
  try {
    const pdfParseModule = await import('pdf-parse');
    pdfParse = pdfParseModule.default || pdfParseModule;
    console.log('✅ pdf-parse module loaded successfully');
    
    // Test with minimal PDF
    const testBuffer = Buffer.from('%PDF-1.4\n1 0 obj\n<<\n/Type /Catalog\n/Pages 2 0 R\n>>\nendobj\n2 0 obj\n<<\n/Type /Pages\n/Kids []\n/Count 0\n>>\nendobj\nxref\n0 3\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n\ntrailer\n<<\n/Size 3\n/Root 1 0 R\n>>\nstartxref\n116\n%%EOF\n');
    
    const result = await pdfParse(testBuffer);
    console.log('✅ pdf-parse test successful');
    console.log(`📄 Test PDF pages: ${result.numpages}`);
    console.log(`📝 Test PDF text length: ${result.text.length}`);
    
    return true;
  } catch (error) {
    console.error('❌ pdf-parse test failed:', error);
    return false;
  }
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

async function testRealPdfParsing() {
  console.log('\n🔍 Testing real PDF parsing...');
  
  try {
    // List files in the bucket
    const [files] = await bucket.getFiles();
    const pdfFiles = files.filter(file => file.name.toLowerCase().endsWith('.pdf'));
    
    if (pdfFiles.length === 0) {
      console.log('❌ No PDF files found to test');
      return false;
    }
    
    const testFile = pdfFiles[0];
    console.log(`📄 Testing with: ${testFile.name}`);
    
    // Download the file
    const [buffer] = await testFile.download();
    console.log(`📥 Downloaded: ${buffer.length} bytes`);
    
    if (!pdfParse) {
      console.log('❌ pdf-parse not loaded');
      return false;
    }
    
    // Parse with pdf-parse
    const data = await pdfParse(buffer);
    console.log(`✅ Real PDF parsing successful!`);
    console.log(`📊 Pages: ${data.numpages}`);
    console.log(`📝 Text length: ${data.text.length} characters`);
    console.log(`📋 First 200 chars: "${data.text.substring(0, 200)}..."`);
    
    return true;
  } catch (error) {
    console.error('❌ Real PDF parsing failed:', error);
    return false;
  }
}

async function main() {
  console.log('🧪 Testing PDF parsing fixes...\n');
  
  const loadingTest = await testPdfParseLoading();
  const realTest = await testRealPdfParsing();
  
  console.log('\n📊 Test Results:');
  console.log(`📦 Module Loading: ${loadingTest ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`📄 Real PDF Parsing: ${realTest ? '✅ PASS' : '❌ FAIL'}`);
  
  if (loadingTest && realTest) {
    console.log('\n🎉 All tests passed! PDF parsing is working correctly.');
  } else {
    console.log('\n⚠️  Some tests failed. Check the logs above for details.');
  }
}

main().catch(console.error);
