import { LangGraphOrchestrator } from '../lib/langgraphOrchestrator';
import { aiLogger } from '../lib/logger';

async function testUpdatedMultiAgent() {
  aiLogger.info('🧪 Testing Updated Multi-Agent System with New Prompts');

  const orchestrator = new LangGraphOrchestrator();

  // Test 1: Document Analysis + Drafting Workflow
  console.log('\n📋 Test 1: Document Analysis + Drafting Workflow');
  console.log('=' .repeat(60));
  
  const testDocument = `
  AGREEMENT FOR SALE
  
  This Agreement for Sale is made on this 15th day of March, 2024 between:
  
  Party A: ABC Corporation, a company incorporated under the Companies Act, 2013
  Party B: XYZ Limited, a company incorporated under the Companies Act, 2013
  
  WHEREAS Party A wishes to sell and Party B wishes to purchase the property described herein;
  
  NOW THEREFORE, the parties agree as follows:
  
  1. SALE AND PURCHASE: Party A agrees to sell and Party B agrees to purchase the property located at 123 Main Street, Mumbai, Maharashtra.
  
  2. PURCHASE PRICE: The total purchase price shall be Rs. 50,00,000 (Rupees Fifty Lakhs Only).
  
  3. PAYMENT TERMS: Party B shall pay 20% advance within 7 days of signing this agreement.
  
  4. POSSESSION: Possession shall be given within 30 days of full payment.
  
  5. TITLE: Party A warrants that they have clear and marketable title to the property.
  
  IN WITNESS WHEREOF, the parties have signed this agreement on the date first above written.
  `;

  const testQuery1 = "Please analyze this agreement and draft an improved version with better protection for both parties.";

  try {
    const startTime = Date.now();
    const result1 = await orchestrator.processQuery(
      'test-session-1',
      'test-user-1',
      testQuery1,
      testDocument,
      'agreement_for_sale.txt'
    );
    const duration1 = Date.now() - startTime;

    console.log(`✅ Test 1 completed in ${duration1}ms`);
    console.log(`📊 Response length: ${result1.response.length} characters`);
    console.log(`🔍 Has error: ${!!result1.error}`);
    
    if (result1.error) {
      console.log(`❌ Error: ${result1.error}`);
    } else {
      console.log(`📝 Response preview: ${result1.response.substring(0, 300)}...`);
    }
  } catch (error) {
    console.log(`❌ Test 1 failed: ${error}`);
  }

  // Test 2: Direct Drafting Workflow (No Document)
  console.log('\n✍️ Test 2: Direct Drafting Workflow (No Document)');
  console.log('=' .repeat(60));
  
  const testQuery2 = "Draft a legal notice for non-payment of rent under the Rent Control Act.";

  try {
    const startTime = Date.now();
    const result2 = await orchestrator.processQuery(
      'test-session-2',
      'test-user-2',
      testQuery2
    );
    const duration2 = Date.now() - startTime;

    console.log(`✅ Test 2 completed in ${duration2}ms`);
    console.log(`📊 Response length: ${result2.response.length} characters`);
    console.log(`🔍 Has error: ${!!result2.error}`);
    
    if (result2.error) {
      console.log(`❌ Error: ${result2.error}`);
    } else {
      console.log(`📝 Response preview: ${result2.response.substring(0, 300)}...`);
    }
  } catch (error) {
    console.log(`❌ Test 2 failed: ${error}`);
  }

  // Test 3: Analysis Request Without Document
  console.log('\n🔍 Test 3: Analysis Request Without Document');
  console.log('=' .repeat(60));
  
  const testQuery3 = "Please analyze this contract and provide recommendations.";

  try {
    const startTime = Date.now();
    const result3 = await orchestrator.processQuery(
      'test-session-3',
      'test-user-3',
      testQuery3
    );
    const duration3 = Date.now() - startTime;

    console.log(`✅ Test 3 completed in ${duration3}ms`);
    console.log(`📊 Response length: ${result3.response.length} characters`);
    console.log(`🔍 Has error: ${!!result3.error}`);
    
    if (result3.error) {
      console.log(`❌ Error: ${result3.error}`);
    } else {
      console.log(`📝 Response preview: ${result3.response.substring(0, 300)}...`);
    }
  } catch (error) {
    console.log(`❌ Test 3 failed: ${error}`);
  }

  console.log('\n🎉 Multi-Agent System Testing Completed!');
}

// Run the test
testUpdatedMultiAgent().catch(console.error); 