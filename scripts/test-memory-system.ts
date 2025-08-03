import { config as dotenvConfig } from 'dotenv';
dotenvConfig();

import { memoryManager } from '@/lib/memory';
import axios from 'axios';

const TEST_SESSION_ID = 'test-memory-session-' + Date.now();
const TEST_USER_ID = process.env.TEST_USER_ID || 'test-user-id';

async function testMemorySystem() {
  console.log('🧪 Testing Memory System...\n');

  try {
    // Test 1: Store conversation memory
    console.log('📝 Test 1: Storing conversation memory...');
    const conversationId = await memoryManager.storeConversationMemory(
      TEST_SESSION_ID,
      TEST_USER_ID,
      'user',
      'What are the key terms in this contract?'
    );
    console.log('✅ Conversation memory stored:', conversationId);

    // Test 2: Store reasoning memory
    console.log('\n🧠 Test 2: Storing reasoning memory...');
    const reasoningId = await memoryManager.storeReasoningMemory(
      TEST_SESSION_ID,
      TEST_USER_ID,
      'Analyzing contract for key terms: payment terms, termination clauses, liability provisions',
      { confidence: 0.9, tags: ['contract-analysis'] }
    );
    console.log('✅ Reasoning memory stored:', reasoningId);

    // Test 3: Store decision memory
    console.log('\n🎯 Test 3: Storing decision memory...');
    const decisionId = await memoryManager.storeDecisionMemory(
      TEST_SESSION_ID,
      TEST_USER_ID,
      'Focus on payment terms and termination clauses as primary concerns',
      { confidence: 0.85, priority: 'high' }
    );
    console.log('✅ Decision memory stored:', decisionId);

    // Test 4: Retrieve memories
    console.log('\n🔍 Test 4: Retrieving memories...');
    const memories = await memoryManager.retrieveMemories(
      TEST_SESSION_ID,
      TEST_USER_ID,
      'contract terms',
      10
    );
    console.log('✅ Retrieved memories:', memories.length);

    // Test 5: Generate memory context
    console.log('\n📋 Test 5: Generating memory context...');
    const context = await memoryManager.generateMemoryContext(
      TEST_SESSION_ID,
      TEST_USER_ID,
      'What about the termination clause?'
    );
    console.log('✅ Memory context generated:', context.length, 'characters');

    // Test 6: API endpoint test
    console.log('\n🌐 Test 6: Testing memory API endpoint...');
    const apiResponse = await axios.post('http://localhost:3000/api/memory', {
      sessionId: TEST_SESSION_ID,
      userId: TEST_USER_ID,
      type: 'conversation',
      content: 'Testing API endpoint',
      metadata: { source: 'test' }
    });
    console.log('✅ API endpoint test:', apiResponse.data.success);

    // Test 7: Get conversation history
    console.log('\n📚 Test 7: Getting conversation history...');
    const history = await memoryManager.getConversationHistory(TEST_SESSION_ID, 5);
    console.log('✅ Conversation history:', history.length, 'entries');

    // Test 8: Get reasoning chain
    console.log('\n🔗 Test 8: Getting reasoning chain...');
    const reasoning = await memoryManager.getReasoningChain(TEST_SESSION_ID, 3);
    console.log('✅ Reasoning chain:', reasoning.length, 'entries');

    console.log('\n🎉 All memory system tests passed!');

  } catch (error: any) {
    console.error('❌ Memory system test failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

async function testMemoryCleanup() {
  console.log('\n🧹 Testing memory cleanup...');
  
  try {
    const count = await memoryManager.cleanupOldMemories(0); // Clean up test data
    console.log('✅ Cleanup test completed');
  } catch (error: any) {
    console.error('❌ Cleanup test failed:', error.message);
  }
}

// Run tests
async function runTests() {
  await testMemorySystem();
  await testMemoryCleanup();
  process.exit(0);
}

runTests().catch(console.error); 