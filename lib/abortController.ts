/**
 * AbortController Utilities
 * Provides utilities for request cancellation and timeout handling
 */

export interface AbortControllerOptions {
  timeout?: number; // Timeout in milliseconds
  reason?: string; // Reason for abort
}

/**
 * Creates an AbortController with optional timeout
 */
export function createAbortController(options: AbortControllerOptions = {}): {
  controller: AbortController;
  cleanup: () => void;
} {
  const { timeout = 30000, reason = 'Request timeout' } = options;
  
  const controller = new AbortController();
  let timeoutId: NodeJS.Timeout | null = null;
  
  // Set up timeout if specified
  if (timeout > 0) {
    timeoutId = setTimeout(() => {
      controller.abort(reason);
    }, timeout);
  }
  
  const cleanup = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
  };
  
  return { controller, cleanup };
}

/**
 * Creates an AbortController that aborts when the provided signal is aborted
 */
export function createLinkedAbortController(
  parentSignal?: AbortSignal,
  options: AbortControllerOptions = {}
): {
  controller: AbortController;
  cleanup: () => void;
} {
  const { controller, cleanup: timeoutCleanup } = createAbortController(options);
  
  let parentCleanup: (() => void) | null = null;
  
  // Link to parent signal if provided
  if (parentSignal) {
    const handleAbort = () => {
      controller.abort(parentSignal.reason || 'Parent request aborted');
    };
    
    if (parentSignal.aborted) {
      // Parent is already aborted
      controller.abort(parentSignal.reason || 'Parent request already aborted');
    } else {
      // Listen for parent abort
      parentSignal.addEventListener('abort', handleAbort);
      parentCleanup = () => {
        parentSignal.removeEventListener('abort', handleAbort);
      };
    }
  }
  
  const cleanup = () => {
    timeoutCleanup();
    if (parentCleanup) {
      parentCleanup();
    }
  };
  
  return { controller, cleanup };
}

/**
 * Wraps a fetch request with proper abort handling
 */
export async function fetchWithAbort(
  url: string,
  options: RequestInit & { timeout?: number } = {}
): Promise<Response> {
  const { timeout = 30000, signal, ...fetchOptions } = options;
  
  // Create abort controller with timeout
  const { controller, cleanup } = createLinkedAbortController(signal || undefined, { timeout });
  
  try {
    const response = await fetch(url, {
      ...fetchOptions,
      signal: controller.signal,
    });
    
    cleanup();
    return response;
  } catch (error) {
    cleanup();
    throw error;
  }
}

/**
 * Checks if an error is an abort error
 */
export function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError';
}

/**
 * Gets a user-friendly error message for abort errors
 */
export function getAbortErrorMessage(error: unknown): string {
  if (isAbortError(error)) {
    const abortError = error as Error & { reason?: string };
    if (abortError.reason) {
      return abortError.reason;
    }
    return 'Request was cancelled or timed out';
  }
  return 'An unexpected error occurred';
}

/**
 * Creates a timeout promise that rejects after the specified time
 */
export function createTimeoutPromise(timeout: number, reason?: string): Promise<never> {
  return new Promise((_, reject) => {
    setTimeout(() => {
      reject(new Error(reason || `Operation timed out after ${timeout}ms`));
    }, timeout);
  });
}

/**
 * Wraps a promise with a timeout
 */
export function withTimeout<T>(
  promise: Promise<T>,
  timeout: number,
  reason?: string
): Promise<T> {
  return Promise.race([
    promise,
    createTimeoutPromise(timeout, reason)
  ]);
}
