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

export const PROMPT_VERSION = "triage-v1";

async function loadPrompt() {
  return fs.readFile(promptPath, "utf8");
}

async function callModel(messages) {
  const response = await llmClient.chat.completions.create({
    model: process.env.LLM_MODEL,
    temperature: 0,
    messages,
  });

  return response.choices[0]?.message?.content ?? "";
}

export async function triageWithLLM(text) {
  const systemPrompt = await loadPrompt();

  return callModel([
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
  ]);
}

export async function repairTriageOutput({
  text,
  brokenOutput,
  validationError,
}) {
  const systemPrompt = await loadPrompt();

  return callModel([
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
    {
      role: "assistant",
      content: brokenOutput,
    },
    {
      role: "user",
      content: `
Your previous answer was rejected.

Validation error:
${validationError}

Return only corrected JSON matching the required schema.
Do not include markdown, explanation, or code fences.
`,
    },
  ]);
}