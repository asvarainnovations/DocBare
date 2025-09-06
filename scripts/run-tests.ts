#!/usr/bin/env tsx

/**
 * Test Runner Script
 * Runs all available tests for the DocBare application
 */

import { testDocumentAI } from './test-document-ai';

async function runAllTests() {
  console.log('🧪 DocBare Test Suite');
  console.log('====================\n');

  const tests = [
    {
      name: 'Document AI Tests',
      fn: testDocumentAI,
    },
  ];

  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    console.log(`\n📋 Running ${test.name}...`);
    console.log('─'.repeat(50));
    
    try {
      await test.fn();
      console.log(`✅ ${test.name} PASSED`);
      passed++;
    } catch (error: any) {
      console.log(`❌ ${test.name} FAILED: ${error.message}`);
      failed++;
    }
  }

  console.log('\n📊 Test Results Summary');
  console.log('=======================');
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📈 Total: ${passed + failed}`);

  if (failed === 0) {
    console.log('\n🎉 All tests passed! System is ready for production.');
    process.exit(0);
  } else {
    console.log('\n⚠️  Some tests failed. Please review the issues above.');
    process.exit(1);
  }
}

// Run all tests
runAllTests().catch((error) => {
  console.error('Test runner failed:', error);
  process.exit(1);
});
