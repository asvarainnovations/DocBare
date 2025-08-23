import { aiLogger } from './logger';

/**
 * Dynamic Token Management System
 * 
 * Intelligently allocates max_tokens based on query complexity to optimize
 * cost, performance, and response quality.
 */
export class TokenManager {
  private static readonly DEFAULT_CONFIG = {
    MIN_TOKENS: 500,
    MAX_TOKENS: 12000,
    QUERY_LENGTH_WEIGHT: 0.3,
    LEGAL_KEYWORDS_WEIGHT: 0.4,
    DOCUMENT_PRESENCE_WEIGHT: 0.2,
    QUERY_TYPE_WEIGHT: 0.1
  };

  private static readonly LEGAL_KEYWORDS = [
    'contract', 'agreement', 'liability', 'jurisdiction', 'compliance',
    'breach', 'termination', 'amendment', 'clause', 'provision',
    'party', 'obligation', 'enforcement', 'dispute', 'arbitration',
    'litigation', 'settlement', 'damages', 'indemnification', 'warranty',
    'intellectual property', 'data privacy', 'pdpb', 'competition law',
    'shareholder rights', 'regulatory compliance', 'corporate law',
    'employment contract', 'legal risks', 'labor law', 'legal opinion',
    'merger agreement', 'nda', 'non-disclosure agreement'
  ];

  private static readonly QUERY_TYPE_MULTIPLIERS = {
    SIMPLE_QUESTION: 0.5,
    ANALYSIS_REQUEST: 2.0,
    DRAFTING_REQUEST: 3.0,
    COMPLEX_ANALYSIS: 4.0
  };

  /**
   * Calculate optimal max_tokens based on query complexity
   */
  static calculateMaxTokens(query: string, hasDocument: boolean = false): number {
    try {
      const complexityScore = this.calculateComplexityScore(query, hasDocument);
      const maxTokens = this.mapScoreToTokens(complexityScore);
      const validatedTokens = this.validateTokenLimit(maxTokens);

      // Log token allocation for monitoring
      aiLogger.info('Dynamic token allocation calculated', {
        query: query.substring(0, 100),
        complexityScore: complexityScore.toFixed(2),
        maxTokens: validatedTokens,
        hasDocument,
        queryType: this.classifyQueryType(query)
      });

      return validatedTokens;
    } catch (error) {
      aiLogger.error('Error calculating max tokens, using fallback', { error });
      return this.getFallbackTokens();
    }
  }

  /**
   * Calculate complexity score using the algorithm
   */
  private static calculateComplexityScore(query: string, hasDocument: boolean): number {
    const queryLength = query.length;
    const legalKeywords = this.countLegalKeywords(query);
    const documentPresence = hasDocument ? 1 : 0;
    const queryType = this.classifyQueryType(query);

    const score = (
      queryLength * this.DEFAULT_CONFIG.QUERY_LENGTH_WEIGHT +
      legalKeywords * this.DEFAULT_CONFIG.LEGAL_KEYWORDS_WEIGHT +
      documentPresence * this.DEFAULT_CONFIG.DOCUMENT_PRESENCE_WEIGHT +
      queryType * this.DEFAULT_CONFIG.QUERY_TYPE_WEIGHT
    );

    return score;
  }

  /**
   * Count legal keywords in the query
   */
  private static countLegalKeywords(query: string): number {
    const lowerQuery = query.toLowerCase();
    return this.LEGAL_KEYWORDS.filter(keyword => 
      lowerQuery.includes(keyword.toLowerCase())
    ).length;
  }

  /**
   * Classify query type and return multiplier
   */
  private static classifyQueryType(query: string): number {
    const lowerQuery = query.toLowerCase();
    
    if (lowerQuery.includes('draft') || lowerQuery.includes('create') || lowerQuery.includes('prepare')) {
      return this.QUERY_TYPE_MULTIPLIERS.DRAFTING_REQUEST;
    }
    
    if (lowerQuery.includes('analyze') || lowerQuery.includes('review') || lowerQuery.includes('examine')) {
      return this.QUERY_TYPE_MULTIPLIERS.ANALYSIS_REQUEST;
    }
    
    if (lowerQuery.includes('complex') || lowerQuery.includes('comprehensive') || lowerQuery.includes('detailed')) {
      return this.QUERY_TYPE_MULTIPLIERS.COMPLEX_ANALYSIS;
    }
    
    return this.QUERY_TYPE_MULTIPLIERS.SIMPLE_QUESTION;
  }

  /**
   * Map complexity score to token limit
   */
  private static mapScoreToTokens(score: number): number {
    if (score <= 10) return 1000;
    if (score <= 25) return 3000;
    if (score <= 40) return 6000;
    if (score <= 55) return 9000;
    return this.DEFAULT_CONFIG.MAX_TOKENS;
  }

  /**
   * Validate token limit within bounds
   */
  private static validateTokenLimit(tokens: number): number {
    return Math.max(
      this.DEFAULT_CONFIG.MIN_TOKENS,
      Math.min(tokens, this.DEFAULT_CONFIG.MAX_TOKENS)
    );
  }

  /**
   * Get fallback token limit if analysis fails
   */
  private static getFallbackTokens(): number {
    return 4000; // Safe default
  }

  /**
   * Log token usage for monitoring and optimization
   */
  static logTokenUsage(query: string, maxTokens: number, actualTokens: number): void {
    const efficiency = (actualTokens / maxTokens * 100).toFixed(2);
    
    aiLogger.info('Token usage tracking', {
      queryLength: query.length,
      allocatedTokens: maxTokens,
      actualTokens,
      efficiency: `${efficiency}%`,
      wasEfficient: actualTokens <= maxTokens
    });
  }

  /**
   * Get complexity analysis details for debugging
   */
  static getComplexityAnalysis(query: string, hasDocument: boolean = false) {
    const queryLength = query.length;
    const legalKeywords = this.countLegalKeywords(query);
    const documentPresence = hasDocument ? 1 : 0;
    const queryType = this.classifyQueryType(query);
    const complexityScore = this.calculateComplexityScore(query, hasDocument);
    const maxTokens = this.calculateMaxTokens(query, hasDocument);

    return {
      query: query.substring(0, 100),
      queryLength,
      legalKeywords,
      documentPresence,
      queryType,
      complexityScore: complexityScore.toFixed(2),
      maxTokens,
      analysis: {
        queryLengthScore: queryLength * this.DEFAULT_CONFIG.QUERY_LENGTH_WEIGHT,
        legalKeywordsScore: legalKeywords * this.DEFAULT_CONFIG.LEGAL_KEYWORDS_WEIGHT,
        documentPresenceScore: documentPresence * this.DEFAULT_CONFIG.DOCUMENT_PRESENCE_WEIGHT,
        queryTypeScore: queryType * this.DEFAULT_CONFIG.QUERY_TYPE_WEIGHT
      }
    };
  }
}
