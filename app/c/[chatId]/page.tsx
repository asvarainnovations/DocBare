"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useSession } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";

import ChatInput from "@/app/components/ChatInput";
import { useSidebar } from "@/app/components/SidebarContext";
import { useChat } from "@/app/components/ChatContext";
import LoadingSkeleton from "@/app/components/LoadingSkeleton";
import { ThinkingDisplay } from "@/app/components/ThinkingDisplay";

// Custom hooks
import { useChatMessages } from "./hooks/useChatMessages";
import { useSessionMetadata } from "./hooks/useSessionMetadata";
import { useFileUpload } from "./hooks/useFileUpload";
import { useChatAI } from "./hooks/useChatAI";

// Components
import ChatHeader from "./components/ChatHeader";
import ChatMessage from "./components/ChatMessage";

export default function ChatPage({ params }: { params: { chatId: string } }) {
  const { sidebarOpen } = useSidebar();
  const { addChat, updateChat } = useChat();
  const [input, setInput] = useState("");
  const [pageLoading, setPageLoading] = useState(true);
  const [regeneratingIdx, setRegeneratingIdx] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<{
    [idx: number]: "good" | "bad" | undefined;
  }>({});
  const [isStreaming, setIsStreaming] = useState(false);
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);

  const chatRef = useRef<HTMLDivElement>(null);
  const lastMsgRef = useRef<HTMLDivElement>(null);
  const liveRegionRef = useRef<HTMLDivElement>(null);
  const { data: session, status } = useSession();

  // Custom hooks
  const {
    messages,
    loadingMessages,
    errorMessages,
    addMessage,
    updateMessage,
    removeMessage,
  } = useChatMessages(params.chatId, session?.user?.id);
  const { sessionMeta, loadingMeta, errorMeta } = useSessionMetadata(
    params.chatId
  );
  const { uploadedFiles, handleFileUpload, handleFileRemove } = useFileUpload(
    session?.user?.id
  );
  const {
    loadingAI,
    sendError,
    handleSend,
    checkAndGenerateAutoResponse,
    thinkingStates,
    clearThinkingStates,
  } = useChatAI(params.chatId, session?.user?.id);

  // Enhanced file upload handler that clears thinking states
  const handleFileUploadWithCleanup = useCallback(
    async (file: {
      name: string;
      status: "uploading" | "processing" | "done" | "error";
      url?: string;
      error?: string;
      documentId?: string;
      prismaId?: string;
      firestoreId?: string;
      abortController?: AbortController;
    }) => {
      // Clear thinking states when a new document is uploaded
      clearThinkingStates();

      // Call the original file upload handler
      return await handleFileUpload(file);
    },
    [handleFileUpload, clearThinkingStates]
  );

  // Convert session document context to attachment card format
  const sessionDocuments = useMemo(() => {
    if (
      !sessionMeta?.documentContext ||
      !Array.isArray(sessionMeta.documentContext)
    ) {
      return [];
    }

    return sessionMeta.documentContext.map((doc: any) => ({
      name: doc.fileName || "Unknown Document",
      status: "done" as const,
      documentId: doc.documentId,
      prismaId: doc.documentId,
      firestoreId: doc.firestoreId,
    }));
  }, [sessionMeta?.documentContext]);

  // Check if any documents are still processing
  const isAnyDocumentProcessing = uploadedFiles.some(
    (file) => file.status === "uploading" || file.status === "processing"
  );

  // Combine uploaded files with session documents for display
  const allDocuments = useMemo(() => {
    return [...uploadedFiles, ...sessionDocuments];
  }, [uploadedFiles, sessionDocuments]);

  // Track streaming state - check if any message is currently thinking
  useEffect(() => {
    const anyThinking = Object.values(thinkingStates).some(
      (state) => state.isThinking
    );
    setIsStreaming(loadingAI || anyThinking);
  }, [loadingAI, thinkingStates]);

  // Essential logging for chat page state (only in development)
  useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      console.info("🟦 [chat_ui][INFO] Chat page state:", {
        chatId: params.chatId,
        messagesCount: messages.length,
        loadingAI,
        loadingMessages,
      });
    }
  }, [params.chatId, messages.length, loadingAI, loadingMessages]);

  // Add chat to context when session metadata is loaded
  useEffect(() => {
    if (sessionMeta && !loadingMeta) {
      addChat({
        id: params.chatId,
        sessionName: sessionMeta.sessionName || "New Chat",
        createdAt: new Date(sessionMeta.createdAt),
        updatedAt: new Date(sessionMeta.createdAt),
      });
    }
  }, [sessionMeta, loadingMeta, params.chatId, addChat]);

  // Poll for session name updates if it's still "New Chat"
  useEffect(() => {
    if (!sessionMeta?.sessionName && !loadingMeta) {
      const pollInterval = setInterval(async () => {
        try {
          const response = await fetch(
            `/api/sessions/${params.chatId}/metadata`
          );
          if (response.ok) {
            const data = await response.json();
            if (data.sessionName && data.sessionName !== "New Chat") {
              updateChat(params.chatId, {
                sessionName: data.sessionName,
                updatedAt: new Date(data.createdAt),
              });
              clearInterval(pollInterval);
            }
          }
        } catch (error) {
          console.error("Failed to poll for session name:", error);
        }
      }, 2000); // Poll every 2 seconds

      return () => clearInterval(pollInterval);
    }
  }, [sessionMeta?.sessionName, loadingMeta, params.chatId, updateChat]);

  // Auto-generate AI response for first message if it's a new chat
  useEffect(() => {
    // Trigger auto-response if we have exactly one user message and no AI messages
    // This handles both new chats and direct navigation to chat URLs
    if (
      !loadingMessages &&
      !loadingMeta &&
      messages.length === 1 &&
      messages[0].role === "USER"
    ) {
      checkAndGenerateAutoResponse(
        messages,
        addMessage as any,
        updateMessage as any,
        removeMessage as any
      );
    }
  }, [
    params.chatId,
    session?.user?.id,
    loadingMessages,
    loadingMeta,
    messages.length,
    sessionMeta,
    addMessage,
    updateMessage,
    removeMessage,
    checkAndGenerateAutoResponse,
  ]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (lastMsgRef.current && shouldAutoScroll) {
      lastMsgRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, shouldAutoScroll]);

  // Auto-scroll to bottom when AI is streaming (to end of AI response)
  useEffect(() => {
    if (isStreaming && shouldAutoScroll && lastMsgRef.current) {
      lastMsgRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [isStreaming, shouldAutoScroll]);

  // Detect user scroll to disable auto-scroll
  useEffect(() => {
    const chatContainer = chatRef.current;
    if (!chatContainer) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = chatContainer;
      const isAtBottom = scrollHeight - scrollTop - clientHeight < 50; // 50px threshold

      if (!isAtBottom) {
        setShouldAutoScroll(false);
      } else {
        setShouldAutoScroll(true);
      }
    };

    // Use passive listener for better performance
    chatContainer.addEventListener("scroll", handleScroll, { passive: true });
    return () => chatContainer.removeEventListener("scroll", handleScroll);
  }, []);

  // Re-enable auto-scroll when new messages are added
  useEffect(() => {
    if (messages.length > 0) {
      setShouldAutoScroll(true);
    }
  }, [messages.length]);

  // Set page loading to false when messages are loaded
  useEffect(() => {
    if (!loadingMessages && !loadingMeta) {
      setPageLoading(false);
    }
  }, [loadingMessages, loadingMeta]);

  // Clear loading state from home page when chat page loads
  useEffect(() => {
    // Clear any loading state that might be set from the home page
    if (typeof window !== "undefined") {
      localStorage.removeItem("docbare_creating_chat");
    }
  }, []);

  // Handle sending messages
  const handleSendMessage = useCallback(
    async (message: string) => {
      if (!message.trim()) return;

      // Convert uploaded files to document format for the message
      const documents = uploadedFiles.map((file) => ({
        documentId: file.documentId || "",
        fileName: file.name,
        firestoreId: file.firestoreId,
      }));

      // Debug logging
      console.log("🟦 [chat_ui][DEBUG] Sending message with documents:", {
        message: message.substring(0, 100),
        documents,
        uploadedFilesCount: uploadedFiles.length,
        sessionMeta: sessionMeta,
        sessionDocumentContext: sessionMeta?.documentContext,
      });

      setInput("");
      await handleSend(
        message,
        addMessage as any,
        updateMessage as any,
        removeMessage as any,
        documents,
        sessionMeta
      );

      // Clear all uploaded files after sending
      const fileCount = uploadedFiles.length;
      for (let i = fileCount - 1; i >= 0; i--) {
        handleFileRemove(i);
      }
    },
    [
      handleSend,
      addMessage,
      updateMessage,
      removeMessage,
      setInput,
      uploadedFiles,
      handleFileRemove,
    ]
  );

  // Handle regenerating state changes
  const handleRegeneratingChange = (
    isRegenerating: boolean,
    messageIndex: number
  ) => {
    setRegeneratingIdx(isRegenerating ? messageIndex : null);
  };

  // Handle feedback submission
  const handleFeedback = async (
    type: "good" | "bad",
    comment?: string,
    messageIndex?: number
  ) => {
    if (messageIndex !== undefined) {
      setFeedback((prev) => ({ ...prev, [messageIndex]: type }));
    }

    // Note: FeedbackSection component already handles the API submission
    // This function is only used for updating local state
    console.info("🟦 [chat_ui][INFO] Feedback state updated:", {
      type,
      comment,
      messageIndex,
    });
  };

  // Show loading skeleton while page is loading
  if (pageLoading || loadingMeta || loadingMessages) {
    return <LoadingSkeleton message="Loading chat..." />;
  }

  return (
    <div className="min-h-screen flex">
      {/* Main area */}
      <div className="flex-1 flex flex-col min-h-screen transition-all ml-0 bg-main-bg pb-32">
        {/* Chat history */}
        <div
          ref={chatRef}
          className="flex-1 overflow-y-auto px-2 md:px-0 py-4 md:py-8 flex flex-col gap-4 md:gap-6 max-w-full w-full mx-auto bg-main-bg"
          style={{ WebkitOverflowScrolling: "touch" }}
          role="log"
          aria-live="polite"
          aria-label="Chat conversation history"
        >
          {loadingMessages ? (
            <div className="text-white text-center animate-pulse text-base md:text-lg">
              Loading messages…
            </div>
          ) : errorMessages ? (
            <div className="text-red-300 text-center text-base md:text-lg">
              {errorMessages}
            </div>
          ) : (
            <AnimatePresence>
              {messages.map((msg, idx) => (
                <div
                  key={msg.id || idx}
                  ref={idx === messages.length - 1 ? lastMsgRef : undefined}
                >
                  {/* Show Thinking Display before AI message when AI is thinking or streaming */}
                  {msg.role === "ASSISTANT" &&
                    thinkingStates[msg.id] &&
                    thinkingStates[msg.id].content && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="w-full flex justify-start mb-4"
                      >
                        <div className="max-w-2xl mx-auto px-2 md:px-4 lg:px-0 py-2 w-full">
                          <ThinkingDisplay
                            isThinking={thinkingStates[msg.id].isThinking}
                            thinkingContent={thinkingStates[msg.id].content}
                            onComplete={() => {
                              // Thinking display will auto-hide after completion
                            }}
                          />
                        </div>
                      </motion.div>
                    )}

                  <ChatMessage
                    message={msg}
                    index={idx}
                    isLast={idx === messages.length - 1}
                    chatId={params.chatId}
                    userId={session?.user?.id}
                    messages={messages}
                    onRegenerate={(newContent) => {
                      updateMessage(msg.id, { content: newContent });
                    }}
                    onRegeneratingChange={handleRegeneratingChange}
                    onFeedback={handleFeedback}
                    isStreaming={isStreaming && idx === messages.length - 1}
                    isThinking={thinkingStates[msg.id]?.isThinking || false}
                    thinkingContent={thinkingStates[msg.id]?.content || ""}
                  />
                </div>
              ))}
            </AnimatePresence>
          )}
        </div>
      </div>

      {/* Fixed ChatInput at bottom */}
      <div
        className={`fixed bottom-0 left-0 right-0 z-30 bg-main-bg transition-all duration-300 ${
          sidebarOpen ? "ml-64" : "ml-0"
        }`}
      >
        <div className="max-w-3xl mx-auto px-4 pb-4">
          {/* Show uploaded files that haven't been sent yet */}
          {uploadedFiles.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4 w-full justify-start">
              {uploadedFiles.map((file, idx) => (
                <div
                  key={idx}
                  className="flex items-center bg-[#23242b] rounded-lg px-2 sm:px-3 py-1.5 sm:py-2 gap-1.5 sm:gap-2 shadow border border-gray-700"
                >
                  <span className="inline-flex items-center justify-center w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-pink-600 text-white font-bold text-xs">
                    {file.name.split(".").pop()?.toUpperCase() || "DOC"}
                  </span>
                  <span className="truncate max-w-[80px] sm:max-w-[120px] text-xs text-white">
                    {file.name}
                  </span>
                  {file.status === "uploading" && (
                    <span className="text-blue-400 text-xs">Uploading…</span>
                  )}
                  {file.status === "processing" && (
                    <span className="text-yellow-400 text-xs">Processing…</span>
                  )}
                  {file.status === "done" && (
                    <span className="text-green-400 text-xs">Ready</span>
                  )}
                  {file.status === "error" && (
                    <span className="text-red-400 text-xs">Error</span>
                  )}
                  <button
                    className="ml-1 text-gray-400 hover:text-red-400 text-xs"
                    onClick={() => handleFileRemove(idx)}
                    aria-label="Remove attachment"
                    type="button"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
          <ChatInput
            variant="chat"
            onSend={handleSendMessage}
            loading={loadingAI}
            disabled={isAnyDocumentProcessing}
            error={sendError}
            showAttachments={true}
            value={input}
            onChange={(value) => {
              console.log("🟦 [chat_ui][INFO] Input onChange:", value);
              setInput(value);
            }}
            userId={session?.user?.id}
            onFileUpload={handleFileUploadWithCleanup}
          />
        </div>
      </div>

      {/* Screen reader announcements */}
      <div
        ref={liveRegionRef}
        className="sr-only"
        aria-live="polite"
        aria-atomic="true"
      />
    </div>
  );
}
