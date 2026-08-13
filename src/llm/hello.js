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
        role: "user",
        content: "Reply with exactly the word: ready",
      },
    ],
    temperature: 0,
  });

  console.log(response.choices[0].message.content);
} catch (error) {
  console.error("LLM connection failed:");

  console.error(
    error?.message ?? error
  );

  process.exit(1);
}