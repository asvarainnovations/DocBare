require("dotenv").config();
const axios = require("axios");

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

async function generateChatTitle(prompt) {
  console.log("Using API Key:", OPENAI_API_KEY ? "Present" : "Missing");

  const response = await axios.post(
    "https://api.openai.com/v1/chat/completions",
    {
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are a legal assistant. Create a concise, professional chat title (3-8 words) for this legal query. The title should be descriptive, clear, and relevant to the legal context. Return only the title, no quotes or extra text.`,
        },
        {
          role: "user",
          content: `Create a chat title for this legal query: "${prompt}"`,
        },
      ],
      max_tokens: 20,
      temperature: 0.3,
    },
    {
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
    }
  );

  console.log("Full API response:", JSON.stringify(response.data, null, 2));
  const content = response.data.choices[0].message.content.trim();
  console.log("Raw API response:", content);
  return content.replace(/^"|"$/g, "").replace(/^'|'$/g, "");
}

async function testTitleGeneration() {
  const testPrompts = [
    "I need help with a contract termination clause in my employment agreement",
    "Can you review this lease agreement and identify any potential issues?",
    "How do I file for a trademark for my company logo?",
    "I want to create a will, what documents do I need?",
    "How do I handle a dispute with my business partner?",
  ];

  console.log("🧪 Testing Improved Chat Title Generation...\n");

  for (let i = 0; i < testPrompts.length; i++) {
    const prompt = testPrompts[i];
    try {
      console.log(`📝 Test ${i + 1}: "${prompt}"`);
      const title = await generateChatTitle(prompt);
      console.log(`✅ Generated Title: "${title}"`);
      console.log("---");
    } catch (error) {
      console.log(`❌ Error: ${error.message}`);
      console.log("---");
    }
  }
}

testTitleGeneration().catch(console.error);
