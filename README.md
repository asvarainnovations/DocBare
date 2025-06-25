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
     - `OPENAI_API_KEY`
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
- **OpenAI** (for LLM and embeddings)
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
- **RAG Pipeline:** LangChain-based agent, vector search, and OpenAI integration
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
