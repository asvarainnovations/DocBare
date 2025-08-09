import { retrieveFromKB, isKnowledgeBaseAvailable } from '../lib/vertexTool';
import { aiLogger } from '../lib/logger';
import * as dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

async function testVertexAI() {
  console.log('🧪 Testing Vertex AI Knowledge Base Integration...\n');

  // Check environment variables
  console.log('🔍 Environment Variables Check:');
  console.log(`   GOOGLE_CLOUD_PROJECT_ID: ${process.env.GOOGLE_CLOUD_PROJECT_ID ? '✅ Set' : '❌ Not set'}`);
  console.log(`   VERTEX_AI_LOCATION: ${process.env.VERTEX_AI_LOCATION ? '✅ Set' : '❌ Not set'}`);
  console.log(`   VERTEX_AI_INDEX_ENDPOINT: ${process.env.VERTEX_AI_INDEX_ENDPOINT ? '✅ Set' : '❌ Not set'}`);
  console.log(`   VERTEX_AI_DEPLOYED_INDEX_ID: ${process.env.VERTEX_AI_DEPLOYED_INDEX_ID ? '✅ Set' : '❌ Not set'}`);
  console.log(`   VERTEX_AI_PUBLIC_DOMAIN: ${process.env.VERTEX_AI_PUBLIC_DOMAIN ? '✅ Set' : '❌ Not set'}`);
  console.log(`   NODE_ENV: ${process.env.NODE_ENV || 'not set'}`);
  console.log('');

  // Check service account file
  const fs = require('fs');
  const path = require('path');
  const serviceAccountPath = path.join(__dirname, '../secrets/service-account-key.json');
  
  console.log('🔍 Service Account Check:');
  if (fs.existsSync(serviceAccountPath)) {
    console.log('   ✅ Service account key file exists');
    const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
    console.log(`   ✅ Service account email: ${serviceAccount.client_email}`);
  } else {
    console.log('   ❌ Service account key file not found');
  }
  console.log('');

  // Test the endpoint URL format
  const endpointUrl = `https://${process.env.VERTEX_AI_PUBLIC_DOMAIN}/v1/projects/${process.env.GOOGLE_CLOUD_PROJECT_ID}/locations/${process.env.VERTEX_AI_LOCATION}/indexEndpoints/${process.env.VERTEX_AI_INDEX_ENDPOINT}:findNeighbors`;
  console.log('🔍 Endpoint URL Check:');
  console.log(`   URL: ${endpointUrl}`);
  console.log('');

  console.log('1. Checking knowledge base availability...');
  const isAvailable = await isKnowledgeBaseAvailable();
  console.log(`   Knowledge base available: ${isAvailable ? '✅ Yes' : '❌ No'}`);

  if (!isAvailable) {
    console.log('\n⚠️  Knowledge base not available. Please check your configuration:');
    console.log('   - GOOGLE_CLOUD_PROJECT_ID');
    console.log('   - VERTEX_AI_LOCATION');
    console.log('   - VERTEX_AI_INDEX_ENDPOINT');
    console.log('   - Service account key file (development) or Cloud Run service account (production)');
    
    // Try a direct test with more detailed error information
    console.log('\n2. Testing direct knowledge base retrieval...');
    try {
      const chunks = await retrieveFromKB("test query", 1);
      console.log(`   Retrieved chunks: ${chunks.length}`);
      if (chunks.length > 0) {
        console.log(`   First chunk preview: ${chunks[0].substring(0, 100)}...`);
      }
    } catch (error: any) {
      console.log(`   ❌ Error: ${error.message}`);
      if (error.response) {
        console.log(`   Status: ${error.response.status}`);
        console.log(`   Status Text: ${error.response.statusText}`);
        console.log(`   Response Data: ${JSON.stringify(error.response.data, null, 2)}`);
      }
    }
  } else {
    console.log('\n✅ Knowledge base is working correctly!');
    
    // Test with a real query
    console.log('\n2. Testing with a real query...');
    const chunks = await retrieveFromKB("privacy policy legal requirements", 3);
    console.log(`   Retrieved ${chunks.length} chunks`);
    chunks.forEach((chunk, index) => {
      console.log(`   Chunk ${index + 1}: ${chunk.substring(0, 150)}...`);
    });
  }
}

// Run the test
testVertexAI().catch(console.error); 