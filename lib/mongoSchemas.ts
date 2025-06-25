import { ObjectId } from 'mongodb';

export interface MongoDocument {
  _id?: ObjectId;
  userId: string; // UUID from Postgres
  filename: string;
  contentType: string;
  uploadDate: Date;
  status: 'pending' | 'processed' | 'error';
  metadata?: {
    pageCount?: number;
    author?: string;
    source?: string;
    [key: string]: any;
  };
}

export interface DocumentChunk {
  _id?: ObjectId;
  documentId: ObjectId;
  chunkIndex: number;
  text: string;
  tokenCount: number;
  createdAt: Date;
}

export interface Embedding {
  _id?: ObjectId;
  chunkId: ObjectId;
  vector: number[];
  model: string;
  createdAt: Date;
}

export interface RagSession {
  _id?: ObjectId;
  userId: string;
  sessionName?: string;
  createdAt: Date;
  lastAccessed: Date;
  documentIds: ObjectId[];
  memory: Array<{
    chunkId: ObjectId;
    score: number;
  }>;
  agentState: {
    currentStep?: string;
    toolCalls?: Array<{
      tool: string;
      input: any;
      output: any;
      timestamp: Date;
    }>;
    [key: string]: any;
  };
  status: 'running' | 'completed' | 'failed';
  result?: {
    summary?: string;
    draftUrl?: string;
    logs?: string[];
  };
}

export interface Feedback {
  _id?: ObjectId;
  sessionId: ObjectId;
  userId: string;
  rating: number;
  comments?: string;
  createdAt: Date;
} 