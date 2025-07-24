import { POST } from '../../app/api/query/route';
import { NextRequest } from 'next/server';

function mockRequest(body: any) {
  return {
    json: async () => body,
  } as unknown as NextRequest;
}

describe('/api/query', () => {
  it('should return an answer for a valid query', async () => {
    const req = mockRequest({ query: 'What is the capital of France?', userId: 'test-user', sessionId: 'test-session' });
    const res = await POST(req);
    expect(res.status).toBe(200);
    // Optionally: const data = await res.json(); expect(data.answer).toBeDefined();
  });

  it('should fail if query is missing', async () => {
    const req = mockRequest({ userId: 'test-user', sessionId: 'test-session' });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('should fail if userId is missing', async () => {
    const req = mockRequest({ query: 'What is the capital of France?', sessionId: 'test-session' });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });
}); 