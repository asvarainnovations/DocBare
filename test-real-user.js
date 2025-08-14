const axios = require('axios');

// Test configuration
const BASE_URL = 'http://localhost:3000';
const REAL_USER_ID = '474c4aa0-17d0-4883-902a-212973a2ea50'; // From database

async function testRealUserChats() {
  console.log('🧪 Testing with real user ID...\n');

  try {
    // Test 1: Fetch user chats
    console.log('1️⃣ Fetching chats for real user...');
    const fetchResponse = await axios.get(`${BASE_URL}/api/user_chats`, {
      params: { userId: REAL_USER_ID }
    });
    
    console.log('✅ API Response:', {
      status: fetchResponse.status,
      chatCount: fetchResponse.data.chats?.length || 0,
      source: fetchResponse.data.source,
      chats: fetchResponse.data.chats?.map(chat => ({
        id: chat.id,
        sessionName: chat.sessionName,
        createdAt: chat.createdAt,
        messageCount: chat.messageCount
      }))
    });

    // Test 2: Check if chats are being returned
    if (fetchResponse.data.chats && fetchResponse.data.chats.length > 0) {
      console.log('\n✅ Chats are being fetched successfully!');
      console.log(`Found ${fetchResponse.data.chats.length} chats for user ${REAL_USER_ID}`);
    } else {
      console.log('\n❌ No chats returned from API, but database has chats');
      console.log('This suggests an issue with the API endpoint');
    }

  } catch (error) {
    console.error('❌ Test failed:', {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data
    });
  }
}

testRealUserChats();
