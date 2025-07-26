# DocBare Implementation Plan - Critical Improvements

## 🚀 Phase 1: Immediate Improvements (Week 1-2)

### 1. Consolidate Input Components

**Current Issue**: Two similar input components with different behaviors and styling.

**Solution**: Create a unified `ChatInput` component.

```typescript
// components/ChatInput.tsx
'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { PaperAirplaneIcon, PaperClipIcon, PlusIcon } from '@heroicons/react/24/outline';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';

interface ChatInputProps {
  variant?: 'home' | 'chat';
  placeholder?: string;
  onSend: (message: string) => void;
  loading?: boolean;
  disabled?: boolean;
  error?: string | null;
  showAttachments?: boolean;
  maxHeight?: number;
  value?: string;
  onChange?: (value: string) => void;
}

export default function ChatInput({
  variant = 'chat',
  placeholder = "Ask your legal question…",
  onSend,
  loading = false,
  disabled = false,
  error = null,
  showAttachments = true,
  maxHeight = 240,
  value: controlledValue,
  onChange: controlledOnChange
}: ChatInputProps) {
  const [message, setMessage] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [showError, setShowError] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const liveRegionRef = useRef<HTMLDivElement>(null);

  // Handle controlled vs uncontrolled value
  const inputValue = controlledValue !== undefined ? controlledValue : message;
  const setInputValue = controlledOnChange || setMessage;

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, maxHeight) + 'px';
    }
  }, [inputValue, maxHeight]);

  // Error state
  useEffect(() => {
    if (error) {
      setShowError(true);
      setTimeout(() => setShowError(false), 1200);
    }
  }, [error]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    console.info('🟦 [chat_input][INFO] Files dropped:', acceptedFiles);
    // Handle file upload logic here
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    noClick: true,
  });

  const handleSend = async () => {
    if (inputValue.trim() && !loading && !disabled) {
      onSend(inputValue.trim());
      if (controlledOnChange) {
        controlledOnChange('');
      } else {
        setMessage('');
      }
      if (liveRegionRef.current) {
        liveRegionRef.current.textContent = 'Question sent. Awaiting AI response.';
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
    setIsTyping(true);
  };

  const handleBlur = () => setIsTyping(false);

  const isHomeVariant = variant === 'home';
  const containerClasses = clsx(
    'flex justify-center items-end',
    isDragActive && 'border-accent',
    showError && 'animate-shake'
  );

  const formClasses = clsx(
    'relative flex flex-col w-full',
    'rounded-2xl shadow-lg',
    isHomeVariant 
      ? 'bg-[#1A1C23] border border-[#2E303A]' 
      : 'bg-[#18181b] border border-gray-800',
    'px-4 py-3',
    'transition-all duration-150',
    error && 'border-[#E53E3E]',
    isDragActive && 'border-[#007BFF] shadow-[0_0_16px_#007BFF44]'
  );

  return (
    <motion.div className={containerClasses}>
      <div {...getRootProps()} className="w-full max-w-2xl relative">
        <form
          onSubmit={e => {
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
              'resize-none bg-transparent text-white text-base font-normal',
              'placeholder:italic placeholder:text-[#6E6F77] placeholder:font-semibold',
              'outline-none focus:ring-0',
              'min-h-[3rem]',
              'transition-colors duration-150',
              error ? 'border-[#E53E3E]' : 'focus:border-[#007BFF]'
            )}
            style={{
              border: 'none',
              boxShadow: 'none',
              padding: 0,
              margin: 0,
              lineHeight: '1.5',
              fontFamily: 'Inter, sans-serif',
            }}
            value={inputValue}
            onChange={e => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleBlur}
            placeholder={placeholder}
            disabled={loading || disabled}
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
                  className="p-2 text-gray-400 hover:text-white transition-colors"
                  aria-label="Upload document or image"
                >
                  {isHomeVariant ? <PlusIcon className="w-5 h-5" /> : <PaperClipIcon className="w-5 h-5" />}
                </button>
                <span className="absolute left-1/2 -translate-x-1/2 -top-8 bg-gray-900 text-xs text-white rounded px-2 py-1 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity">
                  Upload document or image
                </span>
              </div>
            )}
            
            {/* Right: Send Button */}
            <motion.button
              type="submit"
              className={clsx(
                'flex items-center justify-center rounded-full w-10 h-10',
                'bg-[#007BFF] text-white',
                'transition-all duration-150',
                inputValue.trim() && !loading ? 'animate-pulse' : 'opacity-50 cursor-not-allowed',
                loading && 'pointer-events-none'
              )}
              disabled={!inputValue.trim() || loading || disabled}
              whileHover={inputValue.trim() && !loading ? { scale: 1.08 } : {}}
              whileTap={inputValue.trim() && !loading ? { scale: 0.95 } : {}}
              aria-label="Send"
            >
              {loading ? (
                <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24">
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
                <PaperAirplaneIcon className="w-5 h-5" />
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
                className="absolute left-0 right-0 -top-8 text-center text-[#E53E3E] text-sm"
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
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-white text-lg rounded-2xl">
            Drop files to attach
          </div>
        )}
      </div>
    </motion.div>
  );
}
```

