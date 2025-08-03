"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import {
  PaperAirplaneIcon,
  PaperClipIcon,
  PlusIcon,
} from "@heroicons/react/24/outline";
import { motion, AnimatePresence } from "framer-motion";
import clsx from "clsx";
import axios from "axios";
import { toast } from "sonner";

interface ChatInputProps {
  variant?: "home" | "chat";
  placeholder?: string;
  onSend: (message: string) => void;
  loading?: boolean;
  disabled?: boolean;
  error?: string | null;
  showAttachments?: boolean;
  maxHeight?: number;
  value?: string;
  onChange?: (value: string) => void;
  userId?: string; // Add userId prop
}

export default function ChatInput({
  variant = "chat",
  placeholder = "Ask your legal question…",
  onSend,
  loading = false,
  disabled = false,
  error = null,
  showAttachments = true,
  maxHeight = 240,
  value: controlledValue,
  onChange: controlledOnChange,
  userId,
}: ChatInputProps) {
  const [inputValue, setInputValue] = useState("");
  const [showError, setShowError] = useState(false);
  const [uploading, setUploading] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const liveRegionRef = useRef<HTMLDivElement>(null);

  const isHomeVariant = variant === "home";

  // Use controlled value if provided, otherwise use internal state
  const displayValue =
    controlledValue !== undefined ? controlledValue : inputValue;

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      const scrollHeight = Math.min(textarea.scrollHeight, maxHeight);
      textarea.style.height = `${scrollHeight}px`;
    }
  }, [displayValue, maxHeight]);

  const handleSend = () => {
    const trimmedValue = displayValue.trim();
    console.log("🟦 [ChatInput][INFO] handleSend called with:", {
      trimmedValue,
      loading,
      disabled,
    });

    if (!trimmedValue || loading || disabled) {
      console.log("🟦 [ChatInput][INFO] handleSend early return:", {
        trimmedValue: !!trimmedValue,
        loading,
        disabled,
      });
      return;
    }

    console.log("🟦 [ChatInput][INFO] Calling onSend with:", trimmedValue);
    onSend(trimmedValue);

    // Clear the input
    if (controlledValue !== undefined) {
      // Controlled mode - call onChange to clear
      if (controlledOnChange) {
        controlledOnChange("");
      }
    } else {
      // Uncontrolled mode - clear internal state
      setInputValue("");
    }

    setShowError(false);

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

    // Announce to screen readers
    if (liveRegionRef.current) {
      liveRegionRef.current.textContent = "Message sent";
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    console.log("🟦 [ChatInput][INFO] KeyDown event:", {
      key: e.key,
      shiftKey: e.shiftKey,
      loading,
    });
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      console.log("🟦 [ChatInput][INFO] Enter pressed, calling handleSend");
      if (!loading) {
        handleSend();
      } else {
        console.log(
          "🟦 [ChatInput][INFO] Loading is true, not calling handleSend"
        );
      }
    }
  };

  const handleBlur = () => {
    if (controlledOnChange) {
      controlledOnChange(displayValue);
    }
  };

  // Show error message
  useEffect(() => {
    if (error) {
      setShowError(true);
      toast.error(error);
      const timer = setTimeout(() => setShowError(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  // Dropzone configuration
  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      console.info("🟦 [chat_input][INFO] Files dropped:", acceptedFiles);

      if (!acceptedFiles.length) return;

      if (!userId) {
        toast.error("User ID is required for file upload");
        return;
      }

      setUploading(true);

      try {
        // Handle file upload logic
        const formData = new FormData();
        formData.append("file", acceptedFiles[0]);
        formData.append("userId", userId);

        const response = await axios.post("/api/upload", formData, {
          headers: {
            "Content-Type": "multipart/form-data",
          },
          onUploadProgress: (progressEvent) => {
            const percentCompleted = Math.round(
              (progressEvent.loaded * 100) / (progressEvent.total || 1)
            );
            console.info(
              "🟦 [chat_input][INFO] Upload progress:",
              percentCompleted + "%"
            );
          },
        });

        console.info(
          "🟦 [chat_input][SUCCESS] File uploaded successfully:",
          response.data
        );
        toast.success(`File "${acceptedFiles[0].name}" uploaded successfully!`);

        // Optionally trigger document ingestion
        if (response.data.url) {
          try {
            await axios.post("/api/ingest", {
              documentId: response.data.documentId,
              userId: userId,
            });
            console.info("🟦 [chat_input][SUCCESS] Document ingestion started");
            toast.success("Document processing started");
          } catch (ingestError) {
            console.error(
              "🟥 [chat_input][ERROR] Failed to start ingestion:",
              ingestError
            );
            toast.error("Failed to start document processing");
          }
        }
      } catch (error: any) {
        console.error("🟥 [chat_input][ERROR] File upload failed:", error);
        toast.error(error.response?.data?.error || "Failed to upload file");
      } finally {
        setUploading(false);
      }
    },
    [userId]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    noClick: true,
  });

  const containerClasses = clsx(
    "w-full",
    isHomeVariant ? "max-w-2xl mx-auto" : "max-w-none"
  );

  const formClasses = clsx(
    "relative bg-slate rounded-2xl p-3 sm:p-4 border transition-all duration-150",
    "focus-within:border-[#007BFF] focus-within:shadow-lg",
    error ? "border-[#E53E3E]" : "border-gray-700",
    isHomeVariant ? "shadow-lg" : "shadow-md"
  );

  return (
    <motion.div className={containerClasses}>
      {/* Loading indicator message */}
      {loading && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-sm text-blue-400 mb-2 text-center"
        >
          AI is thinking... You can type your next question below
        </motion.div>
      )}

      <div {...getRootProps()} className="w-full relative">
        <form
          onSubmit={(e) => {
            console.log("🟦 [ChatInput][INFO] Form submit event");
            e.preventDefault();
            handleSend();
          }}
          className={formClasses}
        >
          {/* Textarea */}
          <textarea
            ref={textareaRef}
            aria-label="Type your question here"
            className={clsx(
              "resize-none bg-transparent text-white text-sm sm:text-base font-normal w-full",
              "placeholder:italic placeholder:text-[#6E6F77] placeholder:font-semibold",
              "outline-none focus:ring-0",
              "min-h-[3rem]",
              "transition-colors duration-150",
              error ? "border-[#E53E3E]" : "focus:border-[#007BFF]"
            )}
            style={{
              border: "none",
              boxShadow: "none",
              padding: 0,
              margin: 0,
              lineHeight: "1.5",
              fontFamily: "Inter, sans-serif",
            }}
            value={displayValue}
            onChange={(e) => {
              console.log(
                "🟦 [ChatInput][INFO] Textarea onChange:",
                e.target.value
              );
              if (controlledValue !== undefined) {
                // Controlled mode - only call onChange
                if (controlledOnChange) {
                  controlledOnChange(e.target.value);
                }
              } else {
                // Uncontrolled mode - update internal state
                setInputValue(e.target.value);
              }
            }}
            onKeyDown={handleKeyDown}
            onBlur={handleBlur}
            placeholder={
              loading
                ? "AI is thinking... You can type your next question..."
                : placeholder
            }
            disabled={disabled}
            rows={isHomeVariant ? 2 : 1}
          />

          {/* Buttons row */}
          <div className="flex flex-row items-center mt-0 gap-2 justify-between">
            {/* Left: Attachment Icon */}
            {showAttachments && (
              <div className="flex items-center relative group">
                <button
                  type="button"
                  tabIndex={-1}
                  className="p-1.5 sm:p-2 text-gray-400 hover:text-white transition-colors"
                  aria-label="Upload document or image"
                >
                  {isHomeVariant ? (
                    <PlusIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                  ) : (
                    <PaperClipIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                  )}
                </button>
                <span className="absolute left-1/2 -translate-x-1/2 -top-8 bg-gray-900 text-xs text-white rounded px-2 py-1 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap">
                  Upload document or image
                </span>
              </div>
            )}

            {/* Right: Send Button */}
            <motion.button
              type="submit"
              className={clsx(
                "flex items-center justify-center rounded-full w-8 h-8 sm:w-10 sm:h-10",
                "bg-[#007BFF] text-white",
                "transition-all duration-150",
                displayValue.trim() && !loading
                  ? "animate-pulse"
                  : "opacity-50 cursor-not-allowed",
                loading && "pointer-events-none"
              )}
              disabled={!displayValue.trim() || loading || disabled}
              whileHover={
                displayValue.trim() && !loading ? { scale: 1.08 } : {}
              }
              whileTap={displayValue.trim() && !loading ? { scale: 0.95 } : {}}
              aria-label="Send"
            >
              {loading ? (
                <svg
                  className="animate-spin w-4 h-4 sm:w-5 sm:h-5"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="#fff"
                    strokeWidth="4"
                    fill="none"
                  />
                  <path
                    className="opacity-75"
                    fill="#fff"
                    d="M4 12a8 8 0 018-8v8z"
                  />
                </svg>
              ) : (
                <PaperAirplaneIcon className="w-4 h-4 sm:w-5 sm:h-5" />
              )}
            </motion.button>
          </div>

          {/* Error message */}
          <AnimatePresence>
            {showError && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                className="absolute left-0 right-0 -top-8 text-center text-[#E53E3E] text-xs sm:text-sm"
              >
                Oops, something went wrong. Please try again.
              </motion.div>
            )}
          </AnimatePresence>

          {/* Live region for screen readers */}
          <div ref={liveRegionRef} className="sr-only" aria-live="polite" />

          {/* Hidden input for dropzone */}
          <input {...getInputProps()} tabIndex={-1} className="hidden" />
        </form>

        {isDragActive && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-white text-base sm:text-lg rounded-2xl">
            Drop files to attach
          </div>
        )}
      </div>
    </motion.div>
  );
}
