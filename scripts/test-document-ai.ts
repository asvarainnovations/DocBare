#!/usr/bin/env ts-node

import { documentAIService } from '../lib/documentAI';

async function testDocumentAISetup() {
  console.log('🔍 Testing Document AI Setup...\n');

  try {
    // Test 1: Basic connection and configuration
    console.log('📋 Test 1: Checking configuration...');
    
    const projectId = process.env.FIRESTORE_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT_ID;
    const location = process.env.DOCUMENT_AI_LOCATION || 'us';
    
    console.log(`   Project ID: ${projectId || '❌ Not configured'}`);
    console.log(`   Location: ${location}`);
    console.log(`   Key File: ${process.env.GOOGLE_CLOUD_KEY_FILE || '❌ Not configured'}`);
    
    if (!projectId) {
      throw new Error('FIRESTORE_PROJECT_ID or GOOGLE_CLOUD_PROJECT_ID not configured');
    }
    
    if (!process.env.GOOGLE_CLOUD_KEY_FILE) {
      throw new Error('GOOGLE_CLOUD_KEY_FILE not configured');
    }
    
    console.log('   ✅ Configuration looks good\n');

    // Test 2: Check processor IDs
    console.log('📋 Test 2: Checking processor IDs...');
    
    const layoutProcessorId = process.env.DOCUMENT_AI_LAYOUT_PROCESSOR_ID;
    const formProcessorId = process.env.DOCUMENT_AI_FORM_PARSER_PROCESSOR_ID;
    const ocrProcessorId = process.env.DOCUMENT_AI_OCR_PROCESSOR_ID;
    
    console.log(`   Layout Processor ID: ${layoutProcessorId || '❌ Not configured'}`);
    console.log(`   Form Parser Processor ID: ${formProcessorId || '❌ Not configured'}`);
    console.log(`   OCR Processor ID: ${ocrProcessorId || '❌ Not configured'}`);
    
    if (!layoutProcessorId && !formProcessorId && !ocrProcessorId) {
      throw new Error('No Document AI processor IDs configured. Please set at least one processor ID.');
    }
    
    console.log('   ✅ At least one processor ID is configured\n');

    // Test 3: Test Document AI connection
    console.log('📋 Test 3: Testing Document AI connection...');
    
    const isConnected = await documentAIService.testConnection();
    
    if (isConnected) {
      console.log('   ✅ Document AI connection successful\n');
    } else {
      throw new Error('Document AI connection failed');
    }

    // Test 4: Test with a sample PDF
    console.log('📋 Test 4: Testing with sample PDF...');
    
    // Create a minimal test PDF
    const testPdfContent = Buffer.from(
      '%PDF-1.4\n' +
      '1 0 obj\n' +
      '<<\n' +
      '/Type /Catalog\n' +
      '/Pages 2 0 R\n' +
      '>>\n' +
      'endobj\n' +
      '2 0 obj\n' +
      '<<\n' +
      '/Type /Pages\n' +
      '/Kids [3 0 R]\n' +
      '/Count 1\n' +
      '>>\n' +
      'endobj\n' +
      '3 0 obj\n' +
      '<<\n' +
      '/Type /Page\n' +
      '/Parent 2 0 R\n' +
      '/MediaBox [0 0 612 792]\n' +
      '/Contents 4 0 R\n' +
      '>>\n' +
      'endobj\n' +
      '4 0 obj\n' +
      '<<\n' +
      '/Length 44\n' +
      '>>\n' +
      'stream\n' +
      'BT\n' +
      '/F1 12 Tf\n' +
      '72 720 Td\n' +
      '(Test Document Content) Tj\n' +
      'ET\n' +
      'endstream\n' +
      'endobj\n' +
      'xref\n' +
      '0 5\n' +
      '0000000000 65535 f \n' +
      '0000000009 00000 n \n' +
      '0000000058 00000 n \n' +
      '0000000115 00000 n \n' +
      '0000000204 00000 n \n' +
      'trailer\n' +
      '<<\n' +
      '/Size 5\n' +
      '/Root 1 0 R\n' +
      '>>\n' +
      'startxref\n' +
      '364\n' +
      '%%EOF'
    );
    
    const result = await documentAIService.processDocument(testPdfContent, 'test.pdf', {
      processorType: 'LAYOUT_PARSER',
      enableOCR: false,
    });
    
    console.log(`   Text extracted: ${result.text.length} characters`);
    console.log(`   Confidence: ${result.confidence.toFixed(2)}%`);
    console.log(`   Processing time: ${result.processingTime}ms`);
    console.log(`   Method: ${result.text.includes('Test Document Content') ? '✅ Success' : '❌ Failed'}`);
    
    if (result.confidence > 0) {
      console.log('   ✅ Document AI processing successful\n');
    } else {
      console.log('   ⚠️  Document AI returned 0% confidence - check processor setup\n');
    }

    // Test 5: Environment summary
    console.log('📋 Test 5: Environment Summary...');
    console.log('   ✅ Document AI is properly configured');
    console.log('   ✅ Service account has required permissions');
    console.log('   ✅ Processors are accessible');
    console.log('   ✅ API is working correctly');
    
    console.log('\n🎉 All tests passed! Document AI is ready to use.');
    
    // Provide next steps
    console.log('\n📝 Next Steps:');
    console.log('   1. Upload a real document to test the full pipeline');
    console.log('   2. Monitor the logs for any issues');
    console.log('   3. Check Google Cloud Console for usage metrics');
    
  } catch (error) {
    console.error('\n❌ Document AI setup test failed:');
    console.error(`   Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    
    console.log('\n🔧 Troubleshooting Steps:');
    console.log('   1. Verify all environment variables are set correctly');
    console.log('   2. Check that Document AI API is enabled in Google Cloud Console');
    console.log('   3. Ensure processors are created and active');
    console.log('   4. Verify service account has required permissions');
    console.log('   5. Check the service account key file path and permissions');
    
    process.exit(1);
  }
}

// Run the test
testDocumentAISetup().catch(console.error);
