import { config as dotenvConfig } from 'dotenv';
dotenvConfig();

import axios from 'axios';

const BASE_URL = 'http://localhost:3000/api';
const TEST_USER_ID = process.env.TEST_USER_ID || 'test-user-id';

async function testAPIEndpoints() {
  console.log('🧪 Testing API Endpoints...\n');

  const tests = [
    // Memory API tests
    {
      name: 'Memory API - Store Memory',
      test: async () => {
        const response = await axios.post(`${BASE_URL}/memory`, {
          sessionId: 'test-session-' + Date.now(),
          userId: TEST_USER_ID,
          type: 'conversation',
          content: 'Test memory content',
          metadata: { source: 'test' }
        });
        return response.data.success;
      }
    },
    {
      name: 'Memory API - Retrieve Memories',
      test: async () => {
        const response = await axios.get(`${BASE_URL}/memory?sessionId=test-session&userId=${TEST_USER_ID}&limit=5`);
        return response.data.success;
      }
    },

    // Query API tests
    {
      name: 'Query API - Basic Query',
      test: async () => {
        const response = await axios.post(`${BASE_URL}/query`, {
          query: 'What is legal AI?',
          userId: TEST_USER_ID,
          sessionId: 'test-session-' + Date.now()
        });
        return response.status === 200;
      }
    },

    // Chat API tests
    {
      name: 'Chat API - Add Message',
      test: async () => {
        const response = await axios.post(`${BASE_URL}/chat`, {
          sessionId: 'test-session-' + Date.now(),
          userId: TEST_USER_ID,
          role: 'USER',
          content: 'Test message'
        });
        return response.data.success;
      }
    },

    // Sessions API tests
    {
      name: 'Sessions API - Get Messages',
      test: async () => {
        const response = await axios.get(`${BASE_URL}/sessions/test-session/messages`);
        return response.status === 200 || response.status === 404; // 404 is expected if session doesn't exist
      }
    },

    // Create Chat Session API tests
    {
      name: 'Create Chat Session API',
      test: async () => {
        const response = await axios.post(`${BASE_URL}/create_chat_session`, {
          firstMessage: 'Test first message',
          userId: TEST_USER_ID
        });
        return response.data.sessionId;
      }
    },

    // Upload API tests
    {
      name: 'Upload API - File Upload',
      test: async () => {
        const FormData = require('form-data');
        const fs = require('fs');
        const form = new FormData();
        
        // Create a test file
        const testContent = 'This is a test document for upload testing.';
        const testFilePath = './test-document.txt';
        fs.writeFileSync(testFilePath, testContent);
        
        form.append('file', fs.createReadStream(testFilePath));
        form.append('userId', TEST_USER_ID);
        
        const response = await axios.post(`${BASE_URL}/upload`, form, {
          headers: form.getHeaders()
        });
        
        // Clean up test file
        fs.unlinkSync(testFilePath);
        
        return response.data.documentId;
      }
    },

    // Feedback API tests
    {
      name: 'Feedback API - Submit Feedback',
      test: async () => {
        const response = await axios.post(`${BASE_URL}/feedback`, {
          sessionId: 'test-session-' + Date.now(),
          userId: TEST_USER_ID,
          rating: 5,
          comments: 'Test feedback'
        });
        return response.data.success;
      }
    },

    // User Chats API tests
    {
      name: 'User Chats API - Get User Chats',
      test: async () => {
        const response = await axios.get(`${BASE_URL}/user_chats?userId=${TEST_USER_ID}`);
        return Array.isArray(response.data.chats);
      }
    }
  ];

  let passedTests = 0;
  let totalTests = tests.length;

  for (const testCase of tests) {
    try {
      console.log(`🔍 Testing: ${testCase.name}...`);
      const result = await testCase.test();
      
      if (result) {
        console.log(`✅ ${testCase.name} - PASSED`);
        passedTests++;
      } else {
        console.log(`❌ ${testCase.name} - FAILED (returned false)`);
      }
    } catch (error: any) {
      console.log(`❌ ${testCase.name} - FAILED`);
      console.log(`   Error: ${error.message}`);
      
      // Don't fail the entire test suite for expected errors
      if (error.response?.status === 404 && testCase.name.includes('Sessions API')) {
        console.log(`   ⚠️  Expected 404 for non-existent session`);
        passedTests++; // Count as passed for expected behavior
      }
    }
    console.log('');
  }

  console.log(`📊 Test Results: ${passedTests}/${totalTests} tests passed`);
  
  if (passedTests === totalTests) {
    console.log('🎉 All API endpoint tests passed!');
  } else {
    console.log('⚠️  Some tests failed. Check the logs above.');
  }
}

async function testErrorHandling() {
  console.log('\n🧪 Testing Error Handling...\n');

  const errorTests = [
    {
      name: 'Memory API - Invalid Data',
      test: async () => {
        try {
          await axios.post(`${BASE_URL}/memory`, {
            // Missing required fields
            sessionId: 'test-session'
          });
          return false; // Should not reach here
        } catch (error: any) {
          return error.response?.status === 400;
        }
      }
    },
    {
      name: 'Query API - Missing Query',
      test: async () => {
        try {
          await axios.post(`${BASE_URL}/query`, {
            userId: TEST_USER_ID
            // Missing query field
          });
          return false; // Should not reach here
        } catch (error: any) {
          return error.response?.status === 400;
        }
      }
    }
  ];

  let passedErrorTests = 0;
  let totalErrorTests = errorTests.length;

  for (const testCase of errorTests) {
    try {
      console.log(`🔍 Testing: ${testCase.name}...`);
      const result = await testCase.test();
      
      if (result) {
        console.log(`✅ ${testCase.name} - PASSED`);
        passedErrorTests++;
      } else {
        console.log(`❌ ${testCase.name} - FAILED`);
      }
    } catch (error: any) {
      console.log(`❌ ${testCase.name} - FAILED`);
      console.log(`   Error: ${error.message}`);
    }
    console.log('');
  }

  console.log(`📊 Error Handling Results: ${passedErrorTests}/${totalErrorTests} tests passed`);
}

// Run tests
async function runTests() {
  await testAPIEndpoints();
  await testErrorHandling();
  process.exit(0);
}

runTests().catch(console.error); 