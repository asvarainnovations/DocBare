import { NextRequest, NextResponse } from 'next/server';
import { createDocBareAgent } from '@/lib/docbareAgent';

export async function POST(req: NextRequest) {
  const { query } = await req.json();
  if (!query) {
    return NextResponse.json({ error: 'Missing query' }, { status: 400 });
  }

  const agent = await createDocBareAgent();
  const result = await agent.call({ query });

  return NextResponse.json({ answer: result.text, sources: result.sourceDocuments });
} 