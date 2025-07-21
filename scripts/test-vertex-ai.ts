// test-vertex-ai.ts
// Run with: npx ts-node test-vertex-ai.ts

import { v1 } from '@google-cloud/aiplatform';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function testVertexAI() {
  try {
    console.log('Testing Vertex AI Vector Search...');

    // 1. Generate a test embedding
    const embeddingResponse = await openai.embeddings.create({
      model: 'text-embedding-3-large',
      input: 'test query',
    });

    const queryEmbedding = embeddingResponse.data[0].embedding;
    console.log('Generated embedding with length:', queryEmbedding.length);

    // 2. Initialize Vertex AI
    // VertexAI is not a constructable class, use the namespace to get the client
    const {v1} = require('@google-cloud/aiplatform');
    console.log('Initializing IndexEndpointServiceClient with project and location...');
    const indexEndpointServiceClient = new v1.IndexEndpointServiceClient({
      projectId: '238908103508',
      apiEndpoint: 'us-central1-aiplatform.googleapis.com',
    });

    
    // 3. Test the vector search
    const request = {
      indexEndpoint: 'projects/238908103508/locations/us-central1/indexEndpoints/1002510512950345728',
      deployedIndexId: 'legal_kb_1753025188283',
      queries: [{
        embedding: {
          value: queryEmbedding,
        },
        neighborCount: 5,
      }],
      returnFullDatapoint: true,
    };

    console.log('Making request to Vertex AI...');
    const [response] = await indexEndpointServiceClient.findNeighbors(request);
    
    console.log('Success! Found neighbors:', response.nearestNeighbors?.[0]?.neighbors?.length || 0);
    console.log('Response structure:', JSON.stringify(response, null, 2));

  } catch (error: any) {
    console.error('Error details:', {
      code: error.code,
      message: error.message,
      details: error.details,
    });

    if (error.code === 3) {
      console.log('\nTroubleshooting suggestions:');
      console.log('1. Check if your index dimensions match the embedding (3072)');
      console.log('2. Verify the deployed index ID is correct');
      console.log('3. Ensure the index is in DEPLOYED state');
      console.log('4. Check service account permissions');
    }
  }
}

testVertexAI();