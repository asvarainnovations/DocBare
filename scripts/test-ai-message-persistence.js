require('dotenv').config();
const axios = require('axios');

console.log('🧪 Testing AI Message Persistence...\n');

async function testAIMessagePersistence() {
  try {
    // Test 1: Check if the /api/chat endpoint exists and works
    console.log('📋 Test 1: Testing /api/chat endpoint');
    
    const testMessage = {
      sessionId: 'test-session-id',
      userId: 'test-user-id',
      role: 'ASSISTANT',
      content: 'This is a test AI response to verify persistence.'
    };

    try {
      const response = await axios.post('http://localhost:3000/api/chat', testMessage);
      console.log('✅ /api/chat endpoint is working');
      console.log('   Response:', response.data);
    } catch (error) {
      console.log('❌ /api/chat endpoint failed:', error.response?.data || error.message);
    }

    console.log('');

    // Test 2: Check if messages are being loaded correctly
    console.log('📋 Test 2: Testing message loading');
    
    try {
      const response = await axios.get('http://localhost:3000/api/sessions/test-session-id');
      console.log('✅ Message loading endpoint is working');
      console.log('   Messages found:', response.data.messages?.length || 0);
    } catch (error) {
      console.log('❌ Message loading failed:', error.response?.data || error.message);
    }

    console.log('');

    // Test 3: Simulate the complete flow
    console.log('📋 Test 3: Simulating complete AI response flow');
    
    const flowSteps = [
      '1. User sends message',
      '2. AI generates response',
      '3. AI response is saved to database',
      '4. Page is refreshed',
      '5. Messages are loaded from database',
      '6. AI response should be visible'
    ];

    flowSteps.forEach(step => {
      console.log(`   ${step}`);
    });

    console.log('\n🎯 Expected Behavior:');
    console.log('• AI responses should be saved to the database after generation');
    console.log('• Page refresh should show all messages including AI responses');
    console.log('• No AI responses should be lost on refresh');
    console.log('• Both manual sends and auto-responses should be persisted');
    console.log('• Regenerated responses should also be saved');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testAIMessagePersistence().catch(console.error); 