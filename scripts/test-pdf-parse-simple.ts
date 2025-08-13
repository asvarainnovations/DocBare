// Simple test for pdf-parse loading
let pdfParse: any = null;

async function testPdfParseLoading() {
  console.log('🔍 Testing pdf-parse loading...');
  
  try {
    const pdfParseModule = await import('pdf-parse');
    pdfParse = pdfParseModule.default || pdfParseModule;
    console.log('✅ pdf-parse module loaded successfully');
    
    // Test with a more valid minimal PDF
    const testBuffer = Buffer.from(`%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj

2 0 obj
<<
/Type /Pages
/Kids [3 0 R]
/Count 1
>>
endobj

3 0 obj
<<
/Type /Page
/Parent 2 0 R
/MediaBox [0 0 612 792]
/Contents 4 0 R
>>
endobj

4 0 obj
<<
/Length 44
>>
stream
BT
/F1 12 Tf
72 720 Td
(Hello World) Tj
ET
endstream
endobj

xref
0 5
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000204 00000 n 
trailer
<<
/Size 5
/Root 1 0 R
>>
startxref
364
%%EOF`);
    
    const result = await pdfParse(testBuffer);
    console.log('✅ pdf-parse test successful');
    console.log(`📄 Test PDF pages: ${result.numpages}`);
    console.log(`📝 Test PDF text length: ${result.text.length}`);
    console.log(`📋 Extracted text: "${result.text.trim()}"`);
    
    return true;
  } catch (error) {
    console.error('❌ pdf-parse test failed:', error);
    return false;
  }
}

async function main() {
  console.log('🧪 Testing PDF parsing fixes...\n');
  
  const loadingTest = await testPdfParseLoading();
  
  console.log('\n📊 Test Results:');
  console.log(`📦 Module Loading: ${loadingTest ? '✅ PASS' : '❌ FAIL'}`);
  
  if (loadingTest) {
    console.log('\n🎉 Test passed! PDF parsing should work correctly.');
  } else {
    console.log('\n⚠️  Test failed. Check the logs above for details.');
  }
}

main().catch(console.error);
