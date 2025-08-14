# DocBare Model Usage Documentation

## Overview

This document provides a comprehensive overview of all AI models used in the DocBare legal AI platform, including their specific purposes, configurations, and usage patterns.

## 🎯 **Model Usage Summary**

| **Component** | **Model** | **Provider** | **Purpose** | **API Key** |
|---------------|-----------|--------------|-------------|-------------|
| **Multi-Agent System** | `deepseek-reasoner` | DeepSeek | Orchestrator, Analysis, Drafting agents | `DEEPSEEK_API_KEY` |
| **Single-Agent Mode** | `deepseek-reasoner` | DeepSeek | Direct user queries with real-time thinking | `DEEPSEEK_API_KEY` |
| **Chat Title Generation** | `gpt-4o-mini` | OpenAI | Generate descriptive chat titles | `OPENAI_API_KEY` |
| **Document Embeddings** | `text-embedding-3-small` | OpenAI | Document chunk embeddings | `OPENAI_API_KEY` |
| **Query Embeddings** | `text-embedding-3-large` | OpenAI | Query embeddings for RAG | `OPENAI_API_KEY` |
| **Document Processing** | Various Processors | Google Document AI | OCR, text extraction, entity extraction | `GOOGLE_APPLICATION_CREDENTIALS` |

## 🤖 **DeepSeek Models**

### **Model: `deepseek-reasoner`**
- **Provider**: DeepSeek AI
- **Type**: Large Language Model (LLM) with native reasoning capabilities
- **Purpose**: Primary reasoning and text generation with real-time thinking display
- **Usage**: Multi-agent system and single-agent mode with native reasoning content separation

#### **Configuration**
```typescript
// In lib/streamingOrchestrator.ts
const response = await axios({
  method: "post",
  url: "https://api.deepseek.com/v1/chat/completions",
  data: {
    model: "deepseek-reasoner",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userMessage }
    ],
    max_tokens: 4096,
    stream: true
    // Note: temperature, top_p, presence_penalty, frequency_penalty not supported by reasoning model
  },
  headers: {
    Authorization: `Bearer ${DEEPSEEK_API_KEY}`
  }
});
```

#### **Native Reasoning Model Features**
- **`reasoning_content`**: Internal analysis and thinking process
- **`content`**: Final user-facing response
- **Real-Time Streaming**: Separate streaming of thinking and final content
- **Automatic Separation**: Native field separation without custom parsing

#### **Use Cases**
1. **Orchestrator Agent**: Decides workflow routing and coordination
2. **Analysis Agent**: Performs structured document analysis with JSON output
3. **Drafting Agent**: Creates legal documents and responses
4. **Single-Agent Mode**: Direct user query processing with real-time thinking display

#### **Performance Characteristics**
- **Reasoning Capability**: Excellent for complex legal reasoning
- **JSON Output**: Strong structured output generation
- **Context Length**: 32K tokens
- **Cost**: Competitive pricing for reasoning tasks
- **Real-Time Thinking**: Native support for thinking process display

## 🧠 **OpenAI Models**

### **Model: `gpt-4o-mini`**
- **Provider**: OpenAI
- **Type**: Large Language Model (LLM)
- **Purpose**: Chat title generation
- **Usage**: Automatic chat session naming

#### **Configuration**
```typescript
// In app/api/create_chat_session/route.ts
const response = await openai.chat.completions.create({
  model: 'gpt-4o-mini',
  messages: [
    {
      role: 'system',
      content: 'Generate a concise, descriptive title for this chat session...'
    },
    {
      role: 'user',
      content: query
    }
  ],
  max_tokens: 50,
  temperature: 0.3
});
```

#### **Use Cases**
- **Chat Title Generation**: Creates descriptive titles for chat sessions
- **Short Text Generation**: Optimized for brief, focused outputs

#### **Performance Characteristics**
- **Speed**: Fast response times
- **Cost**: Economical for simple tasks
- **Quality**: Good for title generation tasks

### **Model: `text-embedding-3-small`**
- **Provider**: OpenAI
- **Type**: Embedding Model
- **Purpose**: Document chunk embeddings
- **Usage**: Document ingestion and storage

#### **Configuration**
```typescript
// In app/api/ingest/route.ts
const embeddingResp = await openai.embeddings.create({
  model: 'text-embedding-3-small',
  input: chunkText,
});
```

#### **Use Cases**
- **Document Chunking**: Creates embeddings for document chunks during ingestion
- **Storage**: Stores vector representations in Firestore

