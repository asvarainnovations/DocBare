import { POST } from "../../app/api/create_chat_session/route";
import { NextRequest } from "next/server";

function mockRequest(body: any) {
  return {
    json: async () => body,
  } as unknown as NextRequest;
}

describe("/api/create_chat_session", () => {
  it("should create a chat session with valid data", async () => {
    const req = mockRequest({ firstMessage: "Hello", userId: "test-user" });
    const res = await POST(req);
    expect(res.status).toBe(200);
    
    // Optional:
    const data = await res.json();
    expect(data.chatId).toBeDefined();
  });

  it("should fail if userId is missing", async () => {
    const req = mockRequest({ firstMessage: "Hello" });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("should fail if firstMessage is missing", async () => {
    const req = mockRequest({ userId: "test-user" });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});
