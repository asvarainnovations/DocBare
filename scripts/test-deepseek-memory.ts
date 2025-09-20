#!/usr/bin/env tsx

/**
 * Minimal reproducible test for DeepSeek memory functionality
 * Based on expert recommendations to test if DeepSeek uses conversation history correctly
 */

import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function testDeepSeekMemory() {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  
  if (!apiKey) {
    console.error('❌ DEEPSEEK_API_KEY not found in environment variables');
    process.exit(1);
  }

  console.log('🧪 Testing DeepSeek memory functionality...\n');

  // Test 1: Simple name memory test
  console.log('📝 Test 1: Simple name memory test');
  const test1Payload = {
    model: "deepseek/deepseek-chat-v3.1",
    messages: [
      {
        role: "system",
        content: "You are a helpful assistant. Always use conversation history when answering follow-up questions."
      },
      {
        role: "user", 
        content: "My name is Rajat."
      },
      {
        role: "user",
        content: "What's my name?"
      }
    ],
    max_tokens: 60,
    temperature: 0.1
  };

  try {
    const response1 = await fetch("https://api.deepseek.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(test1Payload)
    });

    if (!response1.ok) {
      const errorData = await response1.json();
      console.error('❌ Test 1 failed:', errorData);
      return;
    }

    const result1 = await response1.json();
    console.log('✅ Test 1 Response:', result1.choices[0].message.content);
    console.log('📊 Usage:', result1.usage);
    console.log('');

  } catch (error) {
    console.error('❌ Test 1 error:', error);
  }

  // Test 2: Legal context memory test
  console.log('📝 Test 2: Legal context memory test');
  const test2Payload = {
    model: "deepseek/deepseek-chat-v3.1", 
    messages: [
      {
        role: "system",
        content: "You are DocBare, a legal AI assistant. Always use conversation history when answering follow-up questions. Treat facts stated by the user in earlier messages as ground-truth."
      },
      {
        role: "user",
        content: "I need help with a divorce case. My name is Rajat and I'm filing against my spouse for mental cruelty."
      },
      {
        role: "assistant", 
        content: "I understand you're filing for divorce on grounds of mental cruelty. Under Section 13(1)(ia) of the Hindu Marriage Act, 1955, mental cruelty is a valid ground for divorce. What specific instances of mental cruelty would you like to include in your petition?"
      },
      {
        role: "user",
        content: "What's my name and what case am I working on?"
      }
    ],
    max_tokens: 100,
    temperature: 0.1
  };

  try {
    const response2 = await fetch("https://api.deepseek.com/v1/chat/completions", {
      method: "POST", 
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(test2Payload)
    });

    if (!response2.ok) {
      const errorData = await response2.json();
      console.error('❌ Test 2 failed:', errorData);
      return;
    }

    const result2 = await response2.json();
    console.log('✅ Test 2 Response:', result2.choices[0].message.content);
    console.log('📊 Usage:', result2.usage);
    console.log('');

  } catch (error) {
    console.error('❌ Test 2 error:', error);
  }

  // Test 3: Test with deepseek-reasoner model (current model)
  console.log('📝 Test 3: Using deepseek-reasoner model (current)');
  const test3Payload = {
    model: "deepseek-reasoner",
    messages: [
      {
        role: "system",
        content: "You are DocBare, a legal AI assistant. Always use conversation history when answering follow-up questions. Treat facts stated by the user in earlier messages as ground-truth."
      },
      {
        role: "user",
        content: "My name is Rajat."
      },
      {
        role: "user", 
        content: "What's my name?"
      }
    ],
    max_tokens: 60,
    temperature: 0.1
  };

  try {
    const response3 = await fetch("https://api.deepseek.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(test3Payload)
    });

    if (!response3.ok) {
      const errorData = await response3.json();
      console.error('❌ Test 3 failed:', errorData);
      return;
    }

    const result3 = await response3.json();
    console.log('✅ Test 3 Response:', result3.choices[0].message.content);
    console.log('📊 Usage:', result3.usage);
    console.log('');

  } catch (error) {
    console.error('❌ Test 3 error:', error);
  }

  console.log('🎯 Test Summary:');
  console.log('- If Test 1 & 3 show "Your name is Rajat" → DeepSeek memory works correctly');
  console.log('- If Test 2 shows name and case details → Legal context memory works');
  console.log('- If any test fails → Issue is with our payload construction, not DeepSeek');
}

// Run the test
testDeepSeekMemory().catch(console.error);
