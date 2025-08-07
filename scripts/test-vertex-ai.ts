import { retrieveFromKB, isKnowledgeBaseAvailable } from '../lib/vertexTool';
import { aiLogger } from '../lib/logger';

async function testVertexAI() {
  console.log('🧪 Testing Vertex AI Knowledge Base Integration...\n');

  try {
    // Test 1: Check if knowledge base is available
    console.log('1. Checking knowledge base availability...');
    const isAvailable = await isKnowledgeBaseAvailable();
    console.log(`   Knowledge base available: ${isAvailable ? '✅ Yes' : '❌ No'}\n`);

    if (!isAvailable) {
      console.log('⚠️  Knowledge base not available. Please check your configuration:');
      console.log('   - GCP_PROJECT_ID');
      console.log('   - VERTEX_AI_LOCATION');
      console.log('   - VERTEX_AI_INDEX_ENDPOINT');
      console.log('   - Service account key file (development) or Cloud Run service account (production)');
      return;
    }

    // Test 2: Test different query types
    const testQueries = [
      'What are the key elements of a valid contract?',
      'Explain the concept of indemnity in Indian law',
      'What are the requirements for a valid employment agreement?',
      'How to draft a legal notice?',
      'What are the grounds for contract termination?'
    ];

    console.log('2. Testing knowledge base retrieval...\n');

    for (let i = 0; i < testQueries.length; i++) {
      const query = testQueries[i];
      console.log(`   Query ${i + 1}: "${query}"`);
      
      try {
        const startTime = Date.now();
        const chunks = await retrieveFromKB(query, 3);
        const duration = Date.now() - startTime;
        
        console.log(`   ✅ Retrieved ${chunks.length} chunks in ${duration}ms`);
        
        if (chunks.length > 0) {
          console.log(`   📄 First chunk preview: ${chunks[0].substring(0, 100)}...`);
        }
        
        console.log('');
      } catch (error: any) {
        console.log(`   ❌ Error: ${error.message}`);
        console.log('');
      }
    }

    // Test 3: Performance test
    console.log('3. Performance test...');
    const performanceQueries = [
      'contract law',
      'employment agreement',
      'legal notice'
    ];

    const results = [];
    for (const query of performanceQueries) {
      const startTime = Date.now();
      const chunks = await retrieveFromKB(query, 2);
      const duration = Date.now() - startTime;
      
      results.push({
        query,
        chunks: chunks.length,
        duration
      });
    }

    console.log('   Performance Results:');
    results.forEach(result => {
      console.log(`   - "${result.query}": ${result.chunks} chunks in ${result.duration}ms`);
    });

    const avgDuration = results.reduce((sum, r) => sum + r.duration, 0) / results.length;
    console.log(`   Average response time: ${avgDuration.toFixed(0)}ms\n`);

    // Test 4: Error handling test
    console.log('4. Testing error handling...');
    try {
      const chunks = await retrieveFromKB('', 1); // Empty query
      console.log(`   ✅ Empty query handled gracefully: ${chunks.length} chunks`);
    } catch (error: any) {
      console.log(`   ❌ Empty query error: ${error.message}`);
    }

    console.log('\n🎉 Vertex AI Knowledge Base Integration Test Complete!');

  } catch (error: any) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

// Run the test
testVertexAI().catch(console.error); 