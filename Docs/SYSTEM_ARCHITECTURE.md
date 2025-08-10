# System Architecture & Workflow

```mermaid
flowchart TD
  subgraph User
    A1["Web App (Next.js React UI)"]
    A2["Thinking Display Component"]
  end

  subgraph Auth
    B1["NextAuth.js (Google, Credentials)"]
    B2["Prisma Adapter"]
    B3["Cloud SQL/Postgres (Users, Sessions)"]
  end

  subgraph FileUpload
    C1["Upload API (/api/upload)"]
    C2["Google Cloud Storage (Files)"]
    C3["Prisma (Document Metadata)"]
    C4["Firestore (Document Metadata)"]
  end

  subgraph Ingestion
    D1["Ingest API (/api/ingest)"]
    D2["Google Cloud Storage (Download File)"]
    D3["Firestore (Document)"]
    D4["OpenAI (Embeddings)"]
    D5["Firestore (Chunks, Embeddings)"]
  end

  subgraph Chat
    E1["Home/Chat UI"]
    E2["Create Chat Session API (/api/create_chat_session)"]
    E3["Prisma (ChatSession, ChatMessage)"]
    E4["Chat Page (Chat UI)"]
    E5["Query API (/api/query)"]
    E6["RAG Pipeline"]
    E7["Vertex AI Vector Search"]
    E8["DeepSeek Reasoning Model (deepseek-reasoner)"]
    E9["AI Response + Sources"]
    E10["Real-Time Thinking Display"]
  end

  subgraph RAGSession
    F1["RAG Session API (/api/rag_session)"]
    F2["Firestore (rag_sessions)"]
  end

  subgraph Feedback
    G1["Feedback UI"]
    G2["Feedback API (/api/feedback)"]
    G3["Prisma (feedback)"]
  end

  subgraph Admin
    H1["Admin Dashboard UI"]
    H2["Admin API (/api/admin/*)"]
    H3["Prisma (Admin, AdminInvite)"]
  end

  %% Auth Flow
  A1 -- "Login/Signup" --> B1
  B1 -- "Adapter" --> B2
  B2 -- "User/Session" --> B3
  B3 -- "Session" --> A1

  %% File Upload Flow
  A1 -- "Upload File" --> C1
  C1 -- "Store" --> C2
  C1 -- "Metadata" --> C3
  C1 -- "Metadata" --> C4

  %% Ingestion Flow
  C4 -- "Trigger Ingest" --> D1
  D1 -- "Download" --> D2
  D2 -- "Text Extraction" --> D3
  D3 -- "Split/Chunk" --> D5
  D5 -- "Embed" --> D4
  D4 -- "Store Embeddings" --> D5

  %% Chat Flow
  A1 -- "First Prompt" --> E2
  E2 -- "Create Session" --> E3
  E3 -- "Session ID" --> E4
  E4 -- "Send Message" --> E5
  E5 -- "RAG/LLM" --> E6
  E6 -- "Retrieve" --> E7
  E7 -- "Context" --> E8
  E8 -- "Reasoning Content + Final Content" --> E9
  E9 -- "Display" --> E4
  E8 -- "Thinking Stream" --> E10
  E10 -- "Real-Time Display" --> A2

  %% RAG Session
  E4 -- "Start RAG Session" --> F1
  F1 -- "Session State" --> F2

  %% Feedback
  E4 -- "Submit Feedback" --> G1
  G1 -- "Send" --> G2
  G2 -- "Store" --> G3

  %% Admin
  H1 -- "View Feedbacks" --> H2
```

## 🧠 **DeepSeek Reasoning Model Integration**

### **Native Reasoning Model**
- **Model**: `deepseek-reasoner` with native `reasoning_content` and `content` fields
- **Streaming**: Real-time streaming of thinking process and final response
- **Separation**: Automatic separation of internal analysis from user-facing content

### **Thinking Display Component**
- **File**: `app/components/ThinkingDisplay.tsx`
- **Features**: Collapsible interface, real-time streaming, professional styling
- **Integration**: Seamless integration with chat interface
- **Accessibility**: Screen reader friendly with ARIA attributes

### **Streaming Architecture**
```
DeepSeek Reasoning Model
├── reasoning_content (Internal Analysis)
│   ├── Task Classification
│   ├── Document Type Identification
│   ├── Objective Extraction
│   └── ... (12-step pipeline)
└── content (Final Response)
    ├── Professional Legal Analysis
    ├── Recommendations
    └── User-Facing Content
```

### **Frontend Integration**
- **State Management**: `isThinking` and `thinkingContent` states
- **Real-Time Updates**: Live streaming of thinking content
- **UI Components**: Professional thinking display with animations
- **Error Handling**: Robust fallback mechanisms

## Document Management UI

- The main page supports file upload with progress and error feedback.
- A document dashboard lists uploaded documents, allows download (via signed URL), and delete.
- All actions are per-user and require authentication.

## Admin Dashboard

- **Feedback Management**: View all user feedback with filtering and pagination
- **Admin Authentication**: Secure invitation-based admin system with audit trail
- **User Analytics**: Dashboard statistics and user activity monitoring
- **Admin Invitations**: Create and manage admin user invitations
- **Session Viewing**: View chat sessions to understand feedback context
- **Database Integration**: PostgreSQL-based storage with proper relations and constraints

## Test Scripts

- Test scripts are provided in the `scripts/` directory:
  ```bash
  # Firestore chat session fetch
  ts-node scripts/test-firestore-chat-sessions.ts
  # Firestore chat session creation
  ts-node scripts/test-firestore-chat-sessions.ts --create
  # Prisma user creation
  ts-node scripts/test-prisma.ts
  # File upload to GCS
  ts-node scripts/test-upload-gcs.ts
  # RAG query endpoint
  ts-node scripts/test-rag-query.ts
  # Feedback submission
  ts-node scripts/test-firestore-feedback.ts
  # Authentication (Google and credentials)
  ts-node scripts/test-auth-credentials.ts
  # OpenAI embedding
  ts-node scripts/test-openai-embedding.ts
  # DeepSeek API
  ts-node scripts/test-deepseek-api.ts
  # Supabase test (if used)
  ts-node scripts/test-supabase.ts
  ``` 