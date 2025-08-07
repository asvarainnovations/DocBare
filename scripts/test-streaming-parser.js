// Test script to verify streaming response parsing
function parseStreamingResponse(rawChunk) {
  let aiResponse = '';
  const lines = rawChunk.split('\n');
  
  for (const line of lines) {
    if (line.startsWith('data: ')) {
      try {
        const jsonStr = line.slice(6); // Remove 'data: ' prefix
        if (jsonStr.trim() === '[DONE]') continue;
        
        const jsonData = JSON.parse(jsonStr);
        if (jsonData.choices && jsonData.choices[0] && jsonData.choices[0].delta && jsonData.choices[0].delta.content) {
          aiResponse += jsonData.choices[0].delta.content;
        }
      } catch (parseError) {
        console.warn('Failed to parse streaming chunk:', parseError);
      }
    }
  }
  
  return aiResponse;
}

// Test with sample streaming data
const sampleChunk = `data: {"id":"20d3a180-315a-4794-baf2-7bd3dfe849fa","object":"chat.completion.chunk","created":1754466198,"model":"deepseek-chat","system_fingerprint":"fp_8802369eaa_prod0623_fp8_kvcache","choices":[{"index":0,"delta":{"content":"Certainly"},"finish_reason":null}]}

data: {"id":"20d3a180-315a-4794-baf2-7bd3dfe849fa","object":"chat.completion.chunk","created":1754466198,"model":"deepseek-chat","system_fingerprint":"fp_8802369eaa_prod0623_fp8_kvcache","choices":[{"index":0,"delta":{"content":"! I'd"},"finish_reason":null}]}

data: {"id":"20d3a180-315a-4794-baf2-7bd3dfe849fa","object":"chat.completion.chunk","created":1754466198,"model":"deepseek-chat","system_fingerprint":"fp_8802369eaa_prod0623_fp8_kvcache","choices":[{"index":0,"delta":{"content":" be"},"finish_reason":null}]}

data: [DONE]`;

const result = parseStreamingResponse(sampleChunk);
console.log('🟦 [test][INFO] Parsed streaming response:');
console.log('Raw chunk:', sampleChunk);
console.log('Extracted text:', result);
console.log('Expected: "Certainly! I\'d be"');
console.log('✅ Test passed:', result === "Certainly! I'd be"); 