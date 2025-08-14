import { aiLogger } from './logger';

export interface ContextOptimizationConfig {
  maxTotalTokens: number;
  maxSystemPromptTokens: number;
  maxMemoryTokens: number;
  maxDocumentTokens: number;
  maxKnowledgeBaseTokens: number;
  maxQueryTokens: number;
}

export interface OptimizedContext {
  systemPrompt: string;
  memoryContext: string;
  documentContext: string;
  knowledgeBaseContext: string;
  query: string;
  totalTokens: number;
  optimizationApplied: boolean;
}

export class ContextOptimizer {
  private static readonly DEFAULT_CONFIG: ContextOptimizationConfig = {
    maxTotalTokens: 32000, // DeepSeek context limit with safety margin
    maxSystemPromptTokens: 4000,
    maxMemoryTokens: 8000,
    maxDocumentTokens: 12000,
    maxKnowledgeBaseTokens: 4000,
    maxQueryTokens: 2000,
  };

  /**
   * Estimate tokens in text (rough approximation: 1 token ≈ 4 characters)
   */
  private static estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }

  /**
   * Truncate text to fit within token limit while preserving structure
   */
  private static truncateText(text: string, maxTokens: number, preserveStart: boolean = true): string {
    const estimatedTokens = this.estimateTokens(text);
    
    if (estimatedTokens <= maxTokens) {
      return text;
    }

    const maxChars = maxTokens * 4;
    
    if (preserveStart) {
      // Truncate from end, preserving start
      const truncated = text.substring(0, maxChars - 100); // Leave room for "..."
      return truncated + '\n\n[Content truncated due to length limits]';
    } else {
      // Truncate from start, preserving end
      const truncated = text.substring(text.length - maxChars + 100);
      return '[Content truncated due to length limits]\n\n' + truncated;
    }
  }

  /**
   * Optimize context to fit within token limits
   */
  static optimizeContext(
    systemPrompt: string,
    memoryContext: string = '',
    documentContext: string = '',
    knowledgeBaseContext: string = '',
    query: string = '',
    config: Partial<ContextOptimizationConfig> = {}
  ): OptimizedContext {
    const finalConfig = { ...this.DEFAULT_CONFIG, ...config };
    
    // Calculate current token usage
    const currentTokens = {
      systemPrompt: this.estimateTokens(systemPrompt),
      memoryContext: this.estimateTokens(memoryContext),
      documentContext: this.estimateTokens(documentContext),
      knowledgeBaseContext: this.estimateTokens(knowledgeBaseContext),
      query: this.estimateTokens(query),
    };

    const totalCurrentTokens = Object.values(currentTokens).reduce((sum, tokens) => sum + tokens, 0);
    
    aiLogger.info("🟦 [context][INFO] Context optimization analysis", {
      currentTokens,
      totalCurrentTokens,
      maxTotalTokens: finalConfig.maxTotalTokens,
      needsOptimization: totalCurrentTokens > finalConfig.maxTotalTokens
    });

    // If we're within limits, return as-is
    if (totalCurrentTokens <= finalConfig.maxTotalTokens) {
      return {
        systemPrompt,
        memoryContext,
        documentContext,
        knowledgeBaseContext,
        query,
        totalTokens: totalCurrentTokens,
        optimizationApplied: false,
      };
    }

    // Apply optimization strategies
    let optimizationApplied = false;
    let optimizedSystemPrompt = systemPrompt;
    let optimizedMemoryContext = memoryContext;
    let optimizedDocumentContext = documentContext;
    let optimizedKnowledgeBaseContext = knowledgeBaseContext;
    let optimizedQuery = query;

    // Strategy 1: Truncate document context first (usually largest)
    if (currentTokens.documentContext > finalConfig.maxDocumentTokens) {
      optimizedDocumentContext = this.truncateText(
        documentContext,
        finalConfig.maxDocumentTokens,
        true // Preserve start of document
      );
      optimizationApplied = true;
      aiLogger.info("🟨 [context][WARN] Document context truncated", {
        originalTokens: currentTokens.documentContext,
        optimizedTokens: this.estimateTokens(optimizedDocumentContext)
      });
    }

    // Strategy 2: Truncate memory context
    if (currentTokens.memoryContext > finalConfig.maxMemoryTokens) {
      optimizedMemoryContext = this.truncateText(
        memoryContext,
        finalConfig.maxMemoryTokens,
        false // Preserve end (most recent memories)
      );
      optimizationApplied = true;
      aiLogger.info("🟨 [context][WARN] Memory context truncated", {
        originalTokens: currentTokens.memoryContext,
        optimizedTokens: this.estimateTokens(optimizedMemoryContext)
      });
    }

    // Strategy 3: Truncate knowledge base context
    if (currentTokens.knowledgeBaseContext > finalConfig.maxKnowledgeBaseTokens) {
      optimizedKnowledgeBaseContext = this.truncateText(
        knowledgeBaseContext,
        finalConfig.maxKnowledgeBaseTokens,
        true // Preserve start of knowledge base
      );
      optimizationApplied = true;
      aiLogger.info("🟨 [context][WARN] Knowledge base context truncated", {
        originalTokens: currentTokens.knowledgeBaseContext,
        optimizedTokens: this.estimateTokens(optimizedKnowledgeBaseContext)
      });
    }

    // Strategy 4: Truncate system prompt if still needed
    if (currentTokens.systemPrompt > finalConfig.maxSystemPromptTokens) {
      optimizedSystemPrompt = this.truncateText(
        systemPrompt,
        finalConfig.maxSystemPromptTokens,
        true // Preserve start of system prompt
      );
      optimizationApplied = true;
      aiLogger.info("🟨 [context][WARN] System prompt truncated", {
        originalTokens: currentTokens.systemPrompt,
        optimizedTokens: this.estimateTokens(optimizedSystemPrompt)
      });
    }

    // Strategy 5: Truncate query if still needed
    if (currentTokens.query > finalConfig.maxQueryTokens) {
      optimizedQuery = this.truncateText(
        query,
        finalConfig.maxQueryTokens,
        true // Preserve start of query
      );
      optimizationApplied = true;
      aiLogger.info("🟨 [context][WARN] Query truncated", {
        originalTokens: currentTokens.query,
        optimizedTokens: this.estimateTokens(optimizedQuery)
      });
    }

    // Calculate final token usage
    const finalTokens = {
      systemPrompt: this.estimateTokens(optimizedSystemPrompt),
      memoryContext: this.estimateTokens(optimizedMemoryContext),
      documentContext: this.estimateTokens(optimizedDocumentContext),
      knowledgeBaseContext: this.estimateTokens(optimizedKnowledgeBaseContext),
      query: this.estimateTokens(optimizedQuery),
    };

    const totalFinalTokens = Object.values(finalTokens).reduce((sum, tokens) => sum + tokens, 0);

    aiLogger.info("🟩 [context][SUCCESS] Context optimization completed", {
      originalTokens: currentTokens,
      optimizedTokens: finalTokens,
      totalOriginalTokens: totalCurrentTokens,
      totalOptimizedTokens: totalFinalTokens,
      tokensSaved: totalCurrentTokens - totalFinalTokens,
      optimizationApplied
    });

    return {
      systemPrompt: optimizedSystemPrompt,
      memoryContext: optimizedMemoryContext,
      documentContext: optimizedDocumentContext,
      knowledgeBaseContext: optimizedKnowledgeBaseContext,
      query: optimizedQuery,
      totalTokens: totalFinalTokens,
      optimizationApplied,
    };
  }

  /**
   * Get context usage statistics
   */
  static getContextStats(
    systemPrompt: string,
    memoryContext: string = '',
    documentContext: string = '',
    knowledgeBaseContext: string = '',
    query: string = ''
  ) {
    const tokens = {
      systemPrompt: this.estimateTokens(systemPrompt),
      memoryContext: this.estimateTokens(memoryContext),
      documentContext: this.estimateTokens(documentContext),
      knowledgeBaseContext: this.estimateTokens(knowledgeBaseContext),
      query: this.estimateTokens(query),
    };

    const totalTokens = Object.values(tokens).reduce((sum, count) => sum + count, 0);
    const percentages = Object.fromEntries(
      Object.entries(tokens).map(([key, count]) => [key, Math.round((count / totalTokens) * 100)])
    );

    return {
      tokens,
      totalTokens,
      percentages,
      isWithinLimits: totalTokens <= this.DEFAULT_CONFIG.maxTotalTokens,
    };
  }
}
