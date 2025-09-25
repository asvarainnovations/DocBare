import pino from 'pino';

// Create logger instance - Next.js compatible without worker threads
const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  base: {
    env: process.env.NODE_ENV,
    version: process.env.npm_package_version,
  },
  // Pretty print in development mode using proper pino-pretty configuration
  ...(process.env.NODE_ENV === 'development' && {
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'SYS:standard',
        ignore: 'pid,hostname',
        singleLine: false,
        hideObject: false,
        messageFormat: '{context} {msg}',
        customPrettifiers: {
          time: (timestamp: string) => `🕐 ${timestamp}`,
        }
      }
    }
  }),
  // Simplified formatting to avoid webpack issues
  timestamp: () => `,"time":"${new Date().toISOString()}"`,
});

// Enhanced logger with context
export class Logger {
  private context: string;

  constructor(context: string) {
    this.context = context;
  }

  trace(message: string, data?: any) {
    logger.trace({ context: this.context, ...data }, message);
  }

  debug(message: string, data?: any) {
    logger.debug({ context: this.context, ...data }, message);
  }

  info(message: string, data?: any) {
    logger.info({ context: this.context, ...data }, message);
  }

  warn(message: string, data?: any) {
    logger.warn({ context: this.context, ...data }, message);
  }

  error(message: string, error?: Error | any, data?: any) {
    const logData = {
      context: this.context,
      ...data,
      ...(error instanceof Error ? {
        error: {
          name: error.name,
          message: error.message,
          stack: error.stack,
        }
      } : { error })
    };
    logger.error(logData, message);
  }

  fatal(message: string, error?: Error | any, data?: any) {
    const logData = {
      context: this.context,
      ...data,
      ...(error instanceof Error ? {
        error: {
          name: error.name,
          message: error.message,
          stack: error.stack,
        }
      } : { error })
    };
    logger.fatal(logData, message);
  }

  // Success method for positive outcomes
  success(message: string, data?: any) {
    logger.info({ context: this.context, type: 'success', ...data }, `✅ ${message}`);
  }

  // API request/response logging
  apiRequest(method: string, url: string, data?: any) {
    logger.info({ 
      context: this.context, 
      type: 'api_request',
      method,
      url,
      ...data 
    }, `📡 API Request: ${method} ${url}`);
  }

  apiResponse(method: string, url: string, statusCode: number, duration?: number, data?: any) {
    const emoji = statusCode >= 400 ? '🟥' : '✅';
    logger.info({ 
      context: this.context, 
      type: 'api_response',
      method,
      url,
      statusCode,
      duration,
      ...data 
    }, `${emoji} API Response: ${method} ${url} - ${statusCode}${duration ? ` (${duration}ms)` : ''}`);
  }

  // Database operation logging
  dbQuery(operation: string, table: string, duration?: number, data?: any) {
    logger.debug({ 
      context: this.context, 
      type: 'db_query',
      operation,
      table,
      duration,
      ...data 
    }, `🗄️ DB Query: ${operation} on ${table}${duration ? ` (${duration}ms)` : ''}`);
  }

  // AI/LLM operation logging
  aiRequest(provider: string, model: string, data?: any) {
    logger.info({ 
      context: this.context, 
      type: 'ai_request',
      provider,
      model,
      ...data 
    }, `🤖 AI Request: ${provider}/${model}`);
  }

  aiResponse(provider: string, model: string, duration?: number, data?: any) {
    logger.info({ 
      context: this.context, 
      type: 'ai_response',
      provider,
      model,
      duration,
      ...data 
    }, `🤖 AI Response: ${provider}/${model}${duration ? ` (${duration}ms)` : ''}`);
  }

  // User action logging
  userAction(userId: string, action: string, data?: any) {
    logger.info({ 
      context: this.context, 
      type: 'user_action',
      userId,
      action,
      ...data 
    }, `👤 User Action: ${action} by ${userId}`);
  }

  // Performance logging
  performance(operation: string, duration: number, data?: any) {
    const level = duration > 1000 ? 'warn' : 'debug';
    logger[level]({ 
      context: this.context, 
      type: 'performance',
      operation,
      duration,
      ...data 
    }, `⚡ Performance: ${operation} took ${duration}ms`);
  }
}

// Create logger instances for different contexts
export const createLogger = (context: string) => new Logger(context);

// Default loggers for common contexts
export const apiLogger = createLogger('API');
export const dbLogger = createLogger('DATABASE');
export const aiLogger = createLogger('AI');
export const authLogger = createLogger('AUTH');
export const uploadLogger = createLogger('UPLOAD');
export const chatLogger = createLogger('CHAT');

// Export the base logger for direct use
export default logger; 