import { useState, useCallback, useRef, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';

interface Message {
  id: string;
  sessionId: string;
  userId: string;
  role: 'USER' | 'ASSISTANT';
  content: string;
  reasoningContent?: string; // Add reasoning content for AI messages
  createdAt: Date;
  documents?: Array<{ documentId: string; fileName: string; firestoreId?: string }>; // Add documents to message
}

interface ThinkingState {
  isThinking: boolean;
  content: string;
}

// Generate unique message ID
const generateUniqueId = (prefix: string) => {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

export function useChatAI(chatId: string, userId?: string) {
  const [loadingAI, setLoadingAI] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [thinkingStates, setThinkingStates] = useState<{ [messageId: string]: ThinkingState }>({});
  const autoResponseGeneratedRef = useRef(false);

  // Cleanup thinking states for old messages (keep only last 5 messages)
  const cleanupThinkingStates = useCallback(() => {
    setThinkingStates(prev => {
      const messageIds = Object.keys(prev);
      if (messageIds.length <= 5) return prev;
      
      // Keep only the 5 most recent thinking states
      const sortedIds = messageIds.sort((a, b) => {
        const aTime = parseInt(a.split('-')[1]);
        const bTime = parseInt(b.split('-')[1]);
        return bTime - aTime; // Most recent first
      });
      
      const idsToKeep = sortedIds.slice(0, 5);
      const cleanedStates: { [messageId: string]: ThinkingState } = {};
      
      idsToKeep.forEach(id => {
        if (prev[id]) {
          cleanedStates[id] = prev[id];
        }
      });
      
      return cleanedStates;
    });
  }, []);

  // Generate AI response with proper streaming display
  const generateAIResponse = useCallback(async (message: string, addMessage: (message: Message) => void, updateMessage: (messageId: string, updates: Partial<Message>) => void, removeMessage: (messageId: string) => void) => {
    if (!userId) {
      console.error('🟥 [chat_ui][ERROR] No user ID');
      return;
    }

    setLoadingAI(true);
    let aiMessage: Message | null = null;

    try {
      // Cleanup old thinking states before starting new response
      cleanupThinkingStates();

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
        id: generateUniqueId('ai-auto'),
        sessionId: chatId,
        userId: userId,
        role: 'ASSISTANT',
        content: '',
        createdAt: new Date()
      };

      // Add the AI message immediately to show "AI is thinking..." state
      addMessage(aiMessage);

      // Initialize thinking state for this message with empty content
      setThinkingStates(prev => ({
        ...prev,
        [aiMessage!.id]: { isThinking: true, content: '' }
      }));

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
        
        // Handle thinking and final response separation
        if (chunk.startsWith('THINKING:')) {
          const thinkingData = chunk.replace('THINKING:', '');
          setThinkingStates(prev => ({
            ...prev,
            [aiMessage!.id]: {
              ...prev[aiMessage!.id],
              content: (prev[aiMessage!.id]?.content || '') + thinkingData
            }
          }));
        } else if (chunk.startsWith('FINAL:')) {
          setThinkingStates(prev => ({
            ...prev,
            [aiMessage!.id]: { ...prev[aiMessage!.id], isThinking: false }
          }));
          const finalData = chunk.replace('FINAL:', '');
          aiResponse += finalData;
          hasStartedStreaming = true;
          updateMessage(aiMessage!.id, { content: aiResponse });
        } else {
          // Handle any remaining plain text content (fallback for multi-agent mode)
          if (chunk.trim()) {
            aiResponse += chunk;
            hasStartedStreaming = true;
            updateMessage(aiMessage!.id, { content: aiResponse });
          }
        }
      }

      reader.releaseLock();
      if (aiMessage) {
        setThinkingStates(prev => ({
          ...prev,
          [aiMessage!.id]: { ...prev[aiMessage!.id], isThinking: false }
        }));
      }

      // Save the AI message to the database
      if (aiResponse.trim()) {
        try {
          // Get the reasoning content for this message
          const reasoningContent = thinkingStates[aiMessage!.id]?.content || '';
          
          await axios.post('/api/chat', {
            sessionId: chatId,
            userId: userId,
            role: 'ASSISTANT',
            content: aiResponse.trim(),
            reasoningContent: reasoningContent.trim() || null
          });
          if (process.env.NODE_ENV === 'development') {
            console.info('🟩 [chat_ui][SUCCESS] AI message saved to database with reasoning content');
          }
        } catch (saveError) {
          console.error('🟥 [chat_ui][ERROR] Failed to save auto AI message:', saveError);
          // Don't fail the entire request if saving fails
        }
      }
    } catch (error: any) {
      console.error('🟥 [chat_ui][ERROR] Failed to generate auto AI response:', error.message);
      if (aiMessage) {
        setThinkingStates(prev => ({
          ...prev,
          [aiMessage!.id]: { ...prev[aiMessage!.id], isThinking: false }
        }));
        removeMessage(aiMessage!.id);
      }
    } finally {
      setLoadingAI(false);
    }
  }, [chatId, userId, cleanupThinkingStates]);

  // Handle sending messages
  const handleSend = useCallback(async (
    message: string, 
    addMessage: (message: Message) => void, 
    updateMessage: (messageId: string, updates: Partial<Message>) => void, 
    removeMessage: (messageId: string) => void,
    documents?: Array<{ documentId: string; fileName: string; firestoreId?: string }>,
    sessionMetadata?: any
  ) => {
    if (!userId) {
      console.error('🟥 [chat_ui][ERROR] No user ID');
      toast.error('Please log in to send messages');
      return;
    }

    if (!message.trim()) {
      return;
    }

    // Combine documents from uploaded files and session context
    const allDocuments = [
      ...(documents || []),
      ...(sessionMetadata?.documentContext || [])
    ];

    console.log('🟦 [chat_ui][DEBUG] Document information for user message:', {
      uploadedDocuments: documents || [],
      sessionDocumentContext: sessionMetadata?.documentContext || [],
      combinedDocuments: allDocuments,
      sessionId: chatId
    });

    const userMessage: Message = {
      id: generateUniqueId('user'),
      sessionId: chatId,
      userId: userId,
      role: 'USER',
      content: message.trim(),
      documents: allDocuments,
      createdAt: new Date(Date.now() - 1000) // Ensure user message is 1 second earlier
    };

    addMessage(userMessage);
    
    // Save user message to database
    try {
      await axios.post('/api/chat', {
        sessionId: chatId,
        userId: userId,
        role: 'USER',
        content: message.trim(),
        documents: allDocuments
      });
      console.info('🟩 [chat_ui][SUCCESS] User message saved to database');
    } catch (saveError) {
      console.error('🟥 [chat_ui][ERROR] Failed to save user message:', saveError);
      // Don't fail the entire request if saving fails
    }
    
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
        console.error('🟥 [chat_ui][ERROR] API error:', errorText);
        const errorMessage = errorText || 'Failed to send message';
        setSendError(errorMessage);
        toast.error(errorMessage);
        return;
      }

      const reader = response.body?.getReader();
      if (!reader) {
        console.error('🟥 [chat_ui][ERROR] No response body reader');
        return;
      }

      let aiResponse = '';
      aiMessage = {
        id: generateUniqueId('ai'),
        sessionId: chatId,
        userId: userId,
        role: 'ASSISTANT',
        content: '',
        createdAt: new Date() // AI message gets current timestamp
      };

      // Add the AI message immediately
      addMessage(aiMessage);

      // Initialize thinking state for this message
      setThinkingStates(prev => ({
        ...prev,
        [aiMessage!.id]: { isThinking: true, content: '' }
      }));

      const decoder = new TextDecoder();
      let closed = false;

      while (!closed) {
        const { done, value } = await reader.read();
        if (done) {
          closed = true;
          break;
        }

        const chunk = decoder.decode(value);
        
        // Handle thinking and final response separation
        if (chunk.startsWith('THINKING:')) {
          const thinkingData = chunk.replace('THINKING:', '');
          setThinkingStates(prev => ({
            ...prev,
            [aiMessage!.id]: {
              ...prev[aiMessage!.id],
              content: (prev[aiMessage!.id]?.content || '') + thinkingData
            }
          }));
        } else if (chunk.startsWith('FINAL:')) {
          setThinkingStates(prev => ({
            ...prev,
            [aiMessage!.id]: { ...prev[aiMessage!.id], isThinking: false }
          }));
          const finalData = chunk.replace('FINAL:', '');
          aiResponse += finalData;
          updateMessage(aiMessage!.id, { content: aiResponse });
        } else {
          // Handle any remaining plain text content (fallback for multi-agent mode)
          if (chunk.trim()) {
            aiResponse += chunk;
            updateMessage(aiMessage!.id, { content: aiResponse });
          }
        }
      }

      reader.releaseLock();
      if (aiMessage) {
        setThinkingStates(prev => ({
          ...prev,
          [aiMessage!.id]: { ...prev[aiMessage!.id], isThinking: false }
        }));
      }

      // Save the AI message to the database
      if (aiResponse.trim()) {
        try {
          // Get the reasoning content for this message
          const reasoningContent = thinkingStates[aiMessage!.id]?.content || '';
          
          await axios.post('/api/chat', {
            sessionId: chatId,
            userId: userId,
            role: 'ASSISTANT',
            content: aiResponse.trim(),
            reasoningContent: reasoningContent.trim() || null
          });
          console.info('🟩 [chat_ui][SUCCESS] AI message saved to database with reasoning content');
        } catch (saveError) {
          console.error('🟥 [chat_ui][ERROR] Failed to save AI message:', saveError);
          // Don't fail the entire request if saving fails
        }
      }
    } catch (error: any) {
      console.error('🟥 [chat_ui][ERROR] Failed to send message:', error.message);
      if (aiMessage) {
        setThinkingStates(prev => ({
          ...prev,
          [aiMessage!.id]: { ...prev[aiMessage!.id], isThinking: false }
        }));
        removeMessage(aiMessage!.id);
      }
      const errorMessage = error.message || 'Failed to send message';
      setSendError(errorMessage);
      toast.error(errorMessage);
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
    // Don't proceed if we're still loading or if we've already generated a response
    if (!chatId || !userId || loadingMessages || loadingMeta || autoResponseGeneratedRef.current) {
      return;
    }
    
    // Wait for both messages and metadata to be fully loaded
    if (loadingMessages || loadingMeta) {
      return;
    }
    
    // Check if this is a new chat with only one user message
    const userMessages = messages.filter(msg => msg.role === 'USER');
    const aiMessages = messages.filter(msg => msg.role === 'ASSISTANT');
    
    // Safety check: if we already have AI messages, don't generate more
    if (aiMessages.length > 0) {
      autoResponseGeneratedRef.current = true;
      return;
    }
    
    // Only generate auto-response if:
    // 1. There's exactly one user message
    // 2. No AI messages exist
    if (userMessages.length === 1 && aiMessages.length === 0) {
      const firstUserMessage = userMessages[0];
      
      // Generate AI response for the first user message
      autoResponseGeneratedRef.current = true; // Prevent multiple auto-responses
      if (process.env.NODE_ENV === 'development') {
        console.info('🟦 [chat_ui][INFO] Auto-generating AI response for new chat');
      }
      await generateAIResponse(firstUserMessage.content, addMessage, updateMessage, removeMessage);
    }
  }, [chatId, userId, generateAIResponse]);

  // Reset auto-response flag when chat ID changes
  useEffect(() => {
    autoResponseGeneratedRef.current = false;
    // Clear all thinking states when switching chats
    setThinkingStates({});
  }, [chatId]);

  return {
    loadingAI,
    sendError,
    handleSend,
    generateAIResponse,
    checkAndGenerateAutoResponse,
    thinkingStates,
    clearThinkingStates: cleanupThinkingStates
  };
} 