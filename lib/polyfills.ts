// Polyfills for server-side compatibility

// Polyfill for 'self' global variable (used by some browser APIs)
if (typeof global !== 'undefined' && typeof global.self === 'undefined') {
  (global as any).self = global;
}

// Polyfill for 'window' global variable
if (typeof global !== 'undefined' && typeof global.window === 'undefined') {
  (global as any).window = undefined;
}

// Polyfill for 'document' global variable
if (typeof global !== 'undefined' && typeof global.document === 'undefined') {
  (global as any).document = undefined;
}

// Polyfill for 'navigator' global variable
if (typeof global !== 'undefined' && typeof global.navigator === 'undefined') {
  (global as any).navigator = {
    userAgent: 'Node.js',
    platform: 'node',
  };
}

// Polyfill for 'location' global variable
if (typeof global !== 'undefined' && typeof global.location === 'undefined') {
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

export {};
