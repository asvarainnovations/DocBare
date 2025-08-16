import { NextRequest, NextResponse } from 'next/server';
import { validateRequest } from '@/lib/validation';
import { withRateLimit, rateLimitConfigs } from '@/lib/rateLimit';
import { aiLogger } from '@/lib/logger';
import firestore from '@/lib/firestore';

// Type definitions for search results
interface DocumentData {
  id: string;
  type: string;
  filename?: string;
  text?: string;
  uploadDate?: Date;
  createdAt?: Date;
  [key: string]: any;
}

interface ChatData {
  id: string;
  type: string;
  sessionName?: string;
  title?: string;
  createdAt?: Date;
  [key: string]: any;
}

interface MessageData {
  id: string;
  type: string;
  content?: string;
  createdAt?: Date;
  [key: string]: any;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    const query = searchParams.get('q') || '';
    const type = searchParams.get('type') || 'all'; // all, documents, chats, messages
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');

    if (!userId) {
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
    }

    aiLogger.info("Search request received", {
      userId,
      query: query.substring(0, 100),
      type,
      limit,
      offset
    });

    const results: any = {
      documents: [],
      chats: [],
      messages: [],
      total: 0
    };

    // Search documents
    if (type === 'all' || type === 'documents') {
      let documentsQuery = firestore.collection('documents')
        .where('userId', '==', userId);

      // Add date filters if provided
      if (dateFrom) {
        documentsQuery = documentsQuery.where('uploadDate', '>=', new Date(dateFrom));
      }
      if (dateTo) {
        documentsQuery = documentsQuery.where('uploadDate', '<=', new Date(dateTo));
      }

      const documentsSnapshot = await documentsQuery.get();
      let documents = documentsSnapshot.docs.map(doc => ({
        id: doc.id,
        type: 'document',
        ...doc.data()
      })) as DocumentData[];

      // Filter by search query if provided
      if (query) {
        documents = documents.filter(doc => 
          doc.filename?.toLowerCase().includes(query.toLowerCase()) ||
          doc.text?.toLowerCase().includes(query.toLowerCase())
        );
      }

      // Sort documents
      documents.sort((a, b) => {
        const aVal = a[sortBy] || new Date(0);
        const bVal = b[sortBy] || new Date(0);
        return sortOrder === 'desc' ? 
          (bVal > aVal ? 1 : -1) : 
          (aVal > bVal ? 1 : -1);
      });

      results.documents = documents.slice(offset, offset + limit);
    }

    // Search chat sessions
    if (type === 'all' || type === 'chats') {
      let chatsQuery = firestore.collection('chat_sessions')
        .where('userId', '==', userId);

      // Add date filters if provided
      if (dateFrom) {
        chatsQuery = chatsQuery.where('createdAt', '>=', new Date(dateFrom));
      }
      if (dateTo) {
        chatsQuery = chatsQuery.where('createdAt', '<=', new Date(dateTo));
      }

      const chatsSnapshot = await chatsQuery.get();
      let chats = chatsSnapshot.docs.map(doc => ({
        id: doc.id,
        type: 'chat',
        ...doc.data()
      })) as ChatData[];

      // Filter by search query if provided
      if (query) {
        chats = chats.filter(chat => 
          chat.sessionName?.toLowerCase().includes(query.toLowerCase()) ||
          chat.title?.toLowerCase().includes(query.toLowerCase())
        );
      }

      // Sort chats
      chats.sort((a, b) => {
        const aVal = a[sortBy] || new Date(0);
        const bVal = b[sortBy] || new Date(0);
        return sortOrder === 'desc' ? 
          (bVal > aVal ? 1 : -1) : 
          (aVal > bVal ? 1 : -1);
      });

      results.chats = chats.slice(offset, offset + limit);
    }

    // Search messages
    if (type === 'all' || type === 'messages') {
      // First get all chat sessions for the user
      const userChatsSnapshot = await firestore.collection('chat_sessions')
        .where('userId', '==', userId)
        .get();
      
      const userChatIds = userChatsSnapshot.docs.map(doc => doc.id);
      
      if (userChatIds.length > 0) {
        let messagesQuery = firestore.collection('chat_messages')
          .where('sessionId', 'in', userChatIds.slice(0, 10)); // Firestore limit of 10 for 'in' queries

        // Add date filters if provided
        if (dateFrom) {
          messagesQuery = messagesQuery.where('createdAt', '>=', new Date(dateFrom));
        }
        if (dateTo) {
          messagesQuery = messagesQuery.where('createdAt', '<=', new Date(dateTo));
        }

        const messagesSnapshot = await messagesQuery.get();
        let messages = messagesSnapshot.docs.map(doc => ({
          id: doc.id,
          type: 'message',
          ...doc.data()
        })) as MessageData[];

        // Filter by search query if provided
        if (query) {
          messages = messages.filter(msg => 
            msg.content?.toLowerCase().includes(query.toLowerCase())
          );
        }

        // Sort messages
        messages.sort((a, b) => {
          const aVal = a[sortBy] || new Date(0);
          const bVal = b[sortBy] || new Date(0);
          return sortOrder === 'desc' ? 
            (bVal > aVal ? 1 : -1) : 
            (aVal > bVal ? 1 : -1);
        });

        results.messages = messages.slice(offset, offset + limit);
      }
    }

    // Calculate total results
    results.total = results.documents.length + results.chats.length + results.messages.length;

    // If searching for specific type, return only that type
    if (type !== 'all') {
      const typeResults = results[type as keyof typeof results] || [];
      return NextResponse.json({
        results: typeResults,
        total: typeResults.length,
        type,
        query,
        limit,
        offset
      });
    }

    // For 'all' type, combine and sort results
    const allResults = [
      ...results.documents,
      ...results.chats,
      ...results.messages
    ].sort((a, b) => {
      const aVal = a[sortBy] || new Date(0);
      const bVal = b[sortBy] || new Date(0);
      return sortOrder === 'desc' ? 
        (bVal > aVal ? 1 : -1) : 
        (aVal > bVal ? 1 : -1);
    }).slice(offset, offset + limit);

    aiLogger.success("Search completed", {
      userId,
      query: query.substring(0, 100),
      totalResults: allResults.length,
      type
    });

    return NextResponse.json({
      results: allResults,
      total: results.total,
      type,
      query,
      limit,
      offset
    });

  } catch (error: any) {
    aiLogger.error("Search failed", error);
    return NextResponse.json(
      { error: "Search failed" },
      { status: 500 }
    );
  }
} 