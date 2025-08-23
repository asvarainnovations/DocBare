#!/usr/bin/env tsx

import { TokenManager } from '../lib/tokenManager';

/**
 * Test script for TokenManager functionality
 * Tests various query types and complexity levels
 */

console.log('🧠 Testing Dynamic Token Management System\n');

// Test cases based on the documentation examples
const testCases = [
  {
    name: 'Simple Legal Question',
    query: 'What is the definition of breach of contract under Indian law?',
    hasDocument: false,
    expectedTokens: 1000
  },
  {
    name: 'Document Analysis Request',
    query: 'Analyze this employment contract and identify potential legal risks, compliance issues, and suggest improvements for Indian labor law compliance',
    hasDocument: true,
    expectedTokens: 6000
  },
  {
    name: 'Complex Multi-Document Analysis',
    query: 'Please draft a comprehensive legal opinion analyzing the merger agreement between Company A and Company B, considering competition law implications, shareholder rights, and regulatory compliance requirements under Indian corporate law',
    hasDocument: true,
    expectedTokens: 12000
  },
  {
    name: 'Simple Definition Request',
    query: 'What is IPC Section 302?',
    hasDocument: false,
    expectedTokens: 1000
  },
  {
    name: 'Document Drafting Request',
    query: 'Draft a non-disclosure agreement for a technology startup in India, including provisions for intellectual property protection, data privacy compliance under PDPB, and termination clauses',
    hasDocument: false,
    expectedTokens: 9000
  },
  {
    name: 'Very Long Query',
    query: 'A'.repeat(2000), // Very long query to test boundary conditions
    hasDocument: false,
    expectedTokens: 12000
  },
  {
    name: 'Empty Query',
    query: '',
    hasDocument: false,
    expectedTokens: 1000
  }
];

// Run tests
let passedTests = 0;
let totalTests = testCases.length;

testCases.forEach((testCase, index) => {
  console.log(`\n📋 Test ${index + 1}: ${testCase.name}`);
  console.log(`Query: "${testCase.query.substring(0, 100)}${testCase.query.length > 100 ? '...' : ''}"`);
  console.log(`Has Document: ${testCase.hasDocument}`);
  
  try {
    // Get complexity analysis
    const analysis = TokenManager.getComplexityAnalysis(testCase.query, testCase.hasDocument);
    
    // Calculate max tokens
    const maxTokens = TokenManager.calculateMaxTokens(testCase.query, testCase.hasDocument);
    
    console.log('\n📊 Complexity Analysis:');
    console.log(`  Query Length: ${analysis.queryLength} characters`);
    console.log(`  Legal Keywords: ${analysis.legalKeywords}`);
    console.log(`  Document Presence: ${analysis.documentPresence}`);
    console.log(`  Query Type: ${analysis.queryType}`);
    console.log(`  Complexity Score: ${analysis.complexityScore}`);
    console.log(`  Max Tokens: ${maxTokens}`);
    
    console.log('\n🔍 Detailed Analysis:');
    console.log(`  Query Length Score: ${analysis.analysis.queryLengthScore.toFixed(2)}`);
    console.log(`  Legal Keywords Score: ${analysis.analysis.legalKeywordsScore.toFixed(2)}`);
    console.log(`  Document Presence Score: ${analysis.analysis.documentPresenceScore.toFixed(2)}`);
    console.log(`  Query Type Score: ${analysis.analysis.queryTypeScore.toFixed(2)}`);
    
    // Check if result is within expected range (allow some flexibility)
    const isCorrect = Math.abs(maxTokens - testCase.expectedTokens) <= 1000;
    
    if (isCorrect) {
      console.log('\n✅ PASSED');
      passedTests++;
    } else {
      console.log(`\n❌ FAILED - Expected ~${testCase.expectedTokens}, Got ${maxTokens}`);
    }
    
  } catch (error) {
    console.log(`\n❌ ERROR: ${error}`);
  }
});

// Summary
console.log('\n' + '='.repeat(60));
console.log(`📈 Test Results: ${passedTests}/${totalTests} tests passed`);
console.log(`Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);

if (passedTests === totalTests) {
  console.log('\n🎉 All tests passed! TokenManager is working correctly.');
} else {
  console.log('\n⚠️  Some tests failed. Please review the implementation.');
}

// Additional performance test
console.log('\n🚀 Performance Test:');
const startTime = Date.now();
for (let i = 0; i < 1000; i++) {
  TokenManager.calculateMaxTokens('Test query for performance', false);
}
const endTime = Date.now();
console.log(`1000 calculations completed in ${endTime - startTime}ms`);
console.log(`Average time per calculation: ${((endTime - startTime) / 1000).toFixed(2)}ms`);

console.log('\n✨ TokenManager testing completed!');
