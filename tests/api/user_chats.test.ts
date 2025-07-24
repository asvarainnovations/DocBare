import { GET } from '../../app/api/user_chats/route';
import { NextRequest } from 'next/server';

function mockRequestWithParams(params: Record<string, string>) {
  const url = 'http://localhost/api/user_chats?' + new URLSearchParams(params).toString();
  return { url } as unknown as NextRequest;
}

describe('/api/user_chats', () => {
  it('should return chats for a valid userId', async () => {
    const req = mockRequestWithParams({ userId: 'test-user' });
    const res = await GET(req);
    expect(res.status).toBe(200);
    // Optionally: const data = await res.json(); expect(Array.isArray(data.chats)).toBe(true);
  });

  it('should fail if userId is missing', async () => {
    const req = mockRequestWithParams({});
    const res = await GET(req);
    expect(res.status).toBe(400);
  });
}); 