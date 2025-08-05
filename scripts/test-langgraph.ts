import { LangGraphOrchestrator } from '../lib/langgraphOrchestrator';
import { aiLogger } from '../lib/logger';

async function testLangGraphWithDocument() {
  console.log('🧪 Testing LangGraph Multi-Agent System with Document\n');
  
  const orchestrator = new LangGraphOrchestrator();
  
  const testSessionId = 'test-session-' + Date.now();
  const testUserId = 'test-user-123';
  const testQuery = 'Please analyze this employment contract and draft a response letter addressing the key issues.';
  const testDocument = `
EMPLOYMENT AGREEMENT

This Employment Agreement (the "Agreement") is entered into on January 1, 2024, between ABC Corporation, a Delaware corporation (the "Company"), and John Doe (the "Employee").

1. POSITION AND DUTIES
The Employee shall serve as Senior Software Engineer and shall perform such duties as may be assigned by the Company.

2. COMPENSATION
The Employee shall receive an annual salary of $120,000, payable in accordance with the Company's normal payroll practices.

3. TERM
This Agreement shall commence on January 1, 2024, and shall continue until terminated by either party.

4. TERMINATION
Either party may terminate this Agreement with 30 days written notice.

5. CONFIDENTIALITY
The Employee agrees to maintain the confidentiality of all proprietary information.

6. NON-COMPETE
The Employee agrees not to work for a competitor for 12 months after termination.

7. GOVERNING LAW
This Agreement shall be governed by the laws of the State of California.
  `;
  const testDocumentName = 'employment_contract.pdf';

  try {
    console.log('📋 Test Parameters:');
    console.log(`   Session ID: ${testSessionId}`);
    console.log(`   User ID: ${testUserId}`);
    console.log(`   Query: ${testQuery}`);
    console.log(`   Document: ${testDocumentName}`);
    console.log(`   Document Length: ${testDocument.length} characters\n`);

    console.log('🚀 Starting LangGraph processing...\n');

    const startTime = Date.now();
    const result = await orchestrator.processQuery(
      testSessionId,
      testUserId,
      testQuery,
      testDocument,
      testDocumentName
    );
    const endTime = Date.now();

    console.log('✅ LangGraph processing completed!\n');
    console.log(`⏱️  Processing time: ${endTime - startTime}ms\n`);

    if (result.error) {
      console.log('❌ Error occurred:');
      console.log(result.error);
    } else {
      console.log('📄 Generated Response:');
      console.log('='.repeat(80));
      console.log(result.response);
      console.log('='.repeat(80));
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

async function testLangGraphWithoutDocument() {
  console.log('\n🧪 Testing LangGraph Multi-Agent System without Document\n');
  
  const orchestrator = new LangGraphOrchestrator();
  
  const testSessionId = 'test-session-no-doc-' + Date.now();
  const testUserId = 'test-user-456';
  const testQuery = 'Please draft a legal notice for breach of contract under Indian law.';

  try {
    console.log('📋 Test Parameters:');
    console.log(`   Session ID: ${testSessionId}`);
    console.log(`   User ID: ${testUserId}`);
    console.log(`   Query: ${testQuery}`);
    console.log(`   Document: None\n`);

    console.log('🚀 Starting LangGraph processing...\n');

    const startTime = Date.now();
    const result = await orchestrator.processQuery(
      testSessionId,
      testUserId,
      testQuery
    );
    const endTime = Date.now();

    console.log('✅ LangGraph processing completed!\n');
    console.log(`⏱️  Processing time: ${endTime - startTime}ms\n`);

    if (result.error) {
      console.log('❌ Error occurred:');
      console.log(result.error);
    } else {
      console.log('📄 Generated Response:');
      console.log('='.repeat(80));
      console.log(result.response);
      console.log('='.repeat(80));
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

async function runTests() {
  console.log('🎭 DocBare LangGraph Multi-Agent System Test Suite\n');
  console.log('='.repeat(80));

  // Test 1: With document
  await testLangGraphWithDocument();

  // Test 2: Without document
  await testLangGraphWithoutDocument();

  console.log('\n' + '='.repeat(80));
  console.log('🎉 All LangGraph Tests Completed!');
}

if (require.main === module) {
  runTests().catch(console.error);
} 