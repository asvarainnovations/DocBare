# DocBare Multi-Agent System (LangGraph-Inspired Implementation)

## Overview

The DocBare Multi-Agent System is a sophisticated AI architecture built using **LangGraph-inspired patterns** that provides specialized legal assistance through multiple coordinated agents. The system can be toggled between single-agent and multi-agent modes using a simple feature flag.

**Status**: ✅ **COMPLETED AND TESTED SUCCESSFULLY**

## Architecture

### System Components

1. **Streaming Orchestrator** (`lib/streamingOrchestrator.ts`)
   - Main entry point for all AI requests
   - Routes requests based on `USE_MULTI_AGENT` flag
   - Handles streaming responses and fallbacks

2. **LangGraph Orchestrator** (`lib/langgraphOrchestrator.ts`)
   - **LangGraph-inspired workflow engine**
   - Coordinates between specialized agents using state management
   - Manages workflow decisions and state transitions
   - Handles memory integration with custom memory system

3. **Analysis Agent (LangGraph-Inspired Node)**
   - Specialized in document analysis and legal review
   - Provides structured analysis with risk assessment
   - Focuses on Indian legal framework
   - **Implemented as a LangGraph-inspired node with state management**

4. **Drafting Agent (LangGraph-Inspired Node)**
   - Specialized in legal document creation
   - Generates contracts, notices, petitions, etc.
   - Ensures compliance with Indian legal requirements
   - **Implemented as a LangGraph-inspired node with state management**

5. **Memory System**
   - Stores conversation history and reasoning
   - Provides context for agent interactions
   - Maintains continuity across sessions
   - **Integrated with LangGraph-inspired state management**

## Feature Toggle

### Environment Variable
```bash
USE_MULTI_AGENT=true   # Enable multi-agent mode
USE_MULTI_AGENT=false  # Enable single-agent mode (default)
```

### Toggle Script
```bash
# Check current mode
node scripts/toggle-agent-mode.js status

# Switch to multi-agent mode
node scripts/toggle-agent-mode.js multi

# Switch to single-agent mode
node scripts/toggle-agent-mode.js single

# Toggle between modes
node scripts/toggle-agent-mode.js toggle
```

## LangGraph-Inspired Implementation

### State Management
The system uses LangGraph-inspired state management to coordinate agent workflows:

```typescript
interface AgentState {
  sessionId: string;
  userId: string;
  query: string;
  documentContent?: string;
  documentName?: string;
  hasDocument: boolean;
  analysisResult?: string;
  draftingResult?: string;
  finalResponse?: string;
  error?: string;
  memoryContext: string;
  messages: (HumanMessage | AIMessage | SystemMessage)[];
}
```

### Workflow Nodes
1. **Orchestrator Node**: Decides workflow and initializes processing
2. **Analysis Node**: Processes documents and provides legal analysis
3. **Drafting Node**: Creates legal documents and responses
4. **Finalize Node**: Combines results and creates final response

### Workflow Logic
The system intelligently routes between agents based on:
- Document presence (routes to analysis if document available)
- Analysis completion (routes to drafting after analysis)
- Drafting completion (routes to finalize)
- Error conditions (handles fallbacks gracefully)

## Testing Results

### ✅ Successfully Tested Scenarios

#### 1. Document Analysis Workflow
- **Test**: Employment contract analysis with response letter drafting
- **Processing Time**: ~55 seconds
- **Output**: Comprehensive legal analysis + professional response letter
- **Quality**: Excellent - detailed risk assessment and recommendations

#### 2. Direct Drafting Workflow
- **Test**: Legal notice for breach of contract
- **Processing Time**: ~22 seconds
- **Output**: Professional legal notice with proper formatting
- **Quality**: Excellent - Indian law compliant with proper structure

### Performance Metrics
- **Document Analysis**: ~55 seconds (Analysis + Drafting)
- **Direct Drafting**: ~22 seconds (Drafting only)
- **Memory Operations**: <1 second per operation
- **Error Handling**: Robust fallback mechanisms
- **Output Quality**: Professional legal documents with proper formatting

## Workflows

### Single-Agent Mode (Default)
```
User Query → Single LLM → Response
```
- Direct processing by the main AI model
- Standard legal assistance
- No specialized agent coordination

### Multi-Agent Mode (LangGraph)
```
User Query + Document → Orchestrator → Analysis Agent → Drafting Agent → Finalize → Combined Response
User Query (No Document) → Orchestrator → Drafting Agent → Finalize → Response
```

#### Document Analysis Workflow
1. **Orchestrator** receives user query with document
2. **Analysis Agent** processes document and provides structured analysis
3. **Drafting Agent** uses analysis to create legal documents
4. **Memory System** stores all interactions for context
5. **Response** combines analysis and drafting results

#### Direct Drafting Workflow
1. **Orchestrator** receives user query without document
2. **Drafting Agent** directly processes the query
3. **Memory System** stores interactions
4. **Response** provides legal drafting assistance

## Agent Specializations

