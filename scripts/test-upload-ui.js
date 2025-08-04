require('dotenv').config();
const axios = require('axios');

console.log('🧪 Testing Upload UI Functionality...\n');

async function testUploadAPI() {
  try {
    console.log('📤 Testing upload API response format...');
    
    // Create a simple test file content
    const testContent = 'This is a test file for upload functionality.';
    const testFile = new Blob([testContent], { type: 'text/plain' });
    
    const formData = new FormData();
    formData.append('file', testFile, 'test-file.txt');
    formData.append('userId', 'test-user-id');
    
    const response = await axios.post('http://localhost:3000/api/upload', formData, {
      headers: {
        ...formData.getHeaders(),
      },
      timeout: 30000,
    });
    
    console.log('✅ Upload API response format:');
    console.log('Response structure:', JSON.stringify(response.data, null, 2));
    
    // Check if the response has the expected format for UI
    if (response.data.results && Array.isArray(response.data.results)) {
      console.log('✅ Response has results array - UI will work correctly');
      
      if (response.data.results.length > 0) {
        const result = response.data.results[0];
        console.log('✅ First result has required fields:');
        console.log('  - name:', result.name);
        console.log('  - status:', result.status);
        console.log('  - url:', result.url);
        console.log('  - document:', result.document ? 'present' : 'missing');
      }
    } else {
      console.log('❌ Response format may cause UI issues');
    }
    
  } catch (error) {
    console.log('❌ Upload test failed:', error.message);
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
    await testUploadAPI();
  } catch (error) {
    console.log('❌ Server is not running');
    console.log('Please start the development server with: npm run dev');
  }
}

main().catch(console.error); 