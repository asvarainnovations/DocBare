"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import {
  PaperAirplaneIcon,
  PaperClipIcon,
  PlusIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { motion, AnimatePresence } from "framer-motion";
import clsx from "clsx";
import axios from "axios";
import { toast } from "sonner";

interface ChatInputProps {
  variant?: "home" | "chat";
  placeholder?: string;
  onSend: (message: string) => void;
  onCancel?: () => void; // Add cancel callback
  loading?: boolean;
  disabled?: boolean;
  error?: string | null;
  showAttachments?: boolean;
  maxHeight?: number;
  value?: string;
  onChange?: (value: string) => void;
  userId?: string; // Add userId prop
  onFileUpload?: (file: {
    name: string;
    status: "uploading" | "processing" | "done" | "error";
    url?: string;
    error?: string;
    documentId?: string;
    prismaId?: string;
    firestoreId?: string;
    abortController?: AbortController;
  }) => void;
  // DocBare mode props
  isDocBareMode?: boolean;
  onModeToggle?: () => void;
}

export default function ChatInput({
  variant = "chat",
  placeholder = "Ask your legal question…",
  onSend,
  onCancel,
  loading = false,
  disabled = false,
  error = null,
  showAttachments = true,
  maxHeight = 240,
  value: controlledValue,
  onChange: controlledOnChange,
  userId,
  onFileUpload,
  isDocBareMode = false,
  onModeToggle,
}: ChatInputProps) {
  
  const [inputValue, setInputValue] = useState("");
  const [showError, setShowError] = useState(false);
  const [uploading, setUploading] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const liveRegionRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      if (process.env.NODE_ENV === "development") {
        console.info(
          "🟦 [chat_input][INFO] Files dropped:",
          acceptedFiles.length
        );
      }

      if (!acceptedFiles.length) return;

      if (!userId) {
        toast.error("User ID is required for file upload");
        return;
      }

      const file = acceptedFiles[0];

      // Check if file type is supported (only PDFs and images)
      const supportedTypes = [
        'application/pdf',
        'image/jpeg',
        'image/jpg', 
        'image/png',
        'image/gif',
        'image/bmp',
        'image/webp'
      ];
      
      if (!supportedTypes.includes(file.type)) {
        toast.error("Currently only PDFs and Images are allowed");
        return;
      }

      // Create AbortController for this upload
      const abortController = new AbortController();

      // Notify parent component about file upload start with abort controller
      if (onFileUpload) {
        onFileUpload({ name: file.name, status: "uploading", abortController });
      }

      setUploading(true);

      try {
        // Handle file upload logic
        const formData = new FormData();
        formData.append("file", file);
        formData.append("userId", userId);

        const response = await axios.post("/api/upload", formData, {
          headers: {
            "Content-Type": "multipart/form-data",
          },
          signal: abortController.signal,
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
        toast.success(`File "${file.name}" uploaded successfully!`);

        // Notify parent component about successful upload
        if (
          onFileUpload &&
          response.data.results &&
          response.data.results.length > 0
        ) {
          const result = response.data.results[0];
          onFileUpload({
            name: file.name,
            status: "done",
            url: result.url,
            prismaId: result.document?.id,
            firestoreId: result.firestoreId,
            abortController,
          });
        }

        // Optionally trigger document ingestion
        if (
          response.data.results &&
          response.data.results.length > 0 &&
          response.data.results[0].url
        ) {
          // Update status to processing before starting ingestion
          if (onFileUpload) {
            onFileUpload({
              name: file.name,
              status: "processing",
              url: response.data.results[0].url,
              prismaId: response.data.results[0].document?.id,
              firestoreId: response.data.results[0].firestoreId,
              abortController,
            });
          }

          try {
            const ingestResponse = await axios.post(
              "/api/ingest",
              {
                documentId: response.data.results[0].document?.id,
                userId: userId,
              },
              {
                signal: abortController.signal,
              }
            );
            console.info("🟦 [chat_input][SUCCESS] Document ingestion completed");
            
            // Handle confidence-based feedback from ingest response
            if (ingestResponse.data.data && ingestResponse.data.data.confidence) {
              const confidence = ingestResponse.data.data.confidence;
              const suggestions = ingestResponse.data.data.suggestions || [];
              
              if (confidence >= 80) {
                toast.success("Document processed successfully");
              } else if (confidence >= 50) {
                if (process.env.NODE_ENV === "development") {
                  toast.success(`Document processed with medium confidence (${confidence}/100)`, {
                    description: "Consider re-uploading for better results"
                  });
                } else {
                  toast.success("Document processed successfully");
                }
              } else {
                if (process.env.NODE_ENV === "development") {
                  toast.warning(`Document processed with low confidence (${confidence}/100)`, {
                    description: suggestions.slice(0, 2).join('. ')
                  });
                } else {
                  toast.success("Document processed successfully");
                }
              }
            } else {
              toast.success("Document processing completed");
            }
            
            // Update status to done after successful ingestion
            if (onFileUpload) {
              onFileUpload({
                name: file.name,
                status: "done",
                url: response.data.results[0].url,
                prismaId: response.data.results[0].document?.id,
                firestoreId: response.data.results[0].firestoreId,
                abortController,
              });
            }
          } catch (ingestError: any) {
            if (ingestError.name === "AbortError") {
              if (process.env.NODE_ENV === "development") {
                console.info(
                  "🟦 [chat_input][INFO] Document ingestion aborted"
                );
              }
              return;
            }
            console.error(
              "🟥 [chat_input][ERROR] Failed to start ingestion:",
              ingestError
            );
            toast.error("Failed to start document processing");
            
            // Update status to error if ingestion fails
            if (onFileUpload) {
              onFileUpload({
                name: file.name,
                status: "error",
                error: "Document processing failed",
                url: response.data.results[0].url,
                prismaId: response.data.results[0].document?.id,
                firestoreId: response.data.results[0].firestoreId,
                abortController,
              });
            }
          }
        }
      } catch (error: any) {
        if (error.name === "AbortError") {
          if (process.env.NODE_ENV === "development") {
            console.info("🟦 [chat_input][INFO] File upload aborted");
          }
          toast.info("File upload cancelled");
          return;
        }

        console.error("🟥 [chat_input][ERROR] File upload failed:", error);
        toast.error(error.response?.data?.error || "Failed to upload file");

        // Notify parent component about upload failure
        if (onFileUpload) {
          onFileUpload({
            name: file.name,
            status: "error",
            error: error.response?.data?.error || "Failed to upload file",
            abortController,
          });
        }
      } finally {
        setUploading(false);
      }
    },
    [userId, onFileUpload]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    noClick: true,
  });

  // Handle manual file selection via button click
  const handleFileButtonClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileInputChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      // Use the same onDrop logic for manually selected files
      const fileArray = Array.from(files);
      onDrop(fileArray);
    }
    // Reset the input value so the same file can be selected again
    event.target.value = "";
  };

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
              fontFamily: "Inter, system-ui, sans-serif",
            }}
            value={displayValue}
            onChange={(e) => {
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
            disabled={false}
            rows={isHomeVariant ? 2 : 1}
          />

          {/* Buttons row */}
          <div className="flex flex-row items-center mt-0 gap-2 justify-between">
            {/* Left: Attachment Icon and DocBare Toggle */}
            <div className="flex items-center gap-2">
              {showAttachments && (
                <div className="flex items-center relative group">
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={handleFileButtonClick}
                    className="p-1.5 sm:p-2 text-gray-400 hover:text-white transition-colors"
                    aria-label="Upload PDF or image"
                    disabled={uploading}
                  >
                    {uploading ? (
                      <div className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                    ) : isHomeVariant ? (
                      <PlusIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                    ) : (
                      <PaperClipIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                    )}
                  </button>
                  <span className="absolute left-1/2 -translate-x-1/2 -top-8 bg-gray-900 text-xs text-white rounded px-2 py-1 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap">
                    {uploading ? "Uploading..." : "Upload PDF or image"}
                  </span>
                </div>
              )}

              {/* DocBare Toggle Button */}
              <div className="flex items-center relative group">
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={onModeToggle}
                  className={clsx(
                    "px-3 py-1.5 sm:px-4 sm:py-2 rounded-full text-xs sm:text-sm font-medium transition-all duration-150",
                    isDocBareMode
                      ? "bg-blue-600 text-white hover:bg-blue-700"
                      : "bg-gray-700 text-white hover:bg-gray-600"
                  )}
                  aria-label={isDocBareMode ? "Turn off DocBare mode" : "Turn on DocBare mode"}
                >
                  DocBare
                </button>
              </div>
            </div>

            {/* Right: Send/Cancel Button */}
            <div className="flex items-center gap-2">
              <motion.button
                type={loading ? "button" : "submit"}
                onClick={loading && onCancel ? onCancel : undefined}
                className={clsx(
                  "flex items-center justify-center gap-2 rounded-full px-3 py-2 sm:px-4 sm:py-2.5",
                  loading ? "bg-gray-500 hover:bg-gray-600" : "bg-[#007BFF] hover:bg-blue-600",
                  "text-white text-sm font-medium",
                  "transition-all duration-150",
                  displayValue.trim() && !loading
                    ? "animate-pulse"
                    : "opacity-50 cursor-not-allowed",
                  loading && "pointer-events-auto cursor-pointer"
                )}
                disabled={!displayValue.trim() || disabled}
                whileHover={
                  displayValue.trim() ? { scale: 1.08 } : {}
                }
                whileTap={displayValue.trim() ? { scale: 0.95 } : {}}
                aria-label={loading ? "Cancel request" : "Send"}
              >
                {loading ? (
                  // Square icon for cancel (ChatGPT style)
                  <div className="w-4 h-4 sm:w-5 sm:h-5 bg-white rounded-sm" />
                ) : (
                  <PaperAirplaneIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                )}
                <span className="hidden sm:inline">
                  {loading ? "Cancel" : "Send"}
                </span>
              </motion.button>
            </div>
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

          {/* Manual file input for button clicks */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,.jpg,.jpeg,.png,.gif,.bmp,.webp"
            onChange={handleFileInputChange}
            tabIndex={-1}
            className="hidden"
          />
        </form>

        {isDragActive && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-white text-base sm:text-lg rounded-2xl">
            Drop PDF or image to attach
          </div>
        )}
      </div>
    </motion.div>
  );
}
