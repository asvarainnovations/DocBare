require('dotenv').config();

console.log('🧪 Testing Chat Auto-Response Logic...\n');

// Test cases for auto-response logic
function testAutoResponseLogic() {
  console.log('📋 Test Cases for Auto-Response Logic:\n');

  // Test Case 1: New chat (should auto-generate)
  console.log('✅ Test Case 1: New Chat (should auto-generate)');
  const newChat = {
    sessionAge: 30000, // 30 seconds old
    messageAge: 25000, // 25 seconds old
    userMessages: 1,
    aiMessages: 0,
    loadingMessages: false,
    loadingMeta: false,
    autoResponseGenerated: false
  };
  
  const shouldGenerate1 = shouldGenerateAutoResponse(newChat);
  console.log(`   Expected: true, Got: ${shouldGenerate1}`);
  console.log('');

  // Test Case 2: Existing chat (should NOT auto-generate)
  console.log('❌ Test Case 2: Existing Chat (should NOT auto-generate)');
  const existingChat = {
    sessionAge: 86400000, // 24 hours old
    messageAge: 86400000, // 24 hours old
    userMessages: 1,
    aiMessages: 0,
    loadingMessages: false,
    loadingMeta: false,
    autoResponseGenerated: false
  };
  
  const shouldGenerate2 = shouldGenerateAutoResponse(existingChat);
  console.log(`   Expected: false, Got: ${shouldGenerate2}`);
  console.log('');

  // Test Case 3: Chat with AI messages (should NOT auto-generate)
  console.log('❌ Test Case 3: Chat with AI Messages (should NOT auto-generate)');
  const chatWithAI = {
    sessionAge: 30000,
    messageAge: 25000,
    userMessages: 1,
    aiMessages: 1,
    loadingMessages: false,
    loadingMeta: false,
    autoResponseGenerated: false
  };
  
  const shouldGenerate3 = shouldGenerateAutoResponse(chatWithAI);
  console.log(`   Expected: false, Got: ${shouldGenerate3}`);
  console.log('');

  // Test Case 4: Still loading (should NOT auto-generate)
  console.log('❌ Test Case 4: Still Loading (should NOT auto-generate)');
  const loadingChat = {
    sessionAge: 30000,
    messageAge: 25000,
    userMessages: 1,
    aiMessages: 0,
    loadingMessages: true,
    loadingMeta: false,
    autoResponseGenerated: false
  };
  
  const shouldGenerate4 = shouldGenerateAutoResponse(loadingChat);
  console.log(`   Expected: false, Got: ${shouldGenerate4}`);
  console.log('');

  // Test Case 5: Already generated response (should NOT auto-generate)
  console.log('❌ Test Case 5: Already Generated (should NOT auto-generate)');
  const alreadyGenerated = {
    sessionAge: 30000,
    messageAge: 25000,
    userMessages: 1,
    aiMessages: 0,
    loadingMessages: false,
    loadingMeta: false,
    autoResponseGenerated: true
  };
  
  const shouldGenerate5 = shouldGenerateAutoResponse(alreadyGenerated);
  console.log(`   Expected: false, Got: ${shouldGenerate5}`);
  console.log('');
}

function shouldGenerateAutoResponse(chat) {
  // Don't proceed if we're still loading or if we've already generated a response
  if (chat.loadingMessages || chat.loadingMeta || chat.autoResponseGenerated) {
    return false;
  }
  
  // Safety check: if we already have AI messages, don't generate more
  if (chat.aiMessages > 0) {
    return false;
  }
  
  // Only generate auto-response if:
  // 1. There's exactly one user message
  // 2. No AI messages exist
  // 3. This appears to be a new chat
  if (chat.userMessages === 1 && chat.aiMessages === 0) {
    // Check if this is a new chat by looking at session age
    const isNewSession = chat.sessionAge < 120000; // Within the last 2 minutes
    
    // Also check message age as a backup
    const isRecentMessage = chat.messageAge < 120000; // Within the last 2 minutes
    
    return isNewSession && isRecentMessage;
  }
  
  return false;
}

testAutoResponseLogic();

console.log('🎯 Summary:');
console.log('• New chats (created within 2 minutes) should auto-generate AI responses');
console.log('• Existing chats (older than 2 minutes) should NOT auto-generate');
console.log('• Chats with existing AI messages should NOT auto-generate');
console.log('• Loading states should prevent auto-generation');
console.log('• Already generated responses should not trigger again'); 