**Update existing components to use the new unified component:**

```typescript
// app/page.tsx - Update the InputBar usage
import ChatInput from './components/ChatInput';

// Replace InputBar with ChatInput
<ChatInput 
  variant="home"
  onSend={handleFirstPrompt} 
  loading={loadingFirstPrompt} 
  error={sendError}
  showAttachments={true}
/>

// app/c/[chatId]/page.tsx - Update ChatInputBox usage
import ChatInput from '../../components/ChatInput';

// Replace ChatInputBox with ChatInput
<ChatInput
  variant="chat"
  value={input}
  onChange={setInput}
  onSend={handleSend}
  loading={loadingAI}
  error={sendError}
  showAttachments={true}
/>
```

### 2. Add Error Boundaries

```typescript
// components/ErrorBoundary.tsx
'use client';

import React from 'react';
import { AlertTriangleIcon, RefreshCwIcon } from 'lucide-react';

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error: Error | null; onRetry: () => void }>;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('🟥 [error_boundary][ERROR]', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack
    });
    
    // Send to error tracking service
    // ErrorTracker.captureException(error, { componentStack: errorInfo.componentStack });
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        const FallbackComponent = this.props.fallback;
        return <FallbackComponent error={this.state.error} onRetry={this.handleRetry} />;
      }
      
      return <DefaultErrorFallback error={this.state.error} onRetry={this.handleRetry} />;
    }

    return this.props.children;
  }
}

function DefaultErrorFallback({ error, onRetry }: { error: Error | null; onRetry: () => void }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-black">
      <div className="max-w-md mx-auto text-center p-6">
        <AlertTriangleIcon className="w-16 h-16 text-red-500 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-white mb-2">Something went wrong</h2>
        <p className="text-gray-400 mb-4">
          {error?.message || 'An unexpected error occurred. Please try again.'}
        </p>
        <button
          onClick={onRetry}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <RefreshCwIcon className="w-4 h-4" />
          Try Again
        </button>
      </div>
    </div>
  );
}

// Usage in layout
// app/layout.tsx
import { ErrorBoundary } from './components/ErrorBoundary';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.variable} antialiased bg-background text-white`}>
        <NextAuthSessionProvider>
          <ErrorBoundary>
            <RootLayoutClient>
              {children}
            </RootLayoutClient>
          </ErrorBoundary>
        </NextAuthSessionProvider>
      </body>
    </html>
  );
}
```

### 3. Implement Structured Logging

```typescript
// lib/logger.ts
import pino from 'pino';

const isDevelopment = process.env.NODE_ENV === 'development';

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  formatters: {
    level: (label) => ({ level: label }),
    log: (object) => object
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  transport: isDevelopment ? {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:standard',
      ignore: 'pid,hostname'
    }
  } : undefined
});

export const createRequestLogger = (reqId: string) => {
  return logger.child({ reqId });
};

