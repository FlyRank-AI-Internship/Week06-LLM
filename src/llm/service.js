import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { llmClient } from "./client.js";
import { withRetry } from "./retry.js";
import { logLLMCall } from "./logger.js";

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

async function callModel(messages, repairCount = 0) {
  const startedAt = Date.now();

  try {
    const { result: response, retryCount } = await withRetry(
      () =>
        llmClient.chat.completions.create({
          model: process.env.LLM_MODEL,
          temperature: 0,
          messages,
        }),
      3
    );

    const durationMs = Date.now() - startedAt;

    logLLMCall({
      promptVersion: PROMPT_VERSION,
      model: process.env.LLM_MODEL,
      inputTokens: response.usage?.prompt_tokens ?? 0,
      outputTokens: response.usage?.completion_tokens ?? 0,
      durationMs,
      repairCount,
      retryCount,
      status: "success",
    });

    return response.choices[0]?.message?.content ?? "";
  } catch (error) {
    const durationMs = Date.now() - startedAt;

    logLLMCall({
      promptVersion: PROMPT_VERSION,
      model: process.env.LLM_MODEL,
      inputTokens: 0,
      outputTokens: 0,
      durationMs,
      repairCount,
      retryCount: error.retryCount ?? 0,
      status: "failed",
    });

    throw error;
  }
}

export async function triageWithLLM(text) {
  const systemPrompt = await loadPrompt();

  return callModel(
    [
      {
        role: "system",
        content: systemPrompt,
      },
      {
        role: "user",
        content: JSON.stringify({ text }),
      },
    ],
    0
  );
}

export async function repairTriageOutput({
  text,
  brokenOutput,
  validationError,
}) {
  const systemPrompt = await loadPrompt();

  return callModel(
    [
      {
        role: "system",
        content: systemPrompt,
      },
      {
        role: "user",
        content: JSON.stringify({ text }),
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

Your previous answer was rejected for this reason.
Return only corrected JSON matching the schema.
Do not include markdown, explanation, or code fences.
`,
      },
    ],
    1
  );
}