#### **Performance Characteristics**
- **Dimensions**: 1536 dimensions
- **Speed**: Fast embedding generation
- **Cost**: Economical for bulk processing
- **Quality**: Good for document similarity

### **Model: `text-embedding-3-large`**
- **Provider**: OpenAI
- **Type**: Embedding Model
- **Purpose**: Query embeddings for RAG
- **Usage**: Retrieval-Augmented Generation

#### **Configuration**
```typescript
// In lib/embeddings.ts
const response = await axios.post(
  'https://api.openai.com/v1/embeddings',
  {
    input: [query],
    model: process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-large',
  },
  {
    headers: { 'Authorization': `Bearer ${process.env.OPENAI_API_KEY}` }
  }
);
```

#### **Use Cases**
- **Query Embeddings**: Creates embeddings for user queries
- **RAG Retrieval**: Enables semantic search in document chunks
- **Similarity Matching**: Finds relevant document chunks

#### **Performance Characteristics**
- **Dimensions**: 3072 dimensions
- **Accuracy**: Higher quality embeddings for queries
- **Cost**: Slightly more expensive than small model
- **Quality**: Excellent for semantic search

## 🔧 **Environment Variables**

### **Required API Keys**
```bash
# DeepSeek API Key (for LLM reasoning)
DEEPSEEK_API_KEY=sk_...

# OpenAI API Key (for embeddings and chat titles)
OPENAI_API_KEY=sk_...

# Optional: Override default embedding model
OPENAI_EMBEDDING_MODEL=text-embedding-3-large
```

### **Model Configuration**
```bash
# Feature flag for multi-agent system
USE_MULTI_AGENT=true

# Optional: Override default models
DEEPSEEK_MODEL=deepseek-reasoner
OPENAI_CHAT_MODEL=gpt-4o-mini
```

## 📊 **Model Selection Rationale**

### **Why DeepSeek for Reasoning?**
1. **Legal Expertise**: Strong performance on legal reasoning tasks
2. **JSON Output**: Excellent structured output generation
3. **Cost Efficiency**: Competitive pricing for reasoning workloads
4. **Context Length**: 32K tokens suitable for complex legal documents

### **Why OpenAI for Embeddings?**
1. **Proven Quality**: Industry-standard embedding models
2. **Dual Model Strategy**: Small for documents, large for queries
3. **Cost Optimization**: Different models for different use cases
4. **Reliability**: Stable and well-documented API

### **Why GPT-4o-mini for Chat Titles?**
1. **Speed**: Fast response times for simple tasks
2. **Cost**: Economical for title generation
3. **Quality**: Sufficient for descriptive title creation
4. **Consistency**: Reliable output format

## 🔄 **Model Integration Points**

### **Multi-Agent System Flow**
```
User Query → DeepSeek (Orchestrator) → DeepSeek (Analysis) → DeepSeek (Drafting) → Response
```

### **Single-Agent System Flow**
```
User Query → DeepSeek (Direct Processing) → Response
```

### **Document Processing Flow**
```
Document Upload → Text Extraction → Chunking → OpenAI (text-embedding-3-small) → Storage
```

### **RAG Query Flow**
```
User Query → OpenAI (text-embedding-3-large) → Vector Search → DeepSeek (Response Generation)
```

### **Chat Title Generation Flow**
```
Chat Session → OpenAI (gpt-4o-mini) → Title Generation → Storage
```

## 📈 **Performance Monitoring**

### **Key Metrics to Track**
1. **Response Times**: Per model and use case
2. **Token Usage**: Cost optimization
3. **Error Rates**: Model reliability
4. **Quality Scores**: User feedback integration

### **Logging**
```typescript
// Example logging in lib/logger.ts
aiLogger.aiResponse('DeepSeek', 'deepseek-reasoner', duration, { query });
aiLogger.aiResponse('OpenAI', 'text-embedding-3-large', duration, { query });
```

## 🔍 **Google Document AI Models**

### **Overview**
Google Document AI provides specialized processors for different document types and use cases. DocBare uses multiple processors to handle various legal documents effectively.

### **Processor Types**

#### **1. General Document Processor**
- **Purpose**: Standard text extraction from documents
- **Use Cases**: General PDFs, text documents, mixed content
- **Features**: Basic text extraction, layout preservation
- **Configuration**: `DOCUMENT_AI_GENERAL_PROCESSOR_ID`

