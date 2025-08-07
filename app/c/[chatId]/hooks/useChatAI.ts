import { useState, useCallback, useRef, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';

interface Message {
  id: string;
  sessionId: string;
  userId: string;
  role: 'USER' | 'ASSISTANT';
  content: string;
  createdAt: Date;
}

export function useChatAI(chatId: string, userId?: string) {
  const [loadingAI, setLoadingAI] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const autoResponseGeneratedRef = useRef(false);

  // Generate AI response with proper streaming display
  const generateAIResponse = useCallback(async (message: string, addMessage: (message: Message) => void, updateMessage: (messageId: string, updates: Partial<Message>) => void, removeMessage: (messageId: string) => void) => {
    console.info('🟦 [chat_ui][INFO] generateAIResponse called with message:', message.substring(0, 100));
    
    if (!userId) {
      console.error('🟥 [chat_ui][ERROR] No user ID');
      return;
    }

    setLoadingAI(true);
    let aiMessage: Message | null = null;

    try {
      const requestBody = {
        query: message.trim(),
        sessionId: chatId,
        userId: userId,
      };
      
      const response = await fetch('/api/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('🟥 [chat_ui][ERROR] Auto-response API error:', errorText);
        return;
      }

      const reader = response.body?.getReader();
      if (!reader) {
        console.error('🟥 [chat_ui][ERROR] No response body reader for auto-response');
        return;
      }

      let aiResponse = '';
      aiMessage = {
        id: `ai-auto-${Date.now()}`,
        sessionId: chatId,
        userId: userId,
        role: 'ASSISTANT',
        content: '',
        createdAt: new Date()
      };

      // Add the AI message immediately to show "AI is thinking..." state
      addMessage(aiMessage);

      const decoder = new TextDecoder();
      let closed = false;
      let hasStartedStreaming = false;

      while (!closed) {
        const { done, value } = await reader.read();
        if (done) {
          closed = true;
          break;
        }

        const chunk = decoder.decode(value);
        
        // Parse the streaming response to extract only the text content
        const lines = chunk.split('\n');
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const jsonStr = line.slice(6); // Remove 'data: ' prefix
              if (jsonStr.trim() === '[DONE]') continue;
              
              const jsonData = JSON.parse(jsonStr);
              if (jsonData.choices && jsonData.choices[0] && jsonData.choices[0].delta && jsonData.choices[0].delta.content) {
                const content = jsonData.choices[0].delta.content;
                aiResponse += content;
                hasStartedStreaming = true;
                // Update the message with streaming content
                updateMessage(aiMessage.id, { content: aiResponse });
              }
            } catch (parseError) {
              // Skip invalid JSON lines
              console.warn('🟨 [chat_ui][WARN] Failed to parse streaming chunk:', parseError);
            }
          }
        }
      }

      reader.releaseLock();

      // Save the AI message to the database
      if (aiResponse.trim()) {
        try {
          await axios.post('/api/chat', {
            sessionId: chatId,
            userId: userId,
            role: 'ASSISTANT',
            content: aiResponse.trim()
          });
          console.info('🟩 [chat_ui][SUCCESS] Auto AI message saved to database');
        } catch (saveError) {
          console.error('🟥 [chat_ui][ERROR] Failed to save auto AI message:', saveError);
          // Don't fail the entire request if saving fails
        }
      }
    } catch (error: any) {
      console.error('🟥 [chat_ui][ERROR] Failed to generate auto AI response:', error.message);
      
      // Remove the AI message if it was added
      if (aiMessage) {
        removeMessage(aiMessage.id);
      }
    } finally {
      setLoadingAI(false);
    }
  }, [chatId, userId]);

  // Handle sending messages
  const handleSend = useCallback(async (message: string, addMessage: (message: Message) => void, updateMessage: (messageId: string, updates: Partial<Message>) => void, removeMessage: (messageId: string) => void) => {
    if (!userId) {
      console.error('🟥 [chat_ui][ERROR] No user ID');
      toast.error('Please log in to send messages');
      return;
    }

    if (!message.trim()) {
      return;
    }

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      sessionId: chatId,
      userId: userId,
      role: 'USER',
      content: message.trim(),
      createdAt: new Date()
    };

    addMessage(userMessage);
    setLoadingAI(true);
    setSendError(null);

    let aiMessage: Message | null = null;

    try {
      const requestBody = {
        query: message.trim(),
        sessionId: chatId,
        userId: userId,
      };
      
      // Send message to API
      const response = await fetch('/api/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('🟥 [chat_ui][ERROR] API error response:', errorText);
        throw new Error(`HTTP error! status: ${response.status}, body: ${errorText}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body');
      }

      let aiResponse = '';
      aiMessage = {
        id: `ai-${Date.now()}`,
        sessionId: chatId,
        userId: userId,
        role: 'ASSISTANT',
        content: '',
        createdAt: new Date()
      };

      addMessage(aiMessage);

      const decoder = new TextDecoder();
      let closed = false;

      while (!closed) {
        const { done, value } = await reader.read();
        if (done) {
          closed = true;
          break;
        }

        const chunk = decoder.decode(value);
        // The API returns plain text content directly
        aiResponse += chunk;
        updateMessage(aiMessage.id, { content: aiResponse });
      }

      reader.releaseLock();

      // Save the AI message to the database
      if (aiResponse.trim()) {
        try {
          await axios.post('/api/chat', {
            sessionId: chatId,
            userId: userId,
            role: 'ASSISTANT',
            content: aiResponse.trim()
          });
          console.info('🟩 [chat_ui][SUCCESS] AI message saved to database');
        } catch (saveError) {
          console.error('🟥 [chat_ui][ERROR] Failed to save AI message:', saveError);
          // Don't fail the entire request if saving fails
        }
      }
    } catch (error: any) {
      console.error('🟥 [chat_ui][ERROR] Failed to send message:', error.message);
      const errorMessage = error.message || 'Failed to send message';
      setSendError(errorMessage);
      toast.error(errorMessage);
      
      // Remove the AI message if it was added
      if (aiMessage) {
        removeMessage(aiMessage.id);
      }
    } finally {
      setLoadingAI(false);
    }
  }, [chatId, userId]);

  // Auto-generate AI response for first message if it's a new chat
  const checkAndGenerateAutoResponse = useCallback(async (
    messages: Message[], 
    sessionMeta: any, 
    loadingMessages: boolean, 
    loadingMeta: boolean,
    addMessage: (message: Message) => void, 
    updateMessage: (messageId: string, updates: Partial<Message>) => void, 
    removeMessage: (messageId: string) => void
  ) => {
    console.info('🟦 [chat_ui][INFO] checkAndGenerateAutoResponse called with:', {
      chatId,
      userId,
      messagesCount: messages.length,
      sessionMeta: sessionMeta ? 'exists' : 'null',
      loadingMessages,
      loadingMeta,
      autoResponseGenerated: autoResponseGeneratedRef.current
    });
    
    // Don't proceed if we're still loading or if we've already generated a response
    if (!chatId || !userId || loadingMessages || loadingMeta || autoResponseGeneratedRef.current) {
      console.info('🟦 [chat_ui][INFO] Auto-response check skipped:', {
        hasChatId: !!chatId,
        hasUserId: !!userId,
        loadingMessages,
        loadingMeta,
        autoResponseGenerated: autoResponseGeneratedRef.current
      });
      return;
    }
    
    // Wait for both messages and metadata to be fully loaded
    if (loadingMessages || loadingMeta) {
      console.info('🟦 [chat_ui][INFO] Waiting for data to load:', { loadingMessages, loadingMeta });
      return;
    }
    
    // Check if this is a new chat with only one user message
    const userMessages = messages.filter(msg => msg.role === 'USER');
    const aiMessages = messages.filter(msg => msg.role === 'ASSISTANT');
    
    console.info('🟦 [chat_ui][INFO] Auto-response check:', {
      userMessages: userMessages.length,
      aiMessages: aiMessages.length,
      totalMessages: messages.length,
      messages: messages.map(m => ({ id: m.id, role: m.role, content: m.content.substring(0, 50) }))
    });
    
    // Safety check: if we already have AI messages, don't generate more
    if (aiMessages.length > 0) {
      autoResponseGeneratedRef.current = true;
      console.info('🟦 [chat_ui][INFO] AI messages already exist, skipping auto-response');
      return;
    }
    
    // Only generate auto-response if:
    // 1. There's exactly one user message
    // 2. No AI messages exist
    // 3. This appears to be a new chat (not an existing one being loaded)
    if (userMessages.length === 1 && aiMessages.length === 0) {
      const firstUserMessage = userMessages[0];
      
      // Check if this is a new chat by looking at session metadata
      const sessionAge = sessionMeta?.createdAt ? Date.now() - new Date(sessionMeta.createdAt).getTime() : 0;
      const isNewSession = sessionAge < 300000; // Within the last 5 minutes (increased from 2 minutes)
      
      // Also check message age as a backup
      const messageAge = Date.now() - new Date(firstUserMessage.createdAt).getTime();
      const isRecentMessage = messageAge < 300000; // Within the last 5 minutes (increased from 2 minutes)
      
      console.info('🟦 [chat_ui][INFO] Auto-response decision:', {
        sessionAge: Math.round(sessionAge / 1000) + 's',
        messageAge: Math.round(messageAge / 1000) + 's',
        isNewSession,
        isRecentMessage,
        shouldGenerate: isNewSession && isRecentMessage,
        firstUserMessageContent: firstUserMessage.content.substring(0, 50)
      });
      
      if (isNewSession && isRecentMessage) {
        autoResponseGeneratedRef.current = true; // Prevent multiple auto-responses
        console.info('🟦 [chat_ui][INFO] Auto-generating AI response for new chat');
        await generateAIResponse(firstUserMessage.content, addMessage, updateMessage, removeMessage);
      } else {
        // This is an existing chat - don't auto-generate
        autoResponseGeneratedRef.current = true;
        console.info('🟦 [chat_ui][INFO] Existing chat detected, skipping auto-response');
      }
    }
  }, [chatId, userId, generateAIResponse]);

  // Reset auto-response flag when chat ID changes
  useEffect(() => {
    autoResponseGeneratedRef.current = false;
  }, [chatId]);

  return {
    loadingAI,
    sendError,
    handleSend,
    generateAIResponse,
    checkAndGenerateAutoResponse
  };
} 