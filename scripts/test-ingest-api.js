require('dotenv').config();
const axios = require('axios');

console.log('🧪 Testing Ingest API...\n');

async function testIngestAPI() {
  try {
    console.log('📤 Testing document ingestion...');
    
    // Use the document ID from the previous upload test
    const documentId = 'e74ba369-065f-4d59-88da-a7aa66217858'; // From the latest upload test
    const userId = 'test-user-id';
    
    const response = await axios.post('http://localhost:3000/api/ingest', {
      documentId,
      userId,
    }, {
      timeout: 60000, // 60 seconds timeout for processing
    });
    
    console.log('✅ Ingest API response:');
    console.log('Response:', JSON.stringify(response.data, null, 2));
    
  } catch (error) {
    console.log('❌ Ingest API failed:', error.message);
    if (error.response) {
      console.log('Response status:', error.response.status);
      console.log('Response data:', error.response.data);
    }
  }
}

async function main() {
  console.log('🔍 Checking if server is running...');
  try {
    await axios.get('http://localhost:3000/api/query', { timeout: 5000 });
    console.log('✅ Server is running');
    await testIngestAPI();
  } catch (error) {
    console.log('❌ Server is not running');
    console.log('Please start the development server with: npm run dev');
  }
}

main().catch(console.error); 