#### **2. Legal Document Processor**
- **Purpose**: Specialized for legal documents
- **Use Cases**: Contracts, agreements, legal correspondence
- **Features**: Entity extraction, legal terminology recognition
- **Configuration**: `DOCUMENT_AI_LEGAL_PROCESSOR_ID`

#### **3. Form Parser Processor**
- **Purpose**: Structured form data extraction
- **Use Cases**: Legal forms, applications, questionnaires
- **Features**: Form field extraction, table data
- **Configuration**: `DOCUMENT_AI_FORM_PROCESSOR_ID`

#### **4. OCR Processor**
- **Purpose**: Image-to-text conversion
- **Use Cases**: Scanned documents, images, handwritten text
- **Features**: Optical character recognition, image processing
- **Configuration**: `DOCUMENT_AI_OCR_PROCESSOR_ID`

### **Configuration**
```typescript
// In lib/documentAI.ts
const PROCESSOR_TYPES = {
  GENERAL: 'general-document-processor',
  LEGAL_DOCUMENT: 'legal-document-processor',
  FORM_PARSER: 'form-parser-processor',
  OCR: 'ocr-processor',
} as const;
```

### **Usage Pattern**
```typescript
// Automatic processor selection based on file type and content
const result = await documentAIService.processDocument(
  fileBuffer,
  fileName,
  {
    enableOCR: mimeType.startsWith("image/"),
    extractTables: true,
    extractEntities: true,
  }
);
```

### **Performance Characteristics**
- **Processing Speed**: 1-5 seconds per document
- **Accuracy**: 95%+ for clear documents
- **Cost**: Pay-per-document processed
- **Scalability**: Cloud-based processing
- **Reliability**: 99.9% uptime SLA

### **Benefits Over Traditional OCR**
1. **Legal Specialization**: Built-in legal document understanding
2. **Entity Extraction**: Automatic identification of legal entities
3. **Table Recognition**: Structured table data extraction
4. **Confidence Scoring**: Quality assessment of extracted content
5. **Multi-Format Support**: PDF, images, scanned documents
6. **Cloud Processing**: No local resource requirements

## 🚀 **Future Model Considerations**

### **Potential Upgrades**
1. **DeepSeek R2**: When available for improved reasoning
2. **OpenAI GPT-4o**: For more complex chat title generation
3. **Custom Embeddings**: Domain-specific legal embeddings
4. **Multi-Modal Models**: For document image processing
5. **Advanced Document AI**: Custom processors for specific legal domains

### **Model Comparison**
| **Model** | **Current** | **Potential Upgrade** | **Benefits** |
|-----------|-------------|----------------------|--------------|
| **Reasoning** | `deepseek-reasoner` | `deepseek-r2` | Better legal reasoning |
| **Embeddings** | `text-embedding-3-*` | Custom legal embeddings | Domain-specific accuracy |
| **Chat Titles** | `gpt-4o-mini` | `gpt-4o` | Better title quality |
| **Document Processing** | Google Document AI | Custom legal processors | Domain-specific extraction |

## 🔍 **Troubleshooting**

### **Common Issues**
1. **API Key Errors**: Check environment variables
2. **Model Not Found**: Verify model names
3. **Rate Limiting**: Implement retry logic
4. **Token Limits**: Monitor context length

### **Debug Commands**
```bash
# Check model availability
curl -H "Authorization: Bearer $DEEPSEEK_API_KEY" https://api.deepseek.com/v1/models
curl -H "Authorization: Bearer $OPENAI_API_KEY" https://api.openai.com/v1/models

# Test embeddings
npx tsx scripts/test-openai-embedding.ts

# Test multi-agent system
npx tsx scripts/test-updated-multi-agent.ts

# Test Document AI integration
npx tsx scripts/test-document-ai.ts
```

## 📚 **References**

- [DeepSeek API Documentation](https://api-docs.deepseek.com)
- [OpenAI API Documentation](https://platform.openai.com/docs)
- [Embedding Models Comparison](https://platform.openai.com/docs/guides/embeddings)
- [LangGraph Documentation](https://langchain-ai.github.io/langgraphjs/)
- [Google Document AI Documentation](https://cloud.google.com/document-ai/docs)
- [Document AI Processor Types](https://cloud.google.com/document-ai/docs/processors-list)

---

*This document provides a comprehensive overview of all AI models used in the DocBare platform. For specific implementation details, refer to the individual component files.* 