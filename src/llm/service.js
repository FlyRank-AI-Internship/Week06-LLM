import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { llmClient } from "./client.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const promptPath = path.resolve(
  __dirname,
  "../../prompts/triage-v1.md"
);

async function loadPrompt() {
  return fs.readFile(promptPath, "utf8");
}

export async function triageWithLLM(text) {
  const systemPrompt = await loadPrompt();

  const response = await llmClient.chat.completions.create({
    model: process.env.LLM_MODEL,
    temperature: 0,
    messages: [
      {
        role: "system",
        content: systemPrompt,
      },
      {
        role: "user",
        content: JSON.stringify({
          text,
        }),
      },
    ],
  });

  return response.choices[0]?.message?.content ?? "";
}