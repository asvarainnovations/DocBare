const axios = require('axios');

// Test configuration
const BASE_URL = 'http://localhost:3000';

async function testSessionUser() {
  console.log('🧪 Testing session user ID...\n');

  try {
    // Test 1: Check if we can access the session endpoint
    console.log('1️⃣ Testing session endpoint...');
    
    // First, let's try to get the current session
    const sessionResponse = await axios.get(`${BASE_URL}/api/auth/session`);
    console.log('Session response:', sessionResponse.data);

    // Test 2: Try to access user_chats without userId (should use session)
    console.log('\n2️⃣ Testing user_chats without userId...');
    const chatsResponse = await axios.get(`${BASE_URL}/api/user_chats`);
    console.log('Chats response:', {
      status: chatsResponse.status,
      chatCount: chatsResponse.data.chats?.length || 0,
      source: chatsResponse.data.source
    });

  } catch (error) {
    console.error('❌ Test failed:', {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data
    });
  }
}

testSessionUser();
