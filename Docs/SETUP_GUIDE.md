# Setup Guide

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
     - `DATABASE_URL`, `DIRECT_URL` (PostgreSQL/Cloud SQL)
     - `OPENAI_API_KEY` (for embeddings)
     - `OPENAI_EMBEDDING_MODEL` (e.g. text-embedding-3-large)
     - `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `NEXTAUTH_URL`, `NEXTAUTH_SECRET`
     - `FIRESTORE_PROJECT_ID` (Firestore/NoSQL backend)
     - `FIRESTORE_DATABASE_ID` (optional, for multi-database support)
     - `GOOGLE_CLOUD_KEY_FILE` (path to GCP service account JSON, for local dev)
     - `GCS_BUCKET_NAME` (Google Cloud Storage bucket name)
     - `VERTEX_AI_INDEX_ENDPOINT` (Vertex AI Vector Search endpoint)
     - `VERTEX_AI_LOCATION` (Vertex AI region, e.g. us-central1)
     - `DEEPSEEK_API_KEY` (for LLM completions)
     - **Document AI Configuration:**
       - `GOOGLE_CLOUD_PROJECT_ID` (Google Cloud Project ID)
       - `DOCUMENT_AI_LOCATION` (Document AI location, default: us)
       - `DOCUMENT_AI_GENERAL_PROCESSOR_ID` (General document processor ID)
       - `DOCUMENT_AI_LEGAL_PROCESSOR_ID` (Legal document processor ID)
       - `DOCUMENT_AI_FORM_PROCESSOR_ID` (Form parser processor ID)
       - `DOCUMENT_AI_OCR_PROCESSOR_ID` (OCR processor ID)
       - `GOOGLE_APPLICATION_CREDENTIALS` (Service account key path)

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

## Backend Architecture

- **Next.js** (App Router, API routes)
- **Prisma ORM** (Cloud SQL/PostgreSQL for users, auth, subscriptions, chat session metadata)
- **Firestore** (GCP, for unstructured data: documents, chunks, embeddings, RAG sessions, agent state, feedback, chat)
- **Google Cloud Storage** (for file uploads)
- **Google Document AI** (for document processing, OCR, and text extraction)
- **OpenAI** (for embeddings)
- **DeepSeek** (for LLM/chat/completions)
- **NextAuth.js** (Google OAuth and credentials-based authentication)

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Google Firestore Documentation](https://cloud.google.com/firestore/docs)
- [Google Cloud Storage Documentation](https://cloud.google.com/storage/docs)
- [OpenAI API](https://platform.openai.com/docs)
- [DeepSeek API](https://api-docs.deepseek.com)
- [LangChain JS](https://js.langchain.com/docs/)
- [NextAuth.js](https://next-auth.js.org/)

## DocBare Documentation

- [Model Usage Guide](./MODEL_USAGE.md) - Comprehensive guide to all AI models used in the platform
- [Document AI Setup](./DOCUMENT_AI_SETUP.md) - Complete Google Document AI setup and configuration
- [Multi-Agent System](./MULTI_AGENT_SYSTEM.md) - Detailed documentation of the multi-agent architecture
- [System Architecture](./SYSTEM_ARCHITECTURE_DIAGRAM.md) - Complete system architecture diagram
- [Progress Status](./PROGRESS_STATUS.md) - Current development status and roadmap

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme). 