// Log levels with emoji for visual distinction
export const logLevels = {
  info: (message: string, data?: any) => logger.info({ message, ...data }),
  success: (message: string, data?: any) => logger.info({ message: `✅ ${message}`, ...data }),
  warning: (message: string, data?: any) => logger.warn({ message: `⚠️ ${message}`, ...data }),
  error: (message: string, data?: any) => logger.error({ message: `❌ ${message}`, ...data }),
  debug: (message: string, data?: any) => logger.debug({ message: `🔍 ${message}`, ...data })
};

// Usage in API routes
// app/api/query/route.ts
import { logLevels, createRequestLogger } from '@/lib/logger';

export async function POST(req: NextRequest) {
  const reqId = crypto.randomUUID();
  const log = createRequestLogger(reqId);
  
  try {
    const { query, userId, sessionId } = await req.json();
    log.info('🟦 [chatbot][INFO] Received request', { query, userId, sessionId });
    
    if (!query) {
      log.error('🟥 [chatbot][ERROR] Missing query');
      return NextResponse.json({ error: "Missing query" }, { status: 400 });
    }
    
    // ... rest of the logic
    
    log.success('🟩 [chatbot][SUCCESS] Response generated successfully');
  } catch (err: any) {
    log.error('🟥 [chatbot][ERROR] Unhandled error', { error: err.message, stack: err.stack });
    return NextResponse.json({ error: err.message || "Internal error" }, { status: 500 });
  }
}
```

### 4. Add Input Validation

```typescript
// lib/validation.ts
import { z } from 'zod';
import DOMPurify from 'dompurify';

// Message validation schema
export const messageSchema = z.object({
  content: z.string()
    .min(1, 'Message cannot be empty')
    .max(10000, 'Message too long')
    .transform(val => DOMPurify.sanitize(val)),
  sessionId: z.string().uuid('Invalid session ID'),
  userId: z.string().uuid('Invalid user ID')
});

// Chat session creation schema
export const chatSessionSchema = z.object({
  firstMessage: z.string().min(1, 'First message is required'),
  userId: z.string().uuid('Invalid user ID')
});

// Feedback schema
export const feedbackSchema = z.object({
  sessionId: z.string().uuid('Invalid session ID'),
  userId: z.string().uuid('Invalid user ID'),
  rating: z.number().min(-1).max(1),
  messageIndex: z.number().optional(),
  messageId: z.string().optional(),
  comments: z.string().optional()
});

// Validation middleware
export function validateRequest<T>(schema: z.ZodSchema<T>) {
  return async (req: NextRequest): Promise<{ success: true; data: T } | { success: false; error: string }> => {
    try {
      const body = await req.json();
      const data = schema.parse(body);
      return { success: true, data };
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errorMessage = error.errors.map(e => e.message).join(', ');
        return { success: false, error: errorMessage };
      }
      return { success: false, error: 'Invalid request data' };
    }
  };
}

// Usage in API routes
// app/api/query/route.ts
import { validateRequest, messageSchema } from '@/lib/validation';

export async function POST(req: NextRequest) {
  const validation = await validateRequest(messageSchema)(req);
  
  if (!validation.success) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }
  
  const { content, sessionId, userId } = validation.data;
  // ... rest of the logic
}
```

## 🔧 Phase 2: Performance & Security (Week 3-4)

### 1. Implement Caching Strategy

```typescript
// lib/cache.ts
export class CacheManager {
  private static instance: CacheManager;
  private cache = new Map<string, { data: any; timestamp: number; ttl: number }>();

  static getInstance(): CacheManager {
    if (!CacheManager.instance) {
      CacheManager.instance = new CacheManager();
    }
    return CacheManager.instance;
  }

  set(key: string, data: any, ttl = 5 * 60 * 1000): void {
    this.cache.set(key, { data, timestamp: Date.now(), ttl });
  }

  get(key: string): any | null {
    const item = this.cache.get(key);
    if (!item) return null;
    
    if (Date.now() - item.timestamp > item.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    return item.data;
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }
}

// hooks/useCachedQuery.ts
import { useState, useEffect } from 'react';
import { CacheManager } from '@/lib/cache';

export function useCachedQuery<T>(
  key: string, 
  fetcher: () => Promise<T>, 
  ttl = 5 * 60 * 1000,
  dependencies: any[] = []
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const cache = CacheManager.getInstance();

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Check cache first
        const cached = cache.get(key);
        if (cached) {
          setData(cached);
          setLoading(false);
          return;
        }

        // Fetch fresh data
        const result = await fetcher();
        cache.set(key, result, ttl);
        setData(result);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [key, ttl, ...dependencies]);

