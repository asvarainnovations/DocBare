"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import { toast } from "sonner";

import ChatInput from "@/app/components/ChatInput";
import { useSidebar } from "@/app/components/SidebarContext";
import LoadingSkeleton from "@/app/components/LoadingSkeleton";

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
  const { loadingAI, sendError, handleSend, checkAndGenerateAutoResponse } =
    useChatAI(params.chatId, session?.user?.id);

  // Debug logging for input state
  useEffect(() => {
    console.log("🟦 [chat_ui][INFO] Input state changed:", input);
  }, [input]);

  // Debug logging for session and component state
  useEffect(() => {
    console.log("🟦 [chat_ui][INFO] Chat page mounted/updated:", {
      chatId: params.chatId,
      sessionStatus: status,
      sessionExists: !!session,
      userId: session?.user?.id,
      messagesCount: messages.length,
      loadingAI,
      loadingMeta,
      loadingMessages,
    });
  }, [
    params.chatId,
    status,
    session,
    messages.length,
    loadingAI,
    loadingMeta,
    loadingMessages,
  ]);

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
      console.info("🟦 [chat_ui][INFO] Auto-response check for new chat");
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

  // Handle sending messages
  const handleSendMessage = useCallback(
    async (message: string) => {
      await handleSend(message, addMessage, updateMessage, removeMessage);
    },
    [handleSend, addMessage, updateMessage, removeMessage]
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

    try {
      // Submit feedback to API
      await axios.post("/api/feedback", {
        sessionId: params.chatId,
        userId: session?.user?.id,
        rating: type,
        comments: comment || `User marked message ${messageIndex} as ${type}`,
        messageIndex,
        feedbackType: type,
      });

      console.info("🟦 [chat_ui][INFO] Feedback submitted successfully:", {
        type,
        comment,
        messageIndex,
      });
      toast.success("Feedback submitted successfully!");
    } catch (err: any) {
      console.error("🟥 [chat_ui][ERROR] Failed to submit feedback:", err);
      toast.error("Failed to submit feedback");
    }
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
                  />
                </div>
              ))}
            </AnimatePresence>
          )}

          {/* Loading indicator for AI response */}
          {loadingAI && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="w-full flex justify-start mb-4"
            >
              <div className="max-w-2xl mx-auto px-2 md:px-4 lg:px-0 py-2">
                <div className="bg-gray-800 text-white px-4 py-3 rounded-lg shadow-md">
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span className="text-sm">AI is thinking...</span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </div>

      {/* Uploaded Files Display */}
      <UploadedFilesDisplay
        uploadedFiles={uploadedFiles}
        onRemoveFile={handleFileRemove}
      />

      {/* Fixed ChatInput at bottom */}
      <div className="fixed bottom-0 left-0 right-0 z-30 bg-main-bg shadow-[0_-4px_20px_0_rgba(0,0,0,0.3)]">
        <div className="max-w-4xl mx-auto px-4 py-4">
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
