import { POST } from '../../app/api/upload/route';
import { NextRequest } from 'next/server';

function mockFormData(body: any) {
  return {
    formData: async () => body,
  } as unknown as NextRequest;
}

describe('/api/upload', () => {
  it('should fail if userId is missing', async () => {
    const req = mockFormData({}); // No userId
    const res = await POST(req);
    expect(res.status).toBe(400);
  });
  it('should fail if file is missing', async () => {
    const req = mockFormData({ userId: 'test-user' });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });
  // For real file upload, use integration tests with a running server.
}); 