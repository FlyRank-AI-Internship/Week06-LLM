import OpenAI from "openai";

const client = new OpenAI({
  baseURL: process.env.LLM_BASE_URL,
  apiKey: process.env.LLM_API_KEY,
});

try {
  const response = await client.chat.completions.create({
    model: process.env.LLM_MODEL,
    messages: [
      {
        role: "system",
        content:
          "This is a simple API connectivity test. Reply with exactly one lowercase word: ready. Do not add any explanation, label, punctuation, or safety classification.",
      },
      {
        role: "user",
        content: "Reply with exactly: ready",
      },
    ],
    temperature: 0,
  });

  console.log(response.choices[0].message.content);
} catch (error) {
  console.error("LLM connection failed:");
  console.error(error?.message ?? error);
  process.exit(1);
}