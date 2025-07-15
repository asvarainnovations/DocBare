# Firestore Schema Documentation

This file documents the expected structure (schema) of all Firestore collections used in the DocBare codebase. Firestore is schemaless, but these are the fields your backend reads/writes for each collection.

---

## documents

```json
{
  "userId": "string",           // ID of the user who owns the document
  "filename": "string",         // Original file name
  "contentType": "string",      // MIME type (e.g., application/pdf)
  "uploadDate": "Timestamp",    // Upload date/time
  "status": "string",           // Status (e.g., 'pending', 'processed')
  "metadata": "object",         // Additional metadata (optional)
  "text": "string"              // Full text of the document (optional, for ingestion)
}
```

---

## document_chunks

```json
{
  "documentId": "string",       // ID of the parent document
  "userId": "string",           // ID of the user who owns the document
  "chunkIndex": "number",       // Index of the chunk in the document
  "text": "string",             // Text content of the chunk
  "tokenCount": "number",       // Number of tokens in the chunk
  "createdAt": "Timestamp"      // Creation date/time
}
```

---

## embeddings

```json
{
  "chunkId": "string",          // ID of the chunk this embedding belongs to
  "userId": "string",           // ID of the user who owns the document
  "vector": "number[]",         // Embedding vector
  "model": "string",            // Embedding model used (e.g., 'text-embedding-3-small')
  "createdAt": "Timestamp"      // Creation date/time
}
```

---

## chat_sessions

```json
{
  "userId": "string",           // ID of the user who owns the session
  "createdAt": "Timestamp",     // Session creation date/time
  "lastAccessed": "Timestamp",  // Last accessed date/time
  "sessionName": "string",      // Optional session name
  "documentIds": "string[]",    // IDs of documents used in the session (optional)
  // ... other session state fields
}
```

---

## chat_messages

```json
{
  "sessionId": "string",        // ID of the chat session
  "userId": "string",           // ID of the user who sent the message
  "role": "string",             // 'user' or 'ai'
  "content": "string",          // Message text
  "createdAt": "Timestamp"      // Message creation date/time
}
```

---

## feedback

```json
{
  "sessionId": "string",        // ID of the chat/session
  "userId": "string",           // ID of the user giving feedback
  "rating": "number",           // Rating (e.g., 1-5)
  "comments": "string",         // Optional comments
  "createdAt": "Timestamp"      // Feedback creation date/time
}
```

---

## rag_sessions

```json
{
  "userId": "string",           // ID of the user who owns the session
  "sessionName": "string",      // Optional session name
  "createdAt": "Timestamp",     // Session creation date/time
  "lastAccessed": "Timestamp",  // Last accessed date/time
  "documentIds": "string[]",    // IDs of documents used in the session
  "memory": "array",            // Agent memory (optional)
  "agentState": "object",       // Agent state (optional)
  "status": "string",           // Session status (e.g., 'running')
  "result": "object"            // Final result/output (optional)
}
```

---

## docbare_rag_logs

```json
{
  "userId": "string",           // ID of the user
  "query": "string",            // User query
  "answer": "string",           // AI answer
  "sources": "array",           // Source chunks used
  "createdAt": "Timestamp"      // Log creation date/time
}
```

---

## Notes
- All collections include a Firestore-generated document ID as the primary key.
- Timestamps are Firestore `Timestamp` objects.
- Some fields are optional or may be omitted depending on the operation.
- The schema is defined by backend logic and may evolve over time. 