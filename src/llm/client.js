import OpenAI from "openai";

export const llmClient = new OpenAI({
  baseURL: process.env.LLM_BASE_URL,
  apiKey: process.env.LLM_API_KEY,

  // Stage 4 requirements
  timeout: 30_000,

  // Disable SDK automatic retries.
  // We implement our own explicit retry policy.
  maxRetries: 0,
});