"use client";

import { useState } from "react";
import clsx from "clsx";
import { ClipboardIcon, CheckCircleIcon } from "@heroicons/react/24/outline";
import { marked } from "marked";

interface AnimatedCopyButtonProps {
  content: string;
}

export default function AnimatedCopyButton({
  content,
}: AnimatedCopyButtonProps) {
  const [showCheck, setShowCheck] = useState(false);

  const handleCopy = async () => {
    try {
      // Convert markdown to HTML for Google Docs compatibility
      const htmlContent = marked(content);

      // Create a properly formatted HTML document for Google Docs
      const googleDocsHtml = `<!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; font-size: 14px; line-height: 1.6; color: #000; }
            h1, h2, h3, h4, h5, h6 { margin-top: 1em; margin-bottom: 0.5em; font-weight: bold; }
            h1 { font-size: 20px; }
            h2 { font-size: 16px; }
            h3 { font-size: 14px; }
            p { margin-bottom: 1em; }
            ul, ol { margin-bottom: 1em; padding-left: 2em; }
            li { margin-bottom: 0.25em; }
            blockquote { border-left: 3px solid #ccc; padding-left: 1em; margin: 1em 0; font-style: italic; }
            code { background-color: #f5f5f5; padding: 2px 4px; border-radius: 3px; font-family: monospace; }
            pre { background-color: #f5f5f5; padding: 1em; border-radius: 5px; overflow-x: auto; }
            table { border-collapse: collapse; width: 100%; margin: 1em 0; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; font-weight: bold; }
          </style>
        </head>
        <body>
          ${htmlContent}
        </body>
      </html>`;

      // Use the modern clipboard API with multiple formats for maximum compatibility
      await navigator.clipboard.write([
        new ClipboardItem({
          "text/html": new Blob([googleDocsHtml], { type: "text/html" }),
          "text/plain": new Blob([content], { type: "text/plain" }),
        }),
      ]);

      setShowCheck(true);
      setTimeout(() => setShowCheck(false), 1200);
    } catch (err) {
      console.error(
        "🟥 [copy_button][ERROR] Failed to copy to clipboard:",
        err
      );

      // Fallback to plain text copy if the modern API fails
      try {
        await navigator.clipboard.writeText(content);
        setShowCheck(true);
        setTimeout(() => setShowCheck(false), 1200);
      } catch (fallbackErr) {
        console.error(
          "🟥 [copy_button][ERROR] Fallback copy also failed:",
          fallbackErr
        );
      }
    }
  };

  return (
    <button
      className={clsx(
        "p-1 rounded hover:bg-gray-700 text-gray-300 transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-blue-400",
        showCheck && "text-green-400 animate-bounce"
      )}
      onClick={handleCopy}
      title={showCheck ? "Copied!" : "Copy response"}
      aria-label="Copy response"
    >
      {showCheck ? (
        <CheckCircleIcon className="w-5 h-5" />
      ) : (
        <ClipboardIcon className="w-5 h-5" />
      )}
    </button>
  );
}
