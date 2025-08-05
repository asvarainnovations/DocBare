# DocBare Multi-Agent System Documentation

## Overview

The DocBare Multi-Agent System is a sophisticated legal AI platform that uses a LangGraph-inspired workflow to provide comprehensive legal analysis and drafting services. The system consists of three specialized agents working in coordination to deliver high-quality legal assistance.

## Architecture

### Core Components

1. **Orchestrator Agent** - Decides workflow routing and coordinates between agents
2. **Analysis Agent** - Performs structured document analysis with JSON output
3. **Drafting Agent** - Creates legal documents and responses
4. **Memory System** - Maintains conversation and reasoning context
5. **Streaming Orchestrator** - Handles response streaming and fallbacks

### System Flow

```
User Query + Document → Orchestrator Agent → Decision (needAnalysis)
                                    ↓
                            ┌─────────────────┐
                            │   Analysis?     │
                            └─────────────────┘
                                    ↓
                    ┌─────────────────────────────┐
                    │ Yes: Analysis → Drafting    │
                    │ No:  Direct Drafting        │
                    └─────────────────────────────┘
                                    ↓
                            Final Response
```

## Agent Specifications

### 1. Orchestrator Agent

**Role**: Workflow decision maker and coordinator

**Input**: User query, document availability, memory context

**Output**: JSON decision with `needAnalysis` boolean

**Key Features**:
- Determines if document analysis is required
- Routes workflow between analysis and drafting agents
- Handles error scenarios gracefully
- Maintains workflow continuity

**Decision Logic**:
- `needAnalysis=true` if document present AND analysis requested
- `needAnalysis=false` for direct drafting requests
- Fallback logic for JSON parsing failures

### 2. Analysis Agent

**Role**: Structured document analyzer

**Input**: Document content, user query, memory context

**Output**: Structured JSON with document type, facts, and audit results

**JSON Structure**:
```json
{
  "type": "Contract|Notice|Petition|...",
  "facts": {
    "partyA": "string",
    "partyB": "string", 
    "date": "string",
    "subject": "string",
    "triggers": ["string"]
  },
  "audit": [
    {
      "clause": 1,
      "label": "Favorable|Neutral|Risk",
      "issue": "string",
      "recommendation": "string", 
      "rationale": "string"
    }
  ]
}
```

**Features**:
- Clause-by-clause analysis
- Risk assessment and recommendations
- Indian legal framework focus
- Structured output for downstream processing

### 3. Drafting Agent

**Role**: Legal document creator

**Input**: User query, optional analysis report, memory context

**Output**: Complete legal document or response

**Input Format**:
```
userQuery: [user's request]
analysisReport: [JSON from analysis agent] (optional)
Memory Context: [previous interactions]
```

**Features**:
- Creates contracts, notices, pleadings
- Incorporates analysis recommendations
- Indian legal formatting standards
- Length control based on request type

## Implementation Details

### File Structure

```
lib/
├── config.ts                    # Agent prompts and configuration
├── langgraphOrchestrator.ts     # Main multi-agent orchestrator
├── streamingOrchestrator.ts     # Response streaming handler
├── memory.ts                    # Memory management system
└── documentExtractor.ts         # Document processing utilities

app/api/query/route.ts           # Main API endpoint
scripts/
├── test-updated-multi-agent.ts  # Comprehensive testing
└── test-langgraph.ts           # Legacy testing
```

### Key Features

#### 1. JSON Parsing & Validation
- Robust JSON extraction from agent responses
- Fallback mechanisms for parsing failures
- Structured error handling and logging

#### 2. Memory Integration
- Conversation memory for context continuity
- Reasoning memory for agent decisions
- Tagged memory for different agent types

#### 3. Error Handling
- Graceful degradation on agent failures
- Fallback to single-agent mode
- Comprehensive error logging

#### 4. Streaming Support
- Real-time response streaming
- Memory storage during streaming
- Error recovery during stream failures

## Configuration

### Environment Variables

```bash
USE_MULTI_AGENT=true          # Enable/disable multi-agent mode
DEEPSEEK_API_KEY=xxx          # DeepSeek API key (for multi-agent system)
OPENAI_API_KEY=xxx            # OpenAI API key (for chat title generation only)
```

### Agent Prompts

All agent prompts are centralized in `lib/config.ts`:

- `ORCHESTRATOR_PROMPT` - Workflow decision making
- `ANALYSIS_PROMPT` - Document analysis with JSON output
- `DRAFTING_PROMPT` - Legal document creation

### Model Usage

- **Multi-Agent System**: Uses DeepSeek R1 reasoning model (`deepseek-reasoner`) for all agent interactions
- **Single-Agent Mode**: Uses DeepSeek R1 reasoning model (`deepseek-reasoner`) for direct queries
- **Chat Title Generation**: Uses OpenAI GPT-4o-mini for generating descriptive chat titles

## Testing

### Test Scenarios

1. **Document Analysis + Drafting**: Full workflow with document
2. **Direct Drafting**: No document, drafting only
3. **Analysis Request Without Document**: Error handling

### Running Tests

```bash
# Test updated multi-agent system
npx tsx scripts/test-updated-multi-agent.ts

# Test legacy system
npx tsx scripts/test-langgraph.ts
```

## Performance Metrics

### Test Results (Latest)

- **Document Analysis + Drafting**: ~35 seconds, 3126 characters
- **Direct Drafting**: ~16 seconds, 1708 characters  
- **Error Handling**: ~4 seconds, 250 characters

### Memory Usage

- Efficient memory storage and retrieval
- Context-aware memory generation
- Automatic memory cleanup

## Error Handling

### JSON Parsing Failures

1. **Orchestrator**: Enhanced fallback logic with content analysis
2. **Analysis**: Fallback to raw text with structured formatting
3. **Drafting**: Continue with available context

### Agent Failures

1. **Single Agent Fallback**: Automatic fallback to single-agent mode
2. **Error Logging**: Comprehensive error tracking
3. **User Feedback**: Clear error messages to users

## Future Enhancements

### Planned Improvements

1. **Better JSON Parsing**: Enhanced prompt engineering for consistent JSON output
2. **Agent Specialization**: Domain-specific agents for different legal areas
3. **Performance Optimization**: Caching and parallel processing
4. **Advanced Memory**: Semantic memory and knowledge graphs

### Monitoring & Analytics

1. **Agent Performance**: Response time and success rate tracking
2. **Memory Effectiveness**: Context relevance and usage patterns
3. **User Satisfaction**: Feedback integration and quality metrics

## Conclusion

The DocBare Multi-Agent System successfully implements a sophisticated legal AI platform with:

- ✅ **Structured Agent Communication**: JSON-based inter-agent communication
- ✅ **Robust Error Handling**: Graceful degradation and fallback mechanisms
- ✅ **Memory Integration**: Context-aware conversation management
- ✅ **Streaming Support**: Real-time response delivery
- ✅ **Comprehensive Testing**: Multi-scenario validation

The system is production-ready and provides a solid foundation for advanced legal AI services. 