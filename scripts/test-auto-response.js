const axios = require('axios');

async function testAutoResponse() {
  try {
    console.log('🟦 [test][INFO] Testing auto-response functionality...');
    
    // Test 1: Create a new chat session
    console.log('🟦 [test][INFO] Creating new chat session...');
    const createResponse = await axios.post('http://localhost:3001/api/create_chat_session', {
      firstMessage: 'Hey, I need to draft a MoU with a client of mine.. can you please help me with that?',
      userId: '7da4ba9a-e3b6-49b6-b812-26957e3cd5c6'
    });
    
    const sessionId = createResponse.data.chatId; // Fixed: should be chatId, not sessionId
    console.log('🟩 [test][SUCCESS] Created session:', sessionId);
    
    // Test 2: Check if messages are loaded
    console.log('🟦 [test][INFO] Checking messages...');
    const messagesResponse = await axios.get(`http://localhost:3001/api/sessions/${sessionId}`);
    console.log('🟩 [test][SUCCESS] Messages loaded:', messagesResponse.data.messages.length);
    console.log('🟦 [test][INFO] Messages:', messagesResponse.data.messages);
    
    // Test 3: Check session metadata
    console.log('🟦 [test][INFO] Checking session metadata...');
    const metadataResponse = await axios.get(`http://localhost:3001/api/sessions/${sessionId}/metadata`);
    console.log('🟩 [test][SUCCESS] Session metadata:', metadataResponse.data);
    
    // Test 4: Simulate a query to trigger auto-response
    console.log('🟦 [test][INFO] Testing query API...');
    const queryResponse = await axios.post('http://localhost:3001/api/query', {
      query: 'Hey, I need to draft a MoU with a client of mine.. can you please help me with that?',
      sessionId: sessionId,
      userId: '7da4ba9a-e3b6-49b6-b812-26957e3cd5c6'
    }, {
      responseType: 'stream'
    });
    
    console.log('🟩 [test][SUCCESS] Query API responded with status:', queryResponse.status);
    
    // Read the stream
    let responseText = '';
    queryResponse.data.on('data', (chunk) => {
      responseText += chunk.toString();
      console.log('🟦 [test][INFO] Received chunk:', chunk.toString().substring(0, 100));
    });
    
    queryResponse.data.on('end', () => {
      console.log('🟩 [test][SUCCESS] Full response received:', responseText.substring(0, 200));
    });
    
  } catch (error) {
    console.error('🟥 [test][ERROR] Test failed:', error.message);
    if (error.response) {
      console.error('🟥 [test][ERROR] Response status:', error.response.status);
      console.error('🟥 [test][ERROR] Response data:', error.response.data);
    }
  }
}

testAutoResponse(); 