  return { data, loading, error };
}

// Usage in components
// app/components/Sidebar.tsx
import { useCachedQuery } from '@/hooks/useCachedQuery';

export default function Sidebar({ /* props */ }) {
  const { data: chats, loading, error } = useCachedQuery(
    `chats-${session?.user?.id}`,
    () => axios.get('/api/user_chats', { params: { userId: session?.user?.id } })
      .then(res => res.data.chats || []),
    [session?.user?.id]
  );

  // ... rest of component
}
```

### 2. Add Rate Limiting

```typescript
// lib/rateLimit.ts
import { NextRequest, NextResponse } from 'next/server';

interface RateLimitConfig {
  windowMs: number;
  max: number;
  message?: string;
}

class RateLimiter {
  private requests = new Map<string, { count: number; resetTime: number }>();

  constructor(private config: RateLimitConfig) {}

  check(identifier: string): { allowed: boolean; remaining: number; resetTime: number } {
    const now = Date.now();
    const record = this.requests.get(identifier);

    if (!record || now > record.resetTime) {
      // Reset or create new record
      this.requests.set(identifier, {
        count: 1,
        resetTime: now + this.config.windowMs
      });
      return { allowed: true, remaining: this.config.max - 1, resetTime: now + this.config.windowMs };
    }

    if (record.count >= this.config.max) {
      return { allowed: false, remaining: 0, resetTime: record.resetTime };
    }

    record.count++;
    return { allowed: true, remaining: this.config.max - record.count, resetTime: record.resetTime };
  }
}

const rateLimiters = new Map<string, RateLimiter>();

export function createRateLimiter(name: string, config: RateLimitConfig) {
  if (!rateLimiters.has(name)) {
    rateLimiters.set(name, new RateLimiter(config));
  }
  return rateLimiters.get(name)!;
}

export function withRateLimit(
  name: string,
  config: RateLimitConfig,
  getIdentifier: (req: NextRequest) => string
) {
  return function(handler: (req: NextRequest) => Promise<NextResponse>) {
    return async function(req: NextRequest) {
      const limiter = createRateLimiter(name, config);
      const identifier = getIdentifier(req);
      const result = limiter.check(identifier);

      if (!result.allowed) {
        return NextResponse.json(
          { error: config.message || 'Too many requests' },
          { 
            status: 429,
            headers: {
              'X-RateLimit-Limit': config.max.toString(),
              'X-RateLimit-Remaining': result.remaining.toString(),
              'X-RateLimit-Reset': result.resetTime.toString(),
              'Retry-After': Math.ceil(config.windowMs / 1000).toString()
            }
          }
        );
      }

      const response = await handler(req);
      
      // Add rate limit headers
      response.headers.set('X-RateLimit-Limit', config.max.toString());
      response.headers.set('X-RateLimit-Remaining', result.remaining.toString());
      response.headers.set('X-RateLimit-Reset', result.resetTime.toString());
      
      return response;
    };
  };
}

// Usage in API routes
// app/api/query/route.ts
import { withRateLimit } from '@/lib/rateLimit';

const rateLimitedHandler = withRateLimit(
  'query-api',
  { windowMs: 15 * 60 * 1000, max: 100, message: 'Too many requests' },
  (req) => {
    // Use IP address or user ID as identifier
    return req.ip || req.headers.get('x-forwarded-for') || 'unknown';
  }
);

