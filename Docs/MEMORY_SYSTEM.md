# Agentic RAG Memory System

## Overview

The DocBare platform implements a sophisticated memory system that enables the AI agent to maintain context across conversations, remember previous reasoning, and build upon past interactions. This transforms our RAG system from a simple question-answer system into a truly agentic AI that learns and adapts over time.

## Architecture

### Memory Types

The system stores five types of memories:

1. **Conversation Memory** (`conversation`)
   - User and AI messages
   - Chat history for context
   - Metadata: role, source, relevance

2. **Reasoning Memory** (`reasoning`)
   - AI's thought process and analysis
   - Legal reasoning chains
   - Metadata: confidence, source, tags

3. **Decision Memory** (`decision`)
   - AI decisions and recommendations
   - Action items and next steps
   - Metadata: confidence, impact, priority

4. **Context Memory** (`context`)
   - Relevant background information
   - Document context and key points
   - Metadata: source, relevance, tags

5. **Insight Memory** (`insight`)
   - Patterns and observations
   - Learning from interactions
   - Metadata: confidence, category, importance

### Storage Strategy

**Hybrid Storage Approach:**
- **Firestore**: Primary storage for real-time access and querying
- **PostgreSQL**: Backup and analytics storage
- **Automatic Sync**: Both databases stay synchronized

**Benefits:**
- Real-time memory retrieval
- Scalable querying capabilities
- Data redundancy and reliability
- Analytics and reporting capabilities

## Implementation

### Backend Components

#### Memory Manager (`lib/memory.ts`)
```typescript
class MemoryManager {
  // Store new memory entries
  async storeMemory(entry: MemoryEntry): Promise<string>
  
  // Retrieve relevant memories
  async retrieveMemories(sessionId, userId, context, limit, types): Promise<MemoryEntry[]>
  
  // Generate context for AI
  async generateMemoryContext(sessionId, userId, query): Promise<string>
  
  // Specialized storage methods
  async storeConversationMemory(sessionId, userId, role, content): Promise<string>
  async storeReasoningMemory(sessionId, userId, reasoning, metadata): Promise<string>
  async storeDecisionMemory(sessionId, userId, decision, metadata): Promise<string>
}
```

#### API Endpoints (`app/api/memory/route.ts`)
- `POST /api/memory` - Store new memory
- `GET /api/memory` - Retrieve memories with filtering
- `DELETE /api/memory` - Cleanup old memories

#### Query Integration (`app/api/query/route.ts`)
```typescript
// Generate memory context before AI call
const memoryContext = await memoryManager.generateMemoryContext(sessionId, userId, query);

// Enhanced system prompt with memory
const enhancedSystemPrompt = memoryContext 
  ? `${systemPrompt}\n\n## Memory Context:${memoryContext}`
  : systemPrompt;

// Store memories after AI response
await memoryManager.storeConversationMemory(sessionId, userId, 'user', query);
await memoryManager.storeConversationMemory(sessionId, userId, 'assistant', answer);
```

### Frontend Components

#### React Hook (`hooks/useMemory.ts`)
```typescript
const {
  memories,
  loading,
  error,
  fetchMemories,
  storeMemory,
  storeConversationMemory,
  storeReasoningMemory,
  storeDecisionMemory,
  getConversationHistory,
  getReasoningChain,
  getRelevantContext,
  cleanupOldMemories,
} = useMemory({ sessionId, userId });
```

## Usage Examples

### Basic Memory Storage
```typescript
// Store user message
await memoryManager.storeConversationMemory(sessionId, userId, 'user', 'What are the key terms in this contract?');

// Store AI reasoning
await memoryManager.storeReasoningMemory(sessionId, userId, 
  'Analyzing contract for key terms: payment terms, termination clauses, liability provisions',
  { confidence: 0.9, tags: ['contract-analysis'] }
);

// Store AI decision
await memoryManager.storeDecisionMemory(sessionId, userId,
  'Focus on payment terms and termination clauses as primary concerns',
  { confidence: 0.85, priority: 'high' }
);
```

### Memory Retrieval
```typescript
// Get conversation history
const history = await memoryManager.getConversationHistory(sessionId, 10);

