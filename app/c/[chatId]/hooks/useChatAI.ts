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
  // Local ref to keep the latest thinking buffer in synchronous memory
  const thinkingBuffersRef = useRef<{ [messageId: string]: string }>({});
  const autoResponseGeneratedRef = useRef(false);
  
  // per-message loading state until the first THINKING chunk arrives
  const [thinkingLoadingMap, setThinkingLoadingMap] = useState<{ [messageId: string]: boolean }>({});

  // timers to auto-hide the loading indicator if thinking never appears
  const thinkingLoadingTimersRef = useRef<{ [messageId: string]: ReturnType<typeof setTimeout> }>({});

  // Abort controller used to cancel active streaming request
  const abortControllerRef = useRef<AbortController | null>(null);

  // Optional per-message cancelled flag (useful to show UI state)
  const [cancelledMessages, setCancelledMessages] = useState<{ [id: string]: boolean }>({});

  // Track current streaming message ID
  const currentMessageIdRef = useRef<string | null>(null);

  // Store reader reference for cancellation
  const currentReaderRef = useRef<ReadableStreamDefaultReader<Uint8Array> | null>(null);

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


  // Cleanup on unmount or chatId change
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        try { abortControllerRef.current.abort(); } catch (e) {}
        abortControllerRef.current = null;
      }
      if (currentReaderRef.current) {
        try { currentReaderRef.current.cancel(); } catch (e) {}
        currentReaderRef.current = null;
      }
      cleanupThinkingStates();
    };
  }, [chatId, cleanupThinkingStates]);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      try {
        Object.values(thinkingLoadingTimersRef.current || {}).forEach((t) => clearTimeout(t));
        thinkingLoadingTimersRef.current = {};
      } catch (e) {
        // noop
      }
    };
  }, []);

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

    // Set loading state to true when AI starts responding
    setLoadingAI(true);
    setSendError(null);

    // Create AbortController for this streaming request
    if (abortControllerRef.current) {
      // ensure previous controller cleaned up
      try { abortControllerRef.current.abort(); } catch (e) {}
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    let aiMessage: Message | null = null;

    try {
      const requestBody = {
        query: message.trim(),
        sessionId: chatId,
        userId: userId,
      };
      
      // Send message to API
      console.log('🟦 [FETCH][INFO] Starting fetch request with abort signal');
      const response = await fetch('/api/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });
      
      console.log('🟦 [FETCH][INFO] Fetch request completed, response status:', response.status);
      

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

      // Store reader reference for cancellation
      currentReaderRef.current = reader;
      

      let aiResponse = '';
      aiMessage = {
        id: generateUniqueId('ai'),
        sessionId: chatId,
        userId: userId,
        role: 'ASSISTANT',
        content: '',
        createdAt: new Date() // AI message gets current timestamp
      };

      // Set loading state for thinking display
      setThinkingLoadingMap(prev => ({ ...prev, [aiMessage!.id]: true }));

      // Start fallback timer (8s). If no thinking shows up, hide spinner so UI doesn't hang.
      const timer = setTimeout(() => {
        setThinkingLoadingMap(prev => ({ ...prev, [aiMessage!.id]: false }));
        delete thinkingLoadingTimersRef.current[aiMessage!.id];
      }, 8000);
      thinkingLoadingTimersRef.current[aiMessage!.id] = timer;

      // Add the AI message immediately
      addMessage(aiMessage);

      // Track current streaming message
      currentMessageIdRef.current = aiMessage.id;

      // Initialize thinking state for this message
      setThinkingStates(prev => ({
        ...prev,
        [aiMessage!.id]: { isThinking: true, content: '' }
      }));

      const decoder = new TextDecoder();
      let closed = false;

      // Check if request was already aborted
      if (controller.signal.aborted) {
        console.log('🟦 [STREAM][INFO] Request was aborted before stream processing');
        return;
      }

      while (!closed) {
        // Check if request was aborted before reading
        if (controller.signal.aborted || abortControllerRef.current?.signal.aborted) {
          console.log('🟦 [chat_ui][INFO] Stream aborted by user during reading', {
            controllerAborted: controller.signal.aborted,
            refAborted: abortControllerRef.current?.signal.aborted,
            hasReader: !!currentReaderRef.current
          });
          reader.cancel();
          closed = true;
          break;
        }
        
        // Add timeout to make reader.read() more responsive to abort signals
        const readWithTimeout = async () => {
          // Check abort signal immediately
          if (controller.signal.aborted || abortControllerRef.current?.signal.aborted) {
            console.log('🟦 [chat_ui][INFO] Abort detected in readWithTimeout', {
              controllerAborted: controller.signal.aborted,
              refAborted: abortControllerRef.current?.signal.aborted
            });
            throw new Error('Request aborted');
          }
          
          // Create abort promise that resolves when signal is aborted
          const abortPromise = new Promise<never>((_, reject) => {
            if (controller.signal.aborted || abortControllerRef.current?.signal.aborted) {
              console.log('🟦 [chat_ui][INFO] Abort promise created with already aborted signal');
              reject(new Error('Request aborted'));
              return;
            }
            
            const abortHandler = () => {
              console.log('🟦 [chat_ui][INFO] Abort handler triggered');
              reject(new Error('Request aborted'));
            };
            
            controller.signal.addEventListener('abort', abortHandler);
            abortControllerRef.current?.signal.addEventListener('abort', abortHandler);
          });
          
          // Race between read and abort
          return Promise.race([
            reader.read(),
            abortPromise
          ]);
        };
        
        let result: ReadableStreamReadResult<Uint8Array>;
        try {
          result = await readWithTimeout();
        } catch (error) {
          if (error instanceof Error && error.message === 'Request aborted') {
            console.log('🟦 [chat_ui][INFO] Stream aborted by user during read');
            reader.cancel();
            closed = true;
            break;
          } else if (error instanceof Error && error.message === 'Read timeout') {
            // Continue to next iteration
            continue;
          } else {
            throw error;
          }
        }
        
        const { done, value } = result;
        
        if (done) {
          closed = true;
          break;
        }

        const chunk = decoder.decode(value);
        
        // Handle character-by-character streaming (not line-by-line)
        if (chunk.startsWith('THINKING:')) {
          const thinkingContent = chunk.slice(9); // Remove 'THINKING:' prefix

          // Clear loading state when first THINKING chunk arrives
          if (thinkingLoadingMap[aiMessage!.id]) {
            // clear fallback timer
            const t = thinkingLoadingTimersRef.current[aiMessage!.id];
            if (t) {
              clearTimeout(t);
              delete thinkingLoadingTimersRef.current[aiMessage!.id];
            }
            // hide loading and ensure thinking UI will appear (state is updated below)
            setThinkingLoadingMap(prev => ({ ...prev, [aiMessage!.id]: false }));
          }

          // Update React state (existing)
          setThinkingStates(prev => ({
            ...prev,
            [aiMessage!.id]: { 
              isThinking: true, 
              content: (prev[aiMessage!.id]?.content || '') + thinkingContent 
            }
          }));
        } else if (chunk.startsWith('FINAL:')) {
          // Switch from thinking to final response
          if (process.env.NODE_ENV === 'development') {
            console.log('🟦 [CONVERSATION_FLOW] FINAL marker received', {
              chunk: chunk,
              aiResponseLength: aiResponse.length
            });
          }

          // Clear loading state on FINAL
          const t = thinkingLoadingTimersRef.current[aiMessage!.id];
          if (t) {
            clearTimeout(t);
            delete thinkingLoadingTimersRef.current[aiMessage!.id];
          }
          setThinkingLoadingMap(prev => ({ ...prev, [aiMessage!.id]: false }));

          // Mark thinking state as finished (existing behavior)
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
        console.log('🟦 [chat_ui][INFO] Request was aborted by user');
        // Clear current message ID when aborted
        currentMessageIdRef.current = null;
        setLoadingAI(false);
        setSendError('Request was cancelled');
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
      
      // Clear controller if it is this one
      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null;
      }
      
      // Clear reader reference
      currentReaderRef.current = null;
      
      // Clear current message ID
      currentMessageIdRef.current = null;
      
      // Clear loading state on stream completion
      if (aiMessage) {
        const t = thinkingLoadingTimersRef.current[aiMessage.id];
        if (t) {
          clearTimeout(t);
          delete thinkingLoadingTimersRef.current[aiMessage.id];
        }
        setThinkingLoadingMap(prev => ({ ...prev, [aiMessage!.id]: false }));
      }
    }
  }, [userId, chatId, cleanupThinkingStates]);

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

    // Only include documents uploaded with this specific message
    // Do NOT include session document context as it contains all session documents
    const allDocuments = documents || [];

    if (process.env.NODE_ENV === 'development') {
      console.log('🟦 [chat_ui][DEBUG] Document information for user message:', {
        uploadedDocuments: documents || [],
        sessionDocumentContext: sessionMetadata?.documentContext || [],
        combinedDocuments: allDocuments,
        sessionId: chatId,
        note: 'Only including documents uploaded with this specific message'
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

    // Generate AI response with only the documents from this message
    // Note: setLoadingAI(true) is now handled inside generateAIResponse
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

  // Cancel current AI request (exposed for external use)
  const cancelRequest = useCallback(() => {
    const messageId = currentMessageIdRef.current;
    
    console.log('🟦 [CANCEL][INFO] Cancel request initiated', {
      messageId,
      hasAbortController: !!abortControllerRef.current,
      hasReader: !!currentReaderRef.current,
      loadingAI,
      abortControllerSignal: abortControllerRef.current?.signal.aborted,
      readerExists: !!currentReaderRef.current
    });
    
    try {
      // abort network fetch
      if (abortControllerRef.current) {
        console.log('🟦 [CANCEL][INFO] Aborting controller');
        abortControllerRef.current.abort();
        // After aborting, null it to avoid reuse
        abortControllerRef.current = null;
      } else {
        console.log('🟦 [CANCEL][WARNING] No abort controller found');
      }

      // cancel stream reader (this is the key fix!)
      if (currentReaderRef.current) {
        console.log('🟦 [CANCEL][INFO] Cancelling reader');
        currentReaderRef.current.cancel();
        currentReaderRef.current = null;
      } else {
        console.log('🟦 [CANCEL][WARNING] No reader found');
      }
    } catch (e) {
      console.warn('🟥 [CANCEL][ERROR] Failed to abort streaming request', e);
    }

    // mark message as cancelled (so the UI can render differently)
    if (messageId) {
      setCancelledMessages(prev => ({ ...prev, [messageId]: true }));
    }
    
    // cleanup synchronous buffers for that messageId (if provided)
    if (messageId) {
      thinkingBuffersRef.current[messageId] = '';
    } else {
      // no message id provided — clear everything
      thinkingBuffersRef.current = {};
    }

    // Also update thinking UI flags
    setThinkingStates(prev => {
      const copy = { ...prev };
      if (messageId) {
        copy[messageId] = { isThinking: false, content: copy[messageId]?.content || '' };
      } else {
        Object.keys(copy).forEach(k => { copy[k] = { isThinking: false, content: copy[k]?.content || '' }; });
      }
      return copy;
    });

    // Clear current message ID
    currentMessageIdRef.current = null;
    
    setLoadingAI(false);
    setSendError('Request was cancelled');
  }, []);

  return {
    loadingAI,
    sendError,
    handleSend,
    checkAndGenerateAutoResponse,
    thinkingStates,
    thinkingLoadingMap,
    cancelledMessages,
    clearThinkingStates,
    cancelRequest,
  };
} 