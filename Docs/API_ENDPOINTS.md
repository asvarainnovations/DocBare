# API Endpoints Documentation

Below are the main API endpoints for DocBare. All endpoints are under `/api/`.

## Authentication
- **POST /api/auth/register**: Register a new user
  - Request: `{ email: string, password: string }`
  - Response: `{ ok: true }` or error
- **POST /api/auth/[...nextauth]**: NextAuth.js authentication (Google, Credentials)

## Chat Sessions
- **POST /api/create_chat_session**: Create a new chat session
  - Request: `{ firstMessage: string, userId: string }`
  - Response: `{ chatId: string }`
  - **Note**: Automatically stores the first user message in conversation memory
- **GET /api/user_chats?userId=...**: List all chat sessions for a user
  - Response: `{ chats: Array<{ id, sessionName, ... }> }`
- **GET /api/sessions/[sessionId]**: Get all messages for a chat session
  - Response: `{ messages: Array<{ role, content, ... }> }`
- **DELETE /api/sessions/[sessionId]**: Delete a chat session
- **GET /api/sessions/[sessionId]/metadata**: Get metadata for a chat session

## Chat & Query
- **POST /api/chat**: Add a message to a chat session
  - Request: `{ sessionId, userId, role, content }`
  - Response: `{ message }`
  - **Note**: Stores user messages in conversation memory for context
- **POST /api/query**: Get AI response for a query (streamed)
  - Request: `{ query, userId, sessionId, mode? }`
  - Response: `{ answer }` (streamed)
  - **Note**: Supports both 'pleadsmart' and 'docbare' modes, stores AI responses in conversation memory

## Documents
- **POST /api/upload**: Upload one or more documents
  - Request: `FormData` with `file` or `files[]`, and `userId`
  - Response: `{ results: Array<{ name, status, url, ... }> }`
- **GET /api/documents/list?userId=...**: List all documents for a user
  - Response: `{ documents: Array<{ id, filename, ... }> }`
- **DELETE /api/documents/delete?userId=...&documentId=...**: Delete a document
  - Response: `{ status: 'deleted' }`
- **GET /api/documents/signed_url?userId=...&documentId=...**: Get a signed download URL
  - Response: `{ url }`

## Feedback
- **POST /api/feedback**: Submit feedback for a message or session
  - Request: `{ sessionId, userId, rating, messageIndex?, comments? }`
  - Response: `{ success: true, feedbackId: string }`
- **GET /api/feedback/[sessionId]**: Get all feedback for a session
  - Response: `{ feedbacks: Array<{ id, userId, rating, messageIndex, comments, createdAt, user, session }> }`
- **GET /api/feedback**: Get feedbacks with optional filtering
  - Query params: `sessionId?`, `userId?`
  - Response: `{ feedbacks: Array<{ id, userId, rating, messageIndex, comments, createdAt, user, session }> }`

## RAG Sessions
- **POST /api/rag_session**: Create a new RAG session
- **PATCH /api/rag_session**: Update a RAG session
- **GET /api/rag_session/[sessionId]**: Get a RAG session by ID

## Ingest
- **POST /api/ingest**: Ingest a document for embeddings
  - Request: `FormData` with `file` and `userId`
  - Response: `{ success: true, message: string, data: { fileName, chunks, characters, confidence, method, suggestions } }`
  - Features: Google Document AI processing, OCR, entity extraction, confidence scoring, rate limiting

## Account
- **GET /api/account/providers**: List linked auth providers

## Admin (Admin Access Required)
- **GET /api/admin/dashboard/stats**: Get dashboard statistics
  - Response: `{ totalFeedbacks, goodFeedbacks, badFeedbacks, activeUsers }`
- **GET /api/admin/feedbacks**: Get all feedbacks with pagination and filtering
  - Query params: `page?`, `limit?`, `rating?` (good/bad)
  - Response: `{ feedbacks: Array<{ id, userId, rating, messageIndex, comments, createdAt, user, session }>, pagination: { page, limit, total, totalPages, hasNextPage, hasPrevPage } }`
- **POST /api/admin/invites**: Create admin invitation
  - Request: `{ email: string }`
  - Response: `{ inviteCode: string, inviteUrl: string }`
- **GET /api/admin/invites**: List pending invitations
  - Response: `{ invites: Array<{ code, email, createdAt, expiresAt, redeemed }> }`
- **GET /api/admin/invites/validate?code=...**: Validate invite code
  - Response: `{ valid: boolean, email?: string, expired?: boolean }`

---

For detailed request/response formats, see the code in `app/api/` or contact the maintainers. 