### Analysis Agent
**Purpose**: Document review and legal analysis
**Capabilities**:
- Clause-by-clause document analysis
- Risk assessment and compliance review
- Legal recommendations and rationale
- Indian legal framework focus

**Output Structure**:
- Document Overview
- Key Clauses Analysis
- Risk Assessment
- Recommendations
- Legal Rationale

### Drafting Agent
**Purpose**: Legal document creation
**Capabilities**:
- Contract and agreement drafting
- Legal notices and communications
- Petitions and applications
- Compliance documents

**Features**:
- Indian legal compliance
- Professional formatting
- Complete document structure
- Practical implementation guidance

## Memory Integration

### Memory Types
- **Conversation**: User queries and AI responses
- **Reasoning**: Analysis steps and decision processes
- **Analysis**: Document analysis results
- **Drafting**: Legal document outputs

### Context Usage
- Agents receive relevant conversation history
- Previous analysis informs new drafting
- Continuity maintained across sessions
- Context limits prevent token overflow

## Error Handling & Fallbacks

### Multi-Agent Failures
1. **Analysis Agent Failure**: Falls back to drafting-only workflow
2. **Drafting Agent Failure**: Falls back to single-agent mode
3. **Orchestration Failure**: Falls back to single-agent mode
4. **Memory Failure**: Continues without context

### Fallback Chain
```
Multi-Agent → Drafting-Only → Single-Agent → Error Response
```

## Configuration

### Agent Configuration (`lib/config.ts`)
```typescript
export const AGENT_CONFIG = {
  MEMORY_CONTEXT_LIMIT: 10,
  MEMORY_REASONING_LIMIT: 5,
  ORCHESTRATOR_PROMPT: "...",
  ANALYSIS_PROMPT: "...",
  DRAFTING_PROMPT: "..."
};
```

### Memory Configuration
```typescript
export const MEMORY_CONFIG = {
  CONVERSATION_TAG: 'conversation',
  REASONING_TAG: 'reasoning',
  ANALYSIS_TAG: 'analysis',
  DRAFTING_TAG: 'drafting'
};
```

## Testing

### Test Script
```bash
# Run comprehensive tests
npx tsx scripts/test-multi-agent.ts
```

### Test Scenarios
1. **Multi-Agent with Document**: Tests analysis + drafting workflow
2. **Multi-Agent without Document**: Tests direct drafting workflow
3. **Single-Agent Mode**: Tests standard LLM processing

## API Integration

### Query Endpoint (`/api/query`)
The existing query endpoint automatically uses the appropriate mode based on the `USE_MULTI_AGENT` flag.

### Request Format
```typescript
{
  query: string,
  sessionId: string,
  userId: string,
  documentContent?: string,
  documentName?: string
}
```

### Response Format
- **Single-Agent**: Direct AI response
- **Multi-Agent**: Combined analysis and drafting response

## Performance Considerations

### Token Management
- Memory context limits prevent token overflow
- Agent prompts optimized for efficiency
- Streaming responses maintain responsiveness

### Caching
- Memory system provides context caching
- Agent results stored for future reference
- Session-based memory isolation

## Security & Privacy

### Data Handling
- User data isolated by session and user ID
- Memory stored securely in Firestore
- No cross-user data leakage

### Access Control
- Standard authentication required
- Admin access for system management
- Secure API endpoints

## Monitoring & Logging

### Logging Prefixes
- 🎭 [ORCHESTRATOR]: Multi-agent coordination
- 📋 [ANALYSIS]: Document analysis operations
- ✍️ [DRAFTING]: Legal drafting operations
- 🧠 [MEMORY]: Memory system operations
- 🔄 [FALLBACK]: Fallback operations

### Error Tracking
- Comprehensive error logging
- Fallback decision tracking
- Performance monitoring

## Future Enhancements

### Planned Features
1. **Document Extraction**: Full PDF/DOCX text extraction
2. **Agent Specialization**: Additional specialized agents
3. **Workflow Customization**: User-defined agent workflows
4. **Performance Optimization**: Advanced caching and optimization

### Scalability
- Horizontal scaling support
- Load balancing for agent processing
- Distributed memory management

## Troubleshooting

### Common Issues

1. **Multi-Agent Not Working**
   - Check `USE_MULTI_AGENT` environment variable
   - Verify agent prompts in configuration
   - Check memory system connectivity

2. **Fallback to Single-Agent**
   - Review error logs for agent failures
   - Check API key validity
   - Verify memory system status

3. **Performance Issues**
   - Monitor token usage
   - Check memory context limits
   - Review agent prompt optimization

### Debug Commands
```bash
# Check current mode
node scripts/toggle-agent-mode.js status

# Test system functionality
npx tsx scripts/test-multi-agent.ts

# View logs
npm run dev
```

## Migration Guide

### From Single-Agent to Multi-Agent
1. Set `USE_MULTI_AGENT=true` in environment
2. Restart development server
3. Test with document uploads
4. Monitor performance and logs

### From Multi-Agent to Single-Agent
1. Set `USE_MULTI_AGENT=false` in environment
2. Restart development server
3. Verify standard functionality
4. Clean up any multi-agent specific data if needed 