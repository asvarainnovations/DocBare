import axios from 'axios';

async function testQueryAPI() {
  const baseURL = 'http://localhost:3000';
  
  console.log('🧪 Testing Query API...');
  
  try {
    // Test 1: GET request to verify endpoint is accessible
    console.log('\n1️⃣ Testing GET /api/query...');
    const getResponse = await axios.get(`${baseURL}/api/query`);
    console.log('✅ GET /api/query successful:', getResponse.data);
    
    // Test 2: POST request with minimal data
    console.log('\n2️⃣ Testing POST /api/query...');
    const postResponse = await axios.post(`${baseURL}/api/query`, {
      query: 'Hello, this is a test message',
      userId: 'test-user-id',
      sessionId: 'test-session-id'
    }, {
      timeout: 30000, // 30 second timeout
      responseType: 'stream',
      headers: {
        'Accept': 'text/plain, application/json, */*'
      }
    });
    
    console.log('✅ POST /api/query successful:', {
      status: postResponse.status,
      statusText: postResponse.statusText,
      headers: postResponse.headers
    });
    
    // Read the stream
    let responseText = '';
    let chunkCount = 0;
    
    postResponse.data.on('data', (chunk: Buffer) => {
      const text = chunk.toString();
      responseText += text;
      chunkCount++;
      console.log(`📦 Received chunk #${chunkCount}:`, {
        chunkLength: text.length,
        totalLength: responseText.length,
        preview: text.substring(0, 100) + (text.length > 100 ? '...' : '')
      });
    });
    
    postResponse.data.on('end', () => {
      console.log('✅ Stream completed:', {
        totalChunks: chunkCount,
        totalLength: responseText.length,
        responsePreview: responseText.substring(0, 200) + (responseText.length > 200 ? '...' : '')
      });
    });
    
    postResponse.data.on('error', (error: any) => {
      console.error('❌ Stream error:', error);
    });
    
    // Wait for the stream to complete
    await new Promise((resolve, reject) => {
      postResponse.data.on('end', resolve);
      postResponse.data.on('error', reject);
      // Timeout after 25 seconds
      setTimeout(() => {
        console.log('⏰ Stream timeout reached');
        resolve(null);
      }, 25000);
    });
    
  } catch (error: any) {
    console.error('❌ Test failed:', {
      message: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data
    });
  }
}

// Run the test
testQueryAPI().catch(console.error); 