// Get reasoning chain
const reasoning = await memoryManager.getReasoningChain(sessionId, 5);

// Get relevant context for current query
const context = await memoryManager.getRelevantContext(sessionId, 'contract terms', 3);
```

### Context Generation
```typescript
// Generate comprehensive context for AI
const context = await memoryManager.generateMemoryContext(sessionId, userId, query);

// Result includes:
// - Previous conversation highlights
// - Relevant reasoning chains
// - Important decisions and insights
// - Contextual information
```

## Benefits

### 1. **Conversation Continuity**
- AI remembers previous interactions
- Maintains context across multiple queries
- Builds upon past discussions

### 2. **Improved Reasoning**
- AI can reference previous analysis
- Consistent reasoning patterns
- Learning from past decisions

### 3. **Enhanced User Experience**
- More coherent conversations
- Reduced repetition
- Personalized responses

### 4. **Legal Expertise Development**
- AI learns from legal analysis patterns
- Builds domain-specific knowledge
- Improves accuracy over time

### 5. **Audit Trail**
- Complete reasoning chain
- Decision history
- Compliance and accountability

## Performance Considerations

### Memory Limits
- **Conversation History**: 20 messages per session
- **Reasoning Chain**: 10 entries per session
- **Context**: 5 relevant entries per query
- **Total Memory**: Configurable per session

### Cleanup Strategy
- Automatic cleanup of old memories (30+ days)
- Configurable retention policies
- Memory compression for long sessions

### Query Optimization
- Indexed queries by session, user, and type
- Efficient filtering and sorting
- Caching for frequently accessed memories

## Future Enhancements

### 1. **Semantic Search**
- Vector embeddings for memory content
- Semantic similarity for better relevance
- Advanced retrieval algorithms

### 2. **Memory Compression**
- Summarization of long conversations
- Key point extraction
- Hierarchical memory organization

### 3. **Cross-Session Learning**
- Pattern recognition across sessions
- User preference learning
- Domain expertise building

### 4. **Memory Visualization**
- Memory graph visualization
- Reasoning chain diagrams
- Conversation flow analysis

### 5. **Advanced Analytics**
- Memory usage patterns
- Effectiveness metrics
- Performance optimization insights

## Configuration

### Environment Variables
```env
# Memory cleanup settings
MEMORY_CLEANUP_DAYS=30
MEMORY_MAX_ENTRIES_PER_SESSION=100

# Performance settings
MEMORY_CACHE_TTL=300000  # 5 minutes
MEMORY_BATCH_SIZE=50
```

### Database Schema
```sql
-- AgentMemory table
CREATE TABLE "AgentMemory" (
  "id" TEXT NOT NULL,
  "sessionId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "metadata" JSONB DEFAULT '{}',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "accessedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "accessCount" INTEGER NOT NULL DEFAULT 1,
  
  PRIMARY KEY ("id")
);

-- Indexes for performance
CREATE INDEX "AgentMemory_sessionId_userId_idx" ON "AgentMemory"("sessionId", "userId");
CREATE INDEX "AgentMemory_type_idx" ON "AgentMemory"("type");
CREATE INDEX "AgentMemory_accessedAt_idx" ON "AgentMemory"("accessedAt");
```

## Monitoring and Debugging

### Logging
```typescript
// Memory operations are logged with structured data
aiLogger.info('Memory stored successfully', { 
  sessionId, 
  type,
  contentLength 
});

aiLogger.info('Memory context generated', { 
  sessionId, 
  contextLength,
  conversationCount,
  reasoningCount 
});
```

### Metrics
- Memory storage/retrieval latency
- Memory usage per session
- Context generation effectiveness
- Cleanup operation statistics

### Debug Tools
- Memory inspection API
- Context generation debugging
- Performance profiling
- Memory visualization tools

## Security and Privacy

### Data Protection
- User-specific memory isolation
- Session-based access control
- Encrypted storage for sensitive data
- Automatic data retention policies

### Compliance
- GDPR-compliant data handling
- Right to be forgotten implementation
- Data export capabilities
- Audit trail maintenance

This memory system transforms DocBare from a simple RAG system into a truly agentic AI platform that learns, remembers, and improves over time, providing users with increasingly sophisticated and contextual legal assistance. 