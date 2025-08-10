"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";

import ChatInput from "@/app/components/ChatInput";
import { useSidebar } from "@/app/components/SidebarContext";
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
import UploadedFilesDisplay from "./components/UploadedFilesDisplay";

export default function ChatPage({ params }: { params: { chatId: string } }) {
  const { sidebarOpen } = useSidebar();
  const [input, setInput] = useState("");
  const [pageLoading, setPageLoading] = useState(true);
  const [regeneratingIdx, setRegeneratingIdx] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<{
    [idx: number]: "good" | "bad" | undefined;
  }>({});
  const [isStreaming, setIsStreaming] = useState(false);

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
  const { loadingAI, sendError, handleSend, checkAndGenerateAutoResponse, isThinking, thinkingContent } =
    useChatAI(params.chatId, session?.user?.id);

  // Track streaming state
  useEffect(() => {
    setIsStreaming(loadingAI || isThinking);
  }, [loadingAI, isThinking]);

  // Essential logging for chat page state (only in development)
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.info("🟦 [chat_ui][INFO] Chat page state:", {
        chatId: params.chatId,
        messagesCount: messages.length,
        loadingAI,
        loadingMessages,
      });
    }
  }, [params.chatId, messages.length, loadingAI, loadingMessages]);

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
        sessionMeta,
        loadingMessages,
        loadingMeta,
        addMessage,
        updateMessage,
        removeMessage
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
  ]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (lastMsgRef.current) {
      lastMsgRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  // Set page loading to false when messages are loaded
  useEffect(() => {
    if (!loadingMessages && !loadingMeta) {
      setPageLoading(false);
    }
  }, [loadingMessages, loadingMeta]);

  // Clear loading state from home page when chat page loads
  useEffect(() => {
    // Clear any loading state that might be set from the home page
    if (typeof window !== 'undefined') {
      localStorage.removeItem('docbare_creating_chat');
    }
  }, []);

  // Handle sending messages
  const handleSendMessage = useCallback(
    async (message: string) => {
      if (!message.trim()) return;
      
      setInput("");
      await handleSend(message, addMessage, updateMessage, removeMessage);
    },
    [handleSend, addMessage, updateMessage, removeMessage, setInput]
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
        {/* Chat session metadata */}
        {/* <ChatHeader 
          sessionMeta={sessionMeta}
          loadingMeta={loadingMeta}
          errorMeta={errorMeta}
        /> */}
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
                  {msg.role === 'ASSISTANT' && (isThinking || thinkingContent) && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="w-full flex justify-start mb-4"
                    >
                      <div className="max-w-2xl mx-auto px-2 md:px-4 lg:px-0 py-2 w-full">
                        <ThinkingDisplay
                          isThinking={isThinking}
                          thinkingContent={thinkingContent}
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
                    isThinking={isThinking}
                    thinkingContent={thinkingContent}
                  />
                </div>
              ))}
            </AnimatePresence>
          )}
        </div>
      </div>

      {/* Uploaded Files Display */}
      <UploadedFilesDisplay
        uploadedFiles={uploadedFiles}
        onRemoveFile={handleFileRemove}
      />

      {/* Fixed ChatInput at bottom */}
      <div className={`fixed bottom-0 left-0 right-0 z-30 bg-main-bg transition-all duration-300 ${sidebarOpen ? 'ml-64' : 'ml-0'}`}>
        <div className="max-w-3xl mx-auto px-4 pb-4">
          <ChatInput
            variant="chat"
            onSend={handleSendMessage}
            loading={loadingAI}
            error={sendError}
            showAttachments={true}
            value={input}
            onChange={(value) => {
              console.log("🟦 [chat_ui][INFO] Input onChange:", value);
              setInput(value);
            }}
            userId={session?.user?.id}
            onFileUpload={handleFileUpload}
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