export const POST = rateLimitedHandler(async (req: NextRequest) => {
  // ... existing logic
});
```

### 3. Optimize Bundle Size

```javascript
// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    optimizePackageImports: ['@heroicons/react', 'framer-motion', 'lucide-react']
  },
  webpack: (config, { dev, isServer }) => {
    // Optimize bundle splitting
    if (!dev && !isServer) {
      config.optimization.splitChunks = {
        chunks: 'all',
        cacheGroups: {
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            chunks: 'all',
            priority: 10
          },
          common: {
            name: 'common',
            minChunks: 2,
            chunks: 'all',
            priority: 5
          }
        }
      };
    }

    return config;
  },
  images: {
    domains: ['localhost'],
    formats: ['image/webp', 'image/avif']
  },
  compress: true,
  poweredByHeader: false
};

module.exports = nextConfig;
```

```typescript
// Dynamic imports for heavy components
// app/c/[chatId]/page.tsx
import dynamic from 'next/dynamic';

const SyntaxHighlighter = dynamic(
  () => import('react-syntax-highlighter').then(mod => ({ default: mod.Prism })),
  {
    ssr: false,
    loading: () => <div className="h-8 bg-gray-800 animate-pulse rounded" />
  }
);

const ReactMarkdown = dynamic(() => import('react-markdown'), {
  loading: () => <div className="h-4 bg-gray-800 animate-pulse rounded mb-2" />
});
```

## 🧪 Phase 3: Testing & Quality Assurance (Week 5-6)

### 1. Component Testing

```typescript
// __tests__/components/ChatInput.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ChatInput from '@/components/ChatInput';

describe('ChatInput', () => {
  const mockOnSend = jest.fn();

  beforeEach(() => {
    mockOnSend.mockClear();
  });

  it('should render with default props', () => {
    render(<ChatInput onSend={mockOnSend} />);
    
    expect(screen.getByRole('textbox')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /send/i })).toBeInTheDocument();
  });

  it('should send message on Enter key', async () => {
    const user = userEvent.setup();
    render(<ChatInput onSend={mockOnSend} />);
    
    const input = screen.getByRole('textbox');
    await user.type(input, 'Test message');
    await user.keyboard('{Enter}');
    
    expect(mockOnSend).toHaveBeenCalledWith('Test message');
  });

  it('should not send empty message', async () => {
    const user = userEvent.setup();
    render(<ChatInput onSend={mockOnSend} />);
    
    const input = screen.getByRole('textbox');
    await user.keyboard('{Enter}');
    
    expect(mockOnSend).not.toHaveBeenCalled();
  });

  it('should show loading state', () => {
    render(<ChatInput onSend={mockOnSend} loading={true} />);
    
    const sendButton = screen.getByRole('button', { name: /send/i });
    expect(sendButton).toBeDisabled();
    expect(sendButton).toHaveClass('pointer-events-none');
  });

  it('should show error message', async () => {
    render(<ChatInput onSend={mockOnSend} error="Something went wrong" />);
    
    await waitFor(() => {
      expect(screen.getByText('Oops, something went wrong. Please try again.')).toBeInTheDocument();
    });
  });

  it('should handle different variants', () => {
    const { rerender } = render(<ChatInput onSend={mockOnSend} variant="home" />);
    expect(screen.getByPlaceholderText('Ask your legal question…')).toBeInTheDocument();
    
    rerender(<ChatInput onSend={mockOnSend} variant="chat" />);
    expect(screen.getByPlaceholderText('Ask your legal question…')).toBeInTheDocument();
  });
});
```

### 2. API Route Testing

```typescript
// __tests__/api/query.test.ts
import { createMocks } from 'node-mocks-http';
import { POST } from '@/app/api/query/route';
import { prisma } from '@/lib/prisma';

// Mock dependencies
jest.mock('@/lib/prisma', () => ({
  prisma: {
    ragQueryLog: {
      create: jest.fn()
    }
  }
}));

jest.mock('@/lib/firestore', () => ({
  __esModule: true,
  default: {
    collection: jest.fn(() => ({
      add: jest.fn()
    }))
  }
}));

