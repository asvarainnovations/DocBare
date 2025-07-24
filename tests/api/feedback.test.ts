import { POST } from '../../app/api/feedback/route';
import { NextRequest } from 'next/server';

function mockRequest(body: any) {
  return {
    json: async () => body,
  } as unknown as NextRequest;
}

describe('/api/feedback', () => {
  it('should submit feedback with valid data', async () => {
    const req = mockRequest({ sessionId: 'test-session', userId: 'test-user', rating: 1, comments: 'Great!' });
    const res = await POST(req);
    expect(res.status).toBe(200);
  });

  it('should fail if sessionId is missing', async () => {
    const req = mockRequest({ userId: 'test-user', rating: 1 });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('should fail if userId is missing', async () => {
    const req = mockRequest({ sessionId: 'test-session', rating: 1 });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('should fail if rating is missing', async () => {
    const req = mockRequest({ sessionId: 'test-session', userId: 'test-user' });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });
}); 