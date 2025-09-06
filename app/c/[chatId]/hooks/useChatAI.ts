import { useState, useCallback, useRef, useEffect } from 'react';
import { toast } from 'sonner';
import axios from 'axios';

interface Message {
  id: string;
  sessionId: string;
  userId?: string;
  role: 'USER' | 'ASSISTANT' | 'SYSTEM';
  content: string;
  documents?: Array<{
    documentId: string;
    fileName: string;
    firestoreId?: string;
  }>;
  createdAt: Date;
}

interface ThinkingState {
  isThinking: boolean;
  content: string;
}

const generateUniqueId = (prefix: string) => {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

export function useChatAI(chatId: string, userId?: string) {
  const [loadingAI, setLoadingAI] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [thinkingStates, setThinkingStates] = useState<{ [messageId: string]: ThinkingState }>({});
  const autoResponseGeneratedRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);

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

  // Cleanup function for AbortController
  const cleanupAbortController = useCallback(() => {
    if (abortControllerRef.current) {
      try {
        abortControllerRef.current.abort();
      } catch (error) {
        // Ignore errors if controller is already closed
        console.log('🟦 [chat_ui][INFO] AbortController cleanup error (ignored):', error);
      }
      abortControllerRef.current = null;
    }
  }, []);

  // Cleanup on unmount or chatId change
  useEffect(() => {
    return () => {
      cleanupAbortController();
      cleanupThinkingStates();
    };
  }, [chatId, cleanupAbortController, cleanupThinkingStates]);

  // Generate AI response with proper streaming display
  const generateAIResponse = useCallback(async (
    message: string,
    addMessage: (message: Message) => void,
    updateMessage: (messageId: string, updates: Partial<Message>) => void,
    removeMessage: (messageId: string) => void,
    documents?: Array<{ documentId: string; fileName: string; firestoreId?: string }>
  ) => {
    if (!userId) {
      console.error('🟥 [chat_ui][ERROR] No user ID');
      toast.error('Please log in to send messages');
      return;
    }

    // Cleanup previous AbortController
    cleanupAbortController();

    // Create new AbortController for this request
    abortControllerRef.current = new AbortController();

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
        signal: abortControllerRef.current.signal,
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
        
        // Handle character-by-character streaming (not line-by-line)
        if (chunk.startsWith('THINKING:')) {
          const thinkingContent = chunk.slice(9); // Remove 'THINKING:' prefix
          setThinkingStates(prev => ({
            ...prev,
            [aiMessage!.id]: { 
              isThinking: true, 
              content: prev[aiMessage!.id]?.content + thinkingContent 
            }
          }));
        } else if (chunk.startsWith('FINAL:')) {
          // Switch from thinking to final response
          setThinkingStates(prev => ({
            ...prev,
            [aiMessage!.id]: { isThinking: false, content: prev[aiMessage!.id]?.content || '' }
          }));
        } else if (chunk.trim() && !chunk.startsWith('THINKING:') && !chunk.startsWith('FINAL:')) {
          // Regular content - this is the actual AI response
          aiResponse += chunk;
          updateMessage(aiMessage!.id, { content: aiResponse });
        }
      }

      // Release the reader lock
      try {
        reader.releaseLock();
      } catch (error) {
        console.log('🟦 [chat_ui][INFO] Reader release error (ignored):', error);
      }

      // Finalize thinking state
      setThinkingStates(prev => ({
        ...prev,
        [aiMessage!.id]: { isThinking: false, content: prev[aiMessage!.id]?.content || '' }
      }));

      // Save AI message to database
      try {
        await axios.post('/api/chat', {
          sessionId: chatId,
          userId: userId,
          role: 'ASSISTANT',
          content: aiResponse,
          reasoningContent: thinkingStates[aiMessage!.id]?.content || ''
        });
        console.info('🟩 [chat_ui][SUCCESS] AI message saved to database');
      } catch (saveError) {
        console.error('🟥 [chat_ui][ERROR] Failed to save AI message:', saveError);
      }

      // Cleanup thinking states after a delay
      setTimeout(() => {
        cleanupThinkingStates();
      }, 5000);

    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log('🟦 [chat_ui][INFO] Request was aborted');
        return;
      }

      console.error('🟥 [chat_ui][ERROR] AI response generation failed:', error);
      setSendError('Failed to generate AI response');
      toast.error('Failed to generate AI response. Please try again.');

      // Remove the AI message if it was added
      if (aiMessage && removeMessage) {
        removeMessage(aiMessage.id);
      }
    } finally {
      setLoadingAI(false);
      cleanupAbortController();
    }
  }, [userId, chatId, cleanupAbortController, cleanupThinkingStates]);

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

    if (process.env.NODE_ENV === 'development') {
      console.log('🟦 [chat_ui][DEBUG] Document information for user message:', {
        uploadedDocuments: documents || [],
        sessionDocumentContext: sessionMetadata?.documentContext || [],
        combinedDocuments: allDocuments,
        sessionId: chatId
      });
    }

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

    // Generate AI response
    await generateAIResponse(message, addMessage, updateMessage, removeMessage, allDocuments);
  }, [userId, chatId, generateAIResponse]);

  // Check and generate auto-response for new chats
  const checkAndGenerateAutoResponse = useCallback(async (
    messages: Message[],
    addMessage: (message: Message) => void,
    updateMessage: (messageId: string, updates: Partial<Message>) => void,
    removeMessage: (messageId: string) => void
  ) => {
    if (autoResponseGeneratedRef.current || messages.length > 1 || !userId) {
      return;
    }

    const firstMessage = messages[0];
    if (firstMessage && firstMessage.role === 'USER' && firstMessage.content.trim()) {
      autoResponseGeneratedRef.current = true;
      await generateAIResponse(
        firstMessage.content,
        addMessage,
        updateMessage,
        removeMessage,
        firstMessage.documents
      );
    }
  }, [userId, generateAIResponse]);

  // Clear thinking states (exposed for external use)
  const clearThinkingStates = useCallback(() => {
    setThinkingStates({});
  }, []);

  return {
    loadingAI,
    sendError,
    handleSend,
    checkAndGenerateAutoResponse,
    thinkingStates,
    clearThinkingStates,
  };
} 