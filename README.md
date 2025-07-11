# DocBare

A modern legal AI platform for agentic RAG (Retrieval-Augmented Generation), chat, and document analysis. Built with Next.js, Prisma, Supabase, MongoDB, and OpenAI.

---

## Getting Started

1. **Clone the repo:**
   ```bash
   git clone <your-repo-url>
   cd docbare
   ```
2. **Install dependencies:**
   ```bash
   npm install
   # or
   yarn install
   ```
3. **Set up your environment variables:**
   - Copy `.env.example` to `.env` and fill in all required values:
     - `DATABASE_URL`, `DIRECT_URL` (PostgreSQL/Supabase)
     - `MONGODB_URI` (MongoDB Atlas)
     - `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
     - `OPENAI_API_KEY` (for embeddings)
     - `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `NEXTAUTH_URL`, `NEXTAUTH_SECRET`
4. **Run database migrations:**
   ```bash
   npx prisma migrate dev
   ```
5. **Start the development server:**
   ```bash
   npm run dev
   # or
   yarn dev
   ```
6. **Open [http://localhost:3000](http://localhost:3000) in your browser.**

---

## Backend Architecture

- **Next.js** (App Router, API routes)
- **Prisma ORM** (PostgreSQL/Supabase for users, auth, subscriptions, chat session metadata)
- **MongoDB** (Atlas, for unstructured data: documents, chunks, embeddings, RAG sessions, agent state, feedback)
- **Supabase Storage** (for file uploads)
- **OpenAI** (for embeddings)
- **DeepSeek** (for LLM/chat/completions)
- **NextAuth.js** (Google OAuth and credentials-based authentication)

---

## API Endpoints

- `POST /api/upload` — Upload a file (Supabase + metadata in Postgres + MongoDB)
- `POST /api/ingest` — Ingest and embed a document (chunks/embeddings in MongoDB)
- `POST /api/query` — RAG: retrieve relevant chunks and synthesize answer
- `POST|GET /api/chat` — Store/retrieve chat messages (MongoDB)
- `POST|PATCH /api/rag_session` — Create/update a RAG session (MongoDB)
- `GET /api/rag_session/[sessionId]` — Fetch a RAG session by ID
- `POST /api/feedback` — Submit user feedback for a session
- `GET /api/feedback/[sessionId]` — Fetch all feedback for a session
- `GET /api/sessions/[sessionId]` — Fetch all chat messages for a session

---

## Progress

### ✅ Completed

- **Authentication:** Google OAuth and credentials (NextAuth.js, shared with Asvara site)
- **User Management:** Profile, API keys, subscriptions (Postgres/Supabase)
- **File Upload:** Supabase Storage integration, metadata in Postgres and MongoDB
- **Document Ingestion:** Chunking, embedding, and storage in MongoDB
- **RAG Pipeline (Production):**
  - Query embedding via DeepSeek API (or OpenAI/Gemini, configurable)
  - Semantic retrieval using Vertex AI Vector Search (GCP)
  - RAG prompt construction and answer synthesis using DeepSeek LLM
  - Logging of queries, answers, and sources to Cloud SQL (Prisma) and Firestore
  - All API endpoints implemented as Next.js API routes, ready for Cloud Run
- **Chat System:**
  - Chat session/message models in Prisma/Postgres
  - Chat message storage/retrieval in MongoDB
- **RAG Sessions:**
  - Session state, memory, agent state, and results in MongoDB
- **Feedback:** User feedback collection and retrieval
- **API Endpoints:** All major endpoints for upload, ingest, query, chat, session, and feedback
- **Indexing:** MongoDB indexes for all collections
- **Ingestion Script:** CLI for bulk document ingestion and embedding
- **Frontend Integration:**
  - Authentication integrated into UI (login, session management)
  - Home page creates new chat session and redirects to chat on first prompt
  - Chat page fetches messages/session metadata, sends messages, displays chat history
  - Axios for backend HTTP requests
  - RAG/AI response displayed after user message
  - Feedback UI for session rating/comments
  - Loading and error states for all major UI actions
  - Responsive, mobile-friendly chat UI with subtle animations
  - TypeScript and NextAuth type safety (session.user.id, type extensions, etc.)

### 🚧 TODO / In Progress

- **Prisma Document Model:** (issue in /api/upload.ts)
  - `prisma.document` is not yet available; add Document model to Prisma schema and migrate
- **Frontend:**
  - Further polish for chat/session/feedback UI
  - Display RAG session state and results
  - User dashboard for document and session management
- **Admin Tools:**
  - Admin dashboard for monitoring, analytics, and moderation
- **Security:**
  - Add rate limiting, improved error handling, and input validation
  - Add logging and monitoring for production
- **Testing:**
  - Add unit/integration tests for all APIs
- **Docs:**
  - Document all API endpoints and request/response formats
  - Add setup and deployment instructions for contributors
- **Advanced RAG:**
  - Multi-modal support (images, audio)
  - More advanced agent orchestration and tool use
  - Multi-step agentic reasoning and reranking (planned enhancement)

---

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [MongoDB Atlas](https://www.mongodb.com/atlas)
- [OpenAI API](https://platform.openai.com/docs)
- [LangChain JS](https://js.langchain.com/docs/)
- [NextAuth.js](https://next-auth.js.org/)

---

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme).

---

## System Architecture & Workflow

```mermaid
flowchart TD
  subgraph User
    A1["Web App (Next.js React UI)"]
  end

  subgraph Auth
    B1["NextAuth.js (Google, Credentials)"]
    B2["Prisma Adapter"]
    B3["Postgres/Supabase (Users, Sessions)"]
  end

  subgraph FileUpload
    C1["Upload API (/api/upload)"]
    C2["Supabase Storage (Files)"]
    C3["Prisma (Document Metadata)"]
    C4["MongoDB (Document Metadata)"]
  end

  subgraph Ingestion
    D1["Ingest API (/api/ingest)"]
    D2["Supabase Storage (Download File)"]
    D3["MongoDB (Document)"]
    D4["OpenAI (Embeddings)"]
    D5["MongoDB (Chunks, Embeddings)"]
  end

  subgraph Chat
    E1["Home/Chat UI"]
    E2["Create Chat Session API (/api/create_chat_session)"]
    E3["Prisma (ChatSession, ChatMessage)"]
    E4["Chat Page (Chat UI)"]
    E5["Query API (/api/query)"]
    E6["DocBare Agent (LangChain)"]
    E7["MongoDB (Vector Search)"]
    E8["DeepSeek (LLM)"]
    E9["AI Response + Sources"]
  end

  subgraph RAGSession
    F1["RAG Session API (/api/rag_session)"]
    F2["MongoDB (rag_sessions)"]
  end

  subgraph Feedback
    G1["Feedback UI"]
    G2["Feedback API (/api/feedback)"]
    G3["MongoDB (feedback)"]
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
  E5 -- "RAG Pipeline" --> E6
  E6 -- "Retrieve" --> E7
  E6 -- "LLM Call" --> E8
  E6 -- "Return Answer+Sources" --> E9
  E9 -- "Display" --> E4

  %% RAG Session
  E4 -- "Start RAG Session" --> F1
  F1 -- "Store State" --> F2

  %% Feedback
  E4 -- "Submit Feedback" --> G1
  G1 -- "Send" --> G2
  G2 -- "Store" --> G3

  %% Data Flows
  C3 -- "User Docs" --> E4
  C4 -- "User Docs" --> E4
  F2 -- "Session State" --> E4
  G3 -- "Feedback" --> E4

  %% Legend
  classDef api fill:#f9f,stroke:#333,stroke-width:1px;
  class C1,D1,E2,E5,F1,G2 api;
  classDef db fill:#bbf,stroke:#333,stroke-width:1px;
  class B3,C2,C3,C4,D2,D3,D5,E3,E7,F2,G3 db;
  classDef ext fill:#bfb,stroke:#333,stroke-width:1px;
  class D4,E8 ext;
```

---
```mermaid
flowchart TD
  subgraph User
    A1["User Prompt"]
  end

  subgraph Agent
    B1["Agentic RAG (LangChain Agent)"]
    B2["LegalKnowledge Tool"]
    B3["SupremeCaseLaw Tool"]
    B4["(Optional) LegalGraph Tool"]
  end

  subgraph VectorDB
    C1["MongoDB: legal_knowledge_chunks"]
    C2["MongoDB: supreme_cases_chunks"]
  end

  subgraph GraphDB
    D1["Neo4j: Legal Knowledge Graph"]
  end

  A1 --> B1
  B1 --"if needed"--> B2
  B1 --"if needed"--> B3
  B1 --"if needed"--> B4
  B2 --> C1
  B3 --> C2
  B4 --> D1
  B1 -->|Synthesized Answer| A1
  ```

flowchart LR
  %% Frontend Layer
  subgraph Frontend
    UI["Web/Mobile UI"]
  end

  %% Agent Layer
  subgraph AgentLayer
    Agent["Vertex AI Agent<br/>(Gemini + Function Calls)"]
  end

  UI -- "Chat & API Calls" --> Agent

  %% Receipt Ingestion
  subgraph Ingestion
    ReceiptParser["Receipt Parser Service<br/>(Cloud Function/Run)"]
    VisionAPI["Document AI / Vision API"]
  end

  Agent -- "parseReceipt(img)" --> ReceiptParser
  ReceiptParser -- "OCR & Structuring" --> VisionAPI
  VisionAPI -- "Parsed Data" --> ReceiptParser

  %% Data Storage
  subgraph Storage
    Firestore["Firestore Database"]
  end

  ReceiptParser -- "Store Receipt Data" --> Firestore
  Agent -- "queryReceipts(params)" --> Firestore

  %% Pass Management
  subgraph PassMgmt
    PassManager["Wallet Pass Manager<br/>(Cloud Function/Run)"]
    WalletAPI["Google Wallet REST API"]
  end

  Agent -- "createPass(type,data)" --> PassManager
  PassManager -- "REST Calls" --> WalletAPI
  WalletAPI -- "JWT Save → User" --> UI

  %% Analytics Pipeline
  subgraph Analytics
    Scheduler["Cloud Scheduler"]
    PubSub["Pub/Sub Topic"]
    Analyzer["Financial Analyzer<br/>(Cloud Function)"]
    GeminiModel["Gemini Model (Vertex AI)"]
  end

  Scheduler -- "Daily Trigger" --> PubSub
  PubSub --> Analyzer
  Analyzer -- "Aggregate & Insights" --> Firestore
  Analyzer -- "invokeInsights(params)" --> GeminiModel
  GeminiModel -- "Insights JSON" --> Analyzer
  Analyzer -- "updatePass(insights)" --> PassManager

  %% Agent Multimodal Reasoning
  Agent -- "invokeReasoning(params)" --> GeminiModel
  GeminiModel -- "Results" --> Agent
```