import { motion } from "framer-motion";
import clsx from "clsx";
import ReactMarkdown from "react-markdown";
import dynamic from 'next/dynamic';
import { atomDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import AnimatedCopyButton from "@/app/components/AnimatedCopyButton";

const SyntaxHighlighter = dynamic(() => import('react-syntax-highlighter').then(mod => mod.Prism), { ssr: false });
import RegenerateButton from "@/app/components/RegenerateButton";
import FeedbackSection from "@/app/components/FeedbackSection";
import AIThinkingAnimation from "@/app/components/AIThinkingAnimation";

interface Message {
  id: string;
  sessionId: string;
  userId: string;
  role: "USER" | "ASSISTANT";
  content: string;
  createdAt: Date;
  documents?: Array<{
    documentId: string;
    fileName: string;
    firestoreId?: string;
  }>;
}

interface ChatMessageProps {
  message: Message;
  index: number;
  isLast: boolean;
  chatId: string;
  userId?: string;
  messages: Message[];
  onRegenerate: (newContent: string) => void;
  onRegeneratingChange: (isRegenerating: boolean, messageIndex: number) => void;
  onFeedback: (
    type: "good" | "bad",
    comment?: string,
    messageIndex?: number
  ) => void;
  isStreaming?: boolean;
  isThinking?: boolean;
  thinkingContent?: string;
}

export default function ChatMessage({
  message,
  index,
  isLast,
  chatId,
  userId,
  messages,
  onRegenerate,
  onRegeneratingChange,
  onFeedback,
  isStreaming = false,
  isThinking,
  thinkingContent,
}: ChatMessageProps) {
  // Debug logging for user messages with documents
  if (message.role === 'USER' && message.documents && message.documents.length > 0) {
    console.log('🟦 [ChatMessage][DEBUG] User message with documents:', {
      messageId: message.id,
      content: message.content.substring(0, 50),
      documents: message.documents
    });
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      transition={{ duration: 0.2 }}
      className={clsx(
        "w-full flex mb-4",
        message.role === "USER" ? "justify-end" : "justify-start"
      )}
      role="group"
      aria-label={message.role === "USER" ? "User message" : "AI response"}
    >
      {message.role === "ASSISTANT" ? (
        <div className="w-full max-w-2xl mx-auto px-2 md:px-4 lg:px-0 py-2">
          {/* Show thinking animation if AI message is empty and not showing ThinkingDisplay */}
          {!message.content.trim() &&
          !isStreaming &&
          !(isThinking || thinkingContent) ? (
            <AIThinkingAnimation />
          ) : !message.content.trim() &&
            (isStreaming ||
              isThinking ||
              thinkingContent) ? // Don't render anything when streaming or showing ThinkingDisplay
          null : (
            <>
              <div className="markdown-content max-w-none bg-transparent">
                <ReactMarkdown
                  components={{
                    // Headings
                    h1: ({ children }) => (
                      <h1 className="text-xl font-bold text-white mb-4 mt-6 first:mt-0">
                        {children}
                      </h1>
                    ),
                    h2: ({ children }) => (
                      <h2 className="text-lg font-semibold text-white mb-3 mt-5 first:mt-0">
                        {children}
                      </h2>
                    ),
                    h3: ({ children }) => (
                      <h3 className="text-base font-semibold text-white mb-2 mt-4 first:mt-0">
                        {children}
                      </h3>
                    ),
                    h4: ({ children }) => (
                      <h4 className="text-sm font-semibold text-white mb-2 mt-3 first:mt-0">
                        {children}
                      </h4>
                    ),

                    // Paragraphs
                    p: ({ children }) => (
                      <p className="text-white mb-3 leading-relaxed last:mb-0 font-legal-content text-base">
                        {children}
                      </p>
                    ),

                    // Lists
                    ul: ({ children }) => (
                      <ul className="text-white mb-4 space-y-2 list-disc pl-6 font-legal-content">
                        {children}
                      </ul>
                    ),
                    ol: ({ children }) => (
                      <ol className="text-white mb-4 space-y-2 list-decimal pl-6 font-legal-content">
                        {children}
                      </ol>
                    ),
                    li: ({ children }) => (
                      <li className="text-white leading-relaxed font-legal-content mb-1">
                        {children}
                      </li>
                    ),

                    // Code blocks
                    code: ({ children, className }) => {
                      const isInline = !className;
                      if (isInline) {
                        return (
                          <code className="bg-gray-800 text-blue-300 px-1.5 py-0.5 rounded text-sm font-legal-mono">
                            {children}
                          </code>
                        );
                      }
                      const language =
                        className?.replace("language-", "") || "text";
                      return (
                        <div className="my-4">
                          <SyntaxHighlighter
                            language={language}
                            style={atomDark}
                            customStyle={{
                              margin: 0,
                              borderRadius: "0.5rem",
                              fontSize: "0.875rem",
                              fontFamily:
                                "JetBrains Mono, Monaco, Menlo, monospace",
                            }}
                          >
                            {String(children).replace(/\n$/, "")}
                          </SyntaxHighlighter>
                        </div>
                      );
                    },

                    // Blockquotes
                    blockquote: ({ children }) => (
                      <blockquote className="border-l-4 border-blue-500 pl-4 my-4 text-gray-300 italic">
                        {children}
                      </blockquote>
                    ),

                    // Tables
                    table: ({ children }) => (
                      <div className="overflow-x-auto my-4">
                        <table className="min-w-full border border-gray-600">
                          {children}
                        </table>
                      </div>
                    ),
                    th: ({ children }) => (
                      <th className="border border-gray-600 px-3 py-2 text-left text-white bg-gray-800">
                        {children}
                      </th>
                    ),
                    td: ({ children }) => (
                      <td className="border border-gray-600 px-3 py-2 text-white">
                        {children}
                      </td>
                    ),
                  }}
                >
                  {message.content}
                </ReactMarkdown>
              </div>

              {/* Action buttons for AI messages */}
              {!isStreaming && !isThinking && (
                <div className="flex items-center gap-2 mt-4">
                  <AnimatedCopyButton content={message.content} />
                  <RegenerateButton
                    sessionId={chatId}
                    userId={userId || ""}
                    messageIndex={index}
                    messages={messages}
                    onRegenerate={onRegenerate}
                    onRegeneratingChange={(isRegenerating) =>
                      onRegeneratingChange(isRegenerating, index)
                    }
                  />
                  <FeedbackSection
                    sessionId={chatId}
                    userId={userId || ""}
                    messageId={message.id}
                    messageIndex={index}
                    onFeedback={(type, comment) =>
                      onFeedback(type, comment, index)
                    }
                  />
                </div>
              )}
            </>
          )}
        </div>
      ) : (
        <div className="w-full max-w-2xl mx-auto flex justify-end px-2 md:px-4 lg:px-0 py-2">
            <div className="bg-blue-600 text-white px-4 py-3 rounded-lg shadow-md max-w-full">
              <div className="text-sm md:text-base leading-relaxed break-words font-legal-content whitespace-pre-wrap">
                {message.content}
              </div>
              
              {/* Document attachments for user messages */}
              {message.documents && message.documents.length > 0 && (
                <div className="mt-3 pt-3 border-t border-blue-500">
                  <div className="flex flex-wrap gap-2">
                    {message.documents.map((doc, idx) => (
                      <div key={idx} className="flex items-center bg-blue-700/50 rounded-lg px-3 py-2 gap-2 text-xs border border-blue-600/30">
                        <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-red-500 text-white font-bold text-xs">
                          {doc.fileName.split('.').pop()?.toUpperCase() || 'DOC'}
                        </span>
                        <span className="truncate max-w-[120px] text-white font-medium">{doc.fileName}</span>
                        <span className="text-blue-300 text-xs opacity-75">
                          {doc.fileName.split('.').pop()?.toUpperCase() || 'DOC'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
        </div>
      )}
    </motion.div>
  );
}
