// Polyfills for server-side compatibility

// Ensure global is available
if (typeof global === 'undefined') {
  (globalThis as any).global = globalThis;
}

// Polyfill for 'self' global variable (used by some browser APIs)
if (typeof global !== 'undefined') {
  (global as any).self = global;
}

// Also set self on globalThis for broader compatibility
if (typeof globalThis !== 'undefined') {
  (globalThis as any).self = globalThis;
}

// Polyfill for 'window' global variable
if (typeof global !== 'undefined') {
  (global as any).window = undefined;
}

// Polyfill for 'document' global variable
if (typeof global !== 'undefined') {
  (global as any).document = undefined;
}

// Polyfill for 'navigator' global variable
if (typeof global !== 'undefined') {
  (global as any).navigator = {
    userAgent: 'Node.js',
    platform: 'node',
  };
}

// Polyfill for 'location' global variable
if (typeof global !== 'undefined') {
  (global as any).location = {
    href: 'http://localhost:3000',
    origin: 'http://localhost:3000',
    protocol: 'http:',
    host: 'localhost:3000',
    hostname: 'localhost',
    port: '3000',
    pathname: '/',
    search: '',
    hash: '',
  };
}

// Ensure self is available globally
if (typeof global !== 'undefined' && typeof global.self === 'undefined') {
  (global as any).self = global;
}

// Handle any remaining self references
if (typeof global !== 'undefined') {
  Object.defineProperty(global, 'self', {
    value: global,
    writable: false,
    configurable: false,
  });
}

export {};
