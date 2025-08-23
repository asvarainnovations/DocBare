"use client";

import { useState, useRef, useEffect } from "react";
import clsx from "clsx";
import { ClipboardIcon, CheckCircleIcon, ChevronDownIcon } from "@heroicons/react/24/outline";
import { marked } from "marked";

interface AnimatedCopyButtonProps {
  content: string;
}

export default function AnimatedCopyButton({
  content,
}: AnimatedCopyButtonProps) {
  const [showCheck, setShowCheck] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const copyAsGoogleDocs = async () => {
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
      setIsDropdownOpen(false);
      setTimeout(() => setShowCheck(false), 2000);
    } catch (err) {
      console.error("🟥 [copy_button][ERROR] Failed to copy as Google Docs:", err);
      // Fallback to plain text
      await copyAsPlainText();
    }
  };

  const copyAsWord = async () => {
    try {
      // Convert markdown to HTML for Word compatibility
      const htmlContent = marked(content);

      // Create a properly formatted HTML document for Word
      const wordHtml = `<!DOCTYPE html>
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word">
        <head>
          <meta charset="utf-8">
          <meta name="ProgId" content="Word.Document">
          <meta name="Generator" content="Microsoft Word">
          <meta name="Originator" content="Microsoft Word">
          <style>
            body { font-family: 'Calibri', sans-serif; font-size: 11pt; line-height: 1.15; color: #000; }
            h1, h2, h3, h4, h5, h6 { margin-top: 1em; margin-bottom: 0.5em; font-weight: bold; }
            h1 { font-size: 16pt; }
            h2 { font-size: 14pt; }
            h3 { font-size: 12pt; }
            p { margin-bottom: 1em; }
            ul, ol { margin-bottom: 1em; padding-left: 2em; }
            li { margin-bottom: 0.25em; }
            blockquote { border-left: 3px solid #ccc; padding-left: 1em; margin: 1em 0; font-style: italic; }
            code { background-color: #f5f5f5; padding: 2px 4px; border-radius: 3px; font-family: 'Consolas', monospace; }
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
          "text/html": new Blob([wordHtml], { type: "text/html" }),
          "text/plain": new Blob([content], { type: "text/plain" }),
        }),
      ]);

      setShowCheck(true);
      setIsDropdownOpen(false);
      setTimeout(() => setShowCheck(false), 2000);
    } catch (err) {
      console.error("🟥 [copy_button][ERROR] Failed to copy as Word:", err);
      // Fallback to plain text
      await copyAsPlainText();
    }
  };

  const copyAsPlainText = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setShowCheck(true);
      setIsDropdownOpen(false);
      setTimeout(() => setShowCheck(false), 2000);
    } catch (err) {
      console.error("🟥 [copy_button][ERROR] Failed to copy as plain text:", err);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        className={clsx(
          "p-1 rounded hover:bg-gray-700 text-gray-300 transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-blue-400 flex items-center gap-1",
          showCheck && "text-green-400"
        )}
        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
        title={showCheck ? "Copied!" : "Copy response"}
        aria-label="Copy response"
      >
        {showCheck ? (
          <CheckCircleIcon className="w-5 h-5" />
        ) : (
          <>
            <ClipboardIcon className="w-5 h-5" />
            <ChevronDownIcon className="w-3 h-3" />
          </>
        )}
      </button>

      {/* Dropdown Menu */}
      {isDropdownOpen && !showCheck && (
        <div className="absolute bottom-full left-0 mb-2 bg-gray-800 border border-gray-600 rounded-lg shadow-lg z-50 min-w-[160px]">
          <div className="py-1">
            <button
              onClick={copyAsGoogleDocs}
              className="w-full px-3 py-2 text-left text-sm text-gray-300 hover:bg-gray-700 transition-colors duration-150 flex items-center gap-2"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Google Docs Format
            </button>
            <button
              onClick={copyAsWord}
              className="w-full px-3 py-2 text-left text-sm text-gray-300 hover:bg-gray-700 transition-colors duration-150 flex items-center gap-2"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"/>
              </svg>
              Word Format
            </button>
            <div className="border-t border-gray-600 my-1"></div>
            <button
              onClick={copyAsPlainText}
              className="w-full px-3 py-2 text-left text-sm text-gray-300 hover:bg-gray-700 transition-colors duration-150 flex items-center gap-2"
            >
              <ClipboardIcon className="w-4 h-4" />
              Plain Text
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
