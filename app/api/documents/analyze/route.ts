import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { z } from 'zod';
import { withRateLimit, rateLimitConfigs } from '@/lib/rateLimit';
import { aiLogger } from '@/lib/logger';
import firestore from '@/lib/firestore';

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY!;

// Schema for document analysis request
const DocumentAnalysisSchema = z.object({
  documentId: z.string().min(1, 'Document ID is required'),
  analysisType: z.string().min(1, 'Analysis type is required'),
  userId: z.string().min(1, 'User ID is required')
});

// Advanced document analysis using DeepSeek LLM
async function analyzeDocument(documentText: string, analysisType: string) {
  const startTime = Date.now();
  
  const systemPrompts = {
    summary: `You are an expert legal document analyst. Provide a comprehensive summary of the document including:
1. Document type and purpose
2. Key parties involved
3. Main terms and conditions
4. Important dates and deadlines
5. Critical obligations and rights
Format as a structured summary with clear sections.`,

    clauses: `You are an expert legal document analyst. Extract and categorize all legal clauses from the document:
1. Identify clause types (e.g., confidentiality, termination, liability, etc.)
2. Extract the exact clause text
3. Provide a brief explanation of each clause's purpose
4. Highlight any unusual or risky terms
Format as a structured list with clause type, text, and explanation.`,

    risks: `You are an expert legal risk analyst. Analyze the document for potential risks and issues:
1. Identify high-risk clauses or terms
2. Flag potential legal conflicts or ambiguities
3. Highlight missing protections or unfavorable terms
4. Assess overall risk level (Low/Medium/High)
5. Provide specific recommendations for risk mitigation
Format as a structured risk assessment with clear risk levels and recommendations.`,

    insights: `You are an expert legal advisor. Provide strategic insights about the document:
1. Overall assessment of fairness and balance
2. Key negotiation points or areas for improvement
3. Industry best practices comparison
4. Potential legal precedents or implications
5. Strategic recommendations for the client
Format as actionable insights with clear recommendations.`
  };

  const prompt = systemPrompts[analysisType as keyof typeof systemPrompts] || systemPrompts.summary;
  
  const truncatedText = documentText.length > 8000 ? documentText.substring(0, 8000) + '...' : documentText;
  
  const response = await axios.post(
    'https://api.deepseek.com/v1/chat/completions',
    {
      model: 'deepseek-reasoner',
      messages: [
        { role: 'system', content: prompt },
        { role: 'user', content: `Analyze this legal document:\n\n${truncatedText}` }
      ],
      max_tokens: 2048,
      temperature: 0.3,
    },
    {
      headers: { 'Authorization': `Bearer ${DEEPSEEK_API_KEY}` }
    }
  );

  const duration = Date.now() - startTime;
  aiLogger.aiRequest('DeepSeek', 'deepseek-reasoner', { analysisType, textLength: documentText.length });
  aiLogger.aiResponse('DeepSeek', 'deepseek-reasoner', duration, { analysisType });

  return response.data.choices[0].message.content;
}

export async function POST(req: NextRequest) {
  // Simple rate limiting check
  const clientIP = req.headers.get('x-forwarded-for') || req.ip || 'unknown';
  const rateLimitKey = `ai_rate_limit:${clientIP}`;
  
  // For now, skip complex rate limiting to avoid issues
  // TODO: Implement proper rate limiting later
    try {
      // Validate request
      let requestData;
      try {
        const body = await req.json();
        requestData = DocumentAnalysisSchema.parse(body);
      } catch (error) {
        if (error instanceof z.ZodError) {
          const errorMessage = error.errors.map(err => 
            `${err.path.join('.')}: ${err.message}`
          ).join(', ');
          
          aiLogger.warn('Document analysis validation failed', { 
            errors: error.errors,
            message: errorMessage 
          });

          return NextResponse.json(
            { 
              error: 'Validation failed', 
              details: error.errors,
              message: errorMessage 
            },
            { status: 400 }
          );
        }
        
        aiLogger.error('Unexpected validation error', error);
        return NextResponse.json(
          { error: 'Invalid request format' },
          { status: 400 }
        );
      }

      const { documentId, analysisType, userId } = requestData;
      
      aiLogger.info("Received document analysis request", {
        documentId,
        analysisType,
        userId
      });

      // Validate analysis type
      const validTypes = ['summary', 'clauses', 'risks', 'insights'];
      if (!validTypes.includes(analysisType)) {
        return NextResponse.json(
          { error: 'Invalid analysis type. Must be one of: summary, clauses, risks, insights' },
          { status: 400 }
        );
      }

      // Fetch document from Firestore
      const docRef = firestore.collection('documents').doc(documentId);
      const docSnap = await docRef.get();
      
      if (!docSnap.exists) {
        return NextResponse.json({ error: 'Document not found' }, { status: 404 });
      }

      const doc = docSnap.data();
      if (!doc || doc.userId !== userId) {
        return NextResponse.json({ error: 'Document access denied' }, { status: 403 });
      }

      // Get document text (from chunks if available, otherwise from doc.text)
      let documentText = doc.text || '';
      
      if (!documentText) {
        // Try to get text from chunks
        const chunksSnapshot = await firestore.collection('document_chunks')
          .where('documentId', '==', documentId)
          .orderBy('chunkIndex', 'asc')
          .get();
        
        if (!chunksSnapshot.empty) {
          documentText = chunksSnapshot.docs.map(doc => doc.data().text).join('\n\n');
        }
      }

      if (!documentText) {
        return NextResponse.json({ error: 'No text content found for analysis' }, { status: 400 });
      }

      // Perform analysis
      const analysis = await analyzeDocument(documentText, analysisType);

      // Store analysis result in Firestore
      const analysisDoc = {
        documentId,
        userId,
        analysisType,
        result: analysis,
        createdAt: new Date(),
        documentName: doc.filename || 'Unknown Document'
      };

      await firestore.collection('document_analyses').add(analysisDoc);

      aiLogger.success("Document analysis completed", {
        documentId,
        analysisType,
        resultLength: analysis.length
      });

      return NextResponse.json({
        analysis,
        analysisType,
        documentId,
        timestamp: new Date().toISOString()
      });

    } catch (error: any) {
      aiLogger.error("Document analysis failed", error);
      
      if (error.response?.data?.error?.message === "Insufficient Balance") {
        return NextResponse.json(
          { error: "DeepSeek API: Insufficient balance. Please check your account credits." },
          { status: 402 }
        );
      }

      return NextResponse.json(
        { error: "Failed to analyze document" },
        { status: 500 }
      );
    }
} 