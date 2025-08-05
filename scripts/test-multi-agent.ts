import { StreamingOrchestrator } from '../lib/streamingOrchestrator';
import { aiLogger } from '../lib/logger';

async function testMultiAgentSystem() {
  console.log('🧪 Testing Multi-Agent System...\n');

  // Test context
  const testContext = {
    query: "Please analyze this employment contract and draft a response letter addressing the non-compete clause.",
    sessionId: "test-session-123",
    userId: "test-user-456",
    documentContent: `
EMPLOYMENT AGREEMENT

This Employment Agreement (the "Agreement") is entered into on [Date] between [Company Name] (the "Company") and [Employee Name] (the "Employee").

1. POSITION AND DUTIES
The Employee shall serve as [Position] and shall perform all duties and responsibilities associated with such position.

2. NON-COMPETE CLAUSE
The Employee agrees that during the term of employment and for a period of 2 years following termination, the Employee shall not:
(a) Engage in any business that competes with the Company
(b) Solicit any customers or clients of the Company
(c) Hire or attempt to hire any employees of the Company

3. CONFIDENTIALITY
The Employee shall maintain the confidentiality of all proprietary information of the Company.

4. TERMINATION
This Agreement may be terminated by either party with 30 days written notice.
    `,
    documentName: "Employment Contract Sample"
  };

  try {
    console.log('📋 Test Context:');
    console.log(`- Query: ${testContext.query}`);
    console.log(`- Session: ${testContext.sessionId}`);
    console.log(`- User: ${testContext.userId}`);
    console.log(`- Document: ${testContext.documentName}`);
    console.log(`- Document Length: ${testContext.documentContent.length} characters\n`);

    console.log('🎭 Starting Multi-Agent Processing...\n');

    // Get the stream
    const stream = await StreamingOrchestrator.streamResponse(testContext);
    
    // Read the stream
    const reader = stream.getReader();
    const decoder = new TextDecoder();
    let fullResponse = '';

    console.log('📤 Streaming Response:\n');
    console.log('─'.repeat(80));

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value, { stream: true });
        fullResponse += chunk;
        process.stdout.write(chunk);
      }
    } finally {
      reader.releaseLock();
    }

    console.log('\n─'.repeat(80));
    console.log(`\n✅ Multi-Agent Test Completed!`);
    console.log(`📊 Response Length: ${fullResponse.length} characters`);
    console.log(`🎯 Mode: ${StreamingOrchestrator.getModeDescription()}`);

  } catch (error) {
    console.error('❌ Multi-Agent Test Failed:', error);
    aiLogger.error('Multi-agent test failed:', error);
  }
}

async function testSingleAgentMode() {
  console.log('\n🧪 Testing Single-Agent Mode...\n');

  const testContext = {
    query: "What are the key legal considerations for starting a business in India?",
    sessionId: "test-session-789",
    userId: "test-user-101",
    documentContent: '',
    documentName: ''
  };

  try {
    console.log('📋 Test Context:');
    console.log(`- Query: ${testContext.query}`);
    console.log(`- Session: ${testContext.sessionId}`);
    console.log(`- User: ${testContext.userId}`);
    console.log(`- Document: None\n`);

    console.log('🤖 Starting Single-Agent Processing...\n');

    const stream = await StreamingOrchestrator.streamResponse(testContext);
    
    const reader = stream.getReader();
    const decoder = new TextDecoder();
    let fullResponse = '';

    console.log('📤 Streaming Response:\n');
    console.log('─'.repeat(80));

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value, { stream: true });
        fullResponse += chunk;
        process.stdout.write(chunk);
      }
    } finally {
      reader.releaseLock();
    }

    console.log('\n─'.repeat(80));
    console.log(`\n✅ Single-Agent Test Completed!`);
    console.log(`📊 Response Length: ${fullResponse.length} characters`);
    console.log(`🎯 Mode: ${StreamingOrchestrator.getModeDescription()}`);

  } catch (error) {
    console.error('❌ Single-Agent Test Failed:', error);
    aiLogger.error('Single-agent test failed:', error);
  }
}

// Main test function
async function runTests() {
  console.log('🚀 DocBare Multi-Agent System Test Suite\n');
  console.log('='.repeat(80));

  // Test 1: Multi-Agent Mode (with document)
  await testMultiAgentSystem();

  // Test 2: Single-Agent Mode (no document)
  await testSingleAgentMode();

  console.log('\n' + '='.repeat(80));
  console.log('🎉 All Tests Completed!');
}

// Run the tests
if (require.main === module) {
  runTests().catch(console.error);
} 