describe('/api/query', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return 400 for missing query', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      body: { userId: 'test-user', sessionId: 'test-session' }
    });

    await POST(req);

    expect(res._getStatusCode()).toBe(400);
    expect(JSON.parse(res._getData())).toEqual({
      error: 'Missing query'
    });
  });

  it('should return 400 for missing userId', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      body: { query: 'test query', sessionId: 'test-session' }
    });

    await POST(req);

    expect(res._getStatusCode()).toBe(400);
  });

  it('should handle DeepSeek API errors', async () => {
    // Mock axios to throw an error
    jest.doMock('axios', () => ({
      __esModule: true,
      default: jest.fn().mockRejectedValue({
        response: {
          data: {
            error: {
              message: 'Insufficient Balance'
            }
          }
        }
      })
    }));

    const { req, res } = createMocks({
      method: 'POST',
      body: { 
        query: 'test query', 
        userId: 'test-user', 
        sessionId: 'test-session' 
      }
    });

    await POST(req);

    expect(res._getStatusCode()).toBe(402);
    expect(JSON.parse(res._getData())).toEqual({
      error: 'DeepSeek API: Insufficient balance. Please check your account credits.'
    });
  });
});
```

### 3. Integration Testing

```typescript
// __tests__/integration/chat-flow.test.ts
import { test, expect } from '@playwright/test';

test.describe('Chat Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Mock authentication
    await page.addInitScript(() => {
      window.localStorage.setItem('mock-auth', 'true');
    });
  });

  test('complete chat flow', async ({ page }) => {
    await page.goto('/');
    
    // Type a message
    await page.fill('[data-testid="chat-input"]', 'What is a contract?');
    await page.keyboard.press('Enter');
    
    // Wait for AI response
    await expect(page.locator('[data-testid="ai-response"]')).toBeVisible();
    await expect(page.locator('[data-testid="ai-response"]')).toContainText('contract');
    
    // Test feedback
    await page.click('[data-testid="feedback-good"]');
    await expect(page.locator('[data-testid="feedback-thanks"]')).toBeVisible();
  });

  test('regenerate response', async ({ page }) => {
    await page.goto('/c/test-session');
    
    // Wait for messages to load
    await page.waitForSelector('[data-testid="message"]');
    
    // Click regenerate button
    await page.click('[data-testid="regenerate-button"]');
    
    // Wait for new response
    await expect(page.locator('[data-testid="ai-response"]')).toBeVisible();
  });

  test('copy response', async ({ page }) => {
    await page.goto('/c/test-session');
    
    // Mock clipboard API
    await page.addInitScript(() => {
      Object.assign(navigator, {
        clipboard: {
          writeText: jest.fn()
        }
      });
    });
    
    // Click copy button
    await page.click('[data-testid="copy-button"]');
    
    // Verify clipboard was called
    await expect(page.locator('[data-testid="copy-success"]')).toBeVisible();
  });
});
```

## 📋 Implementation Checklist

### Week 1-2: Immediate Improvements
- [ ] Create unified `ChatInput` component
- [ ] Replace `InputBar` and `ChatInputBox` with new component
- [ ] Add `ErrorBoundary` component
- [ ] Implement structured logging
- [ ] Add input validation schemas
- [ ] Update API routes to use validation

### Week 3-4: Performance & Security
- [ ] Implement `CacheManager` class
- [ ] Add `useCachedQuery` hook
- [ ] Implement rate limiting middleware
- [ ] Optimize Next.js configuration
- [ ] Add dynamic imports for heavy components
- [ ] Update components to use caching

### Week 5-6: Testing & Quality
- [ ] Write component tests for `ChatInput`
- [ ] Write API route tests
- [ ] Set up Playwright for E2E testing
- [ ] Add test coverage reporting
- [ ] Create CI/CD pipeline
- [ ] Performance testing

### Week 7-8: Advanced Features
- [ ] Real-time collaboration features
- [ ] Advanced document analysis
- [ ] Search and filtering
- [ ] Mobile responsiveness improvements
- [ ] Accessibility enhancements

## 🎯 Success Metrics

- **Performance**: Bundle size reduced by 30%
- **Reliability**: 99.9% uptime with proper error handling
- **User Experience**: Faster response times with caching
- **Security**: All inputs validated and sanitized
- **Maintainability**: 90% test coverage
- **Accessibility**: WCAG 2.1 AA compliance

This implementation plan provides a structured approach to improving the DocBare codebase with specific, actionable steps and code examples for each improvement. 