# DeepSeek API Reference Guide

**Last Updated**: September 21, 2025  
**Purpose**: Comprehensive reference for DeepSeek API usage, patterns, and best practices

---

## 🎯 **CRITICAL REQUIREMENTS**

### **1. Model-Specific Parameters**

#### **deepseek-reasoner Model**
- ✅ **Supported**: `max_tokens`, `stream`, `response_format`
- ❌ **NOT Supported**: `temperature`, `top_p`, `presence_penalty`, `frequency_penalty`, `logprobs`, `top_logprobs`
- ⚠️ **Note**: Setting unsupported parameters won't cause errors but will have no effect

#### **deepseek-chat Model**
- ✅ **Supported**: All standard parameters including `temperature`, `top_p`, etc.

### **2. Response Structure**

#### **deepseek-reasoner Output**
```json
{
  "choices": [{
    "message": {
      "reasoning_content": "Chain of thought reasoning...",
      "content": "Final answer to user"
    }
  }]
}
```

#### **Streaming Response Structure**
```json
{
  "choices": [{
    "delta": {
      "reasoning_content": "chunk of reasoning...",
      "content": "chunk of final answer..."
    }
  }]
}
```

---

## 🔄 **MULTI-ROUND CONVERSATIONS**

### **Critical Rule: Stateless API**
- DeepSeek API is **stateless** - server doesn't remember previous context
- **MUST** send complete conversation history with each request
- **MUST** exclude `reasoning_content` from conversation history (causes 400 error)

### **Correct Pattern**
```python
# Round 1
messages = [{"role": "user", "content": "What's the highest mountain?"}]
response = client.chat.completions.create(
    model="deepseek-reasoner",
    messages=messages
)

# Round 2 - CRITICAL: Only include content, NOT reasoning_content
messages.append({"role": "assistant", "content": response.choices[0].message.content})
messages.append({"role": "user", "content": "What's the second?"})
response = client.chat.completions.create(
    model="deepseek-reasoner",
    messages=messages
)
```

### **❌ WRONG Pattern (Will Cause 400 Error)**
```python
# DON'T DO THIS - includes reasoning_content
messages.append({
    "role": "assistant", 
    "content": response.choices[0].message.content,
    "reasoning_content": response.choices[0].message.reasoning_content  # ❌ This causes 400 error
})
```

---

## 📡 **STREAMING API PATTERNS**

### **deepseek-reasoner Streaming**
```python
response = client.chat.completions.create(
    model="deepseek-reasoner",
    messages=messages,
    stream=True
)

reasoning_content = ""
content = ""

for chunk in response:
    if chunk.choices[0].delta.reasoning_content:
        reasoning_content += chunk.choices[0].delta.reasoning_content
    if chunk.choices[0].delta.content:
        content += chunk.choices[0].delta.content
```

### **Key Streaming Points**
- `delta.reasoning_content` contains Chain of Thought chunks
- `delta.content` contains final answer chunks
- Both fields can appear in the same chunk
- Process both fields separately for proper display

---

## 🎯 **JSON OUTPUT MODE**

### **Requirements**
1. Set `response_format={"type": "json_object"}`
2. Include word "json" in system/user prompt
3. Provide JSON format example in prompt
4. Set reasonable `max_tokens` to prevent truncation

### **Example**
```python
system_prompt = """
Parse the question and answer, output in JSON format.

EXAMPLE JSON OUTPUT:
{
    "question": "Which is the highest mountain?",
    "answer": "Mount Everest"
}
"""

response = client.chat.completions.create(
    model="deepseek-chat",
    messages=[
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": "Which is the longest river? The Nile River."}
    ],
    response_format={"type": "json_object"}
)
```

### **⚠️ JSON Mode Limitations**
- May occasionally return empty content
- Requires careful prompt engineering
- Works with `deepseek-chat`, not `deepseek-reasoner`

---

## 🔧 **FUNCTION CALLING**

### **Supported Models**
- ✅ `deepseek-chat`
- ❌ `deepseek-reasoner` (NOT supported)

