import '@testing-library/jest-dom'

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: jest.fn(),
      replace: jest.fn(),
      prefetch: jest.fn(),
      back: jest.fn(),
      forward: jest.fn(),
      refresh: jest.fn(),
    }
  },
  useSearchParams() {
    return new URLSearchParams()
  },
  usePathname() {
    return '/'
  },
}))

// Mock Next.js image component
jest.mock('next/image', () => ({
  __esModule: true,
  default: (props) => {
    // eslint-disable-next-line @next/next/no-img-element
    return <img {...props} />
  },
}))

// Mock environment variables
process.env.NODE_ENV = 'test'
process.env.DEEPSEEK_API_KEY = 'test-api-key'
process.env.NEXTAUTH_SECRET = 'test-secret'
process.env.NEXTAUTH_URL = 'http://localhost:3000'

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  // Uncomment to ignore a specific log level
  // log: jest.fn(),
  // debug: jest.fn(),
  // info: jest.fn(),
  // warn: jest.fn(),
  // error: jest.fn(),
}

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
})

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
}

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
}

// Mock fetch
global.fetch = jest.fn()

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
}
global.localStorage = localStorageMock

// Mock sessionStorage
const sessionStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
}
global.sessionStorage = sessionStorageMock

// Mock clipboard API
Object.assign(navigator, {
  clipboard: {
    writeText: jest.fn(),
    readText: jest.fn(),
  },
})

// Mock Web APIs
global.URL.createObjectURL = jest.fn()
global.URL.revokeObjectURL = jest.fn()

// Mock crypto API
Object.defineProperty(global, 'crypto', {
  value: {
    getRandomValues: jest.fn(),
    randomUUID: jest.fn(() => 'test-uuid'),
  },
})

// Mock TextEncoder/TextDecoder
const { TextEncoder, TextDecoder } = require('util');
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// Mock AbortController
global.AbortController = class AbortController {
  constructor() {
    this.signal = {
      aborted: false,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    }
  }
  abort() {
    this.signal.aborted = true
  }
}

// Mock ReadableStream
global.ReadableStream = class ReadableStream {
  constructor(source) {
    this.source = source
  }
  getReader() {
    return {
      read: jest.fn(),
      cancel: jest.fn(),
      releaseLock: jest.fn(),
    }
  }
}

// Mock WritableStream
global.WritableStream = class WritableStream {
  constructor(sink) {
    this.sink = sink
  }
  getWriter() {
    return {
      write: jest.fn(),
      close: jest.fn(),
      abort: jest.fn(),
      releaseLock: jest.fn(),
    }
  }
}

// Mock TransformStream
global.TransformStream = class TransformStream {
  constructor(transformer) {
    this.transformer = transformer
  }
  get readable() {
    return new ReadableStream()
  }
  get writable() {
    return new WritableStream()
  }
} 