### **Basic Pattern**
```python
tools = [{
    "type": "function",
    "function": {
        "name": "get_weather",
        "description": "Get weather of a location",
        "parameters": {
            "type": "object",
            "properties": {
                "location": {
                    "type": "string",
                    "description": "The city and state"
                }
            },
            "required": ["location"]
        }
    }
}]

response = client.chat.completions.create(
    model="deepseek-chat",
    messages=messages,
    tools=tools
)
```

### **Function Call Response Handling**
```python
message = response.choices[0].message
if message.tool_calls:
    tool = message.tool_calls[0]
    messages.append(message)
    messages.append({
        "role": "tool",
        "tool_call_id": tool.id,
        "content": "function_result"
    })
```

---

## ⚡ **CONTEXT CACHING (KV Cache)**

### **Automatic Feature**
- Enabled by default for all users
- No code changes required
- Optimizes repeated conversation prefixes

### **Cache Hit Conditions**
- Subsequent requests have overlapping prefixes with previous requests
- Only the **prefix** part triggers cache hit
- Reduces cost and latency for repeated context

### **Example: Multi-round Conversation**
```python
# First Request
messages = [
    {"role": "system", "content": "You are a helpful assistant"},
    {"role": "user", "content": "What is the capital of China?"}
]

# Second Request - System message + first user message = cache hit
messages = [
    {"role": "system", "content": "You are a helpful assistant"},  # Cache hit
    {"role": "user", "content": "What is the capital of China?"},  # Cache hit
    {"role": "assistant", "content": "The capital of China is Beijing."},
    {"role": "user", "content": "What is the capital of the United States?"}
]
```

---

## 🚨 **COMMON PITFALLS & SOLUTIONS**

### **1. Including reasoning_content in Conversation History**
- **Problem**: 400 error in subsequent API calls
- **Solution**: Only include `content` field, exclude `reasoning_content`

### **2. Using Unsupported Parameters with deepseek-reasoner**
- **Problem**: Parameters ignored silently
- **Solution**: Check model compatibility before setting parameters

### **3. Incomplete Streaming Response Processing**
- **Problem**: Missing reasoning or content chunks
- **Solution**: Process both `delta.reasoning_content` and `delta.content`

### **4. JSON Mode Empty Responses**
- **Problem**: Occasional empty content with JSON mode
- **Solution**: Improve prompt engineering, provide clear JSON examples

### **5. Function Calling with deepseek-reasoner**
- **Problem**: Function calling not supported
- **Solution**: Use `deepseek-chat` for function calling features

---

## 📋 **BEST PRACTICES**

### **1. Model Selection**
- Use `deepseek-reasoner` for complex reasoning tasks
- Use `deepseek-chat` for function calling and JSON output
- Consider context caching benefits for repeated prefixes

### **2. Conversation Management**
- Always maintain complete conversation history
- Filter out `reasoning_content` from history
- Use proper message role assignment

### **3. Streaming Implementation**
- Handle both reasoning and content streams
- Implement proper chunk buffering
- Provide user feedback for reasoning display

### **4. Error Handling**
- Check for 400 errors (usually parameter issues)
- Handle empty responses in JSON mode
- Implement retry logic for transient failures

### **5. Performance Optimization**
- Leverage context caching for repeated prefixes
- Use appropriate `max_tokens` limits
- Consider streaming for long responses

---

## 🔗 **USEFUL LINKS**

- [DeepSeek API Documentation](https://api-docs.deepseek.com/)
- [Reasoning Model Guide](https://api-docs.deepseek.com/guides/reasoning_model)
- [Multi-round Conversation](https://api-docs.deepseek.com/guides/multi_round_chat)
- [JSON Output Mode](https://api-docs.deepseek.com/guides/json_mode)
- [Function Calling](https://api-docs.deepseek.com/guides/function_calling)
- [Context Caching](https://api-docs.deepseek.com/guides/kv_cache)

---

**Note**: This reference guide should be consulted whenever implementing DeepSeek API features to ensure compliance with API requirements and best practices.
