import express from "express";

import {
  triageInputSchema,
  triageOutputSchema,
  TRIAGE_STUB_RESPONSE,
} from "../llm/schema.js";

import { processTriage } from "../llm/processor.js";

const router = express.Router();

router.post("/triage", async (req, res) => {
  const inputResult = triageInputSchema.safeParse(req.body);

  if (!inputResult.success) {
    const issue = inputResult.error.issues[0];

    return res.status(400).json({
      error: "Invalid request",
      field: issue.path.join(".") || "body",
      message: issue.message,
    });
  }

  if (process.env.LLM_ENABLED === "false") {
    return res.status(503).json({
      error: "AI triage is temporarily unavailable",
      message: "The LLM feature is currently disabled.",
    });
  }

  if (process.env.LLM_STUB === "1") {
    const stubResult = triageOutputSchema.safeParse(
      TRIAGE_STUB_RESPONSE
    );

    if (!stubResult.success) {
      return res.status(500).json({
        error: "Stub response does not match output schema",
      });
    }

    return res.status(200).json(stubResult.data);
  }

  try {
    const result = await processTriage(
      inputResult.data.text
    );

    return res.status(200).json(result.data);
  } catch (error) {
    console.error(
      "Triage processing failed:",
      error?.message ?? error
    );

    if (error.code === "INVALID_LLM_OUTPUT") {
      return res.status(422).json({
        error: "Unable to produce a valid triage result",
        message:
          "The AI response failed schema validation after one repair attempt.",
      });
    }

    if (
      error?.name === "APIConnectionTimeoutError" ||
      error?.code === "ETIMEDOUT" ||
      error?.code === "ECONNABORTED"
    ) {
      return res.status(504).json({
        error: "LLM request timed out",
        message:
          "The AI provider did not respond within the allowed time.",
      });
    }

    return res.status(502).json({
      error: "LLM request failed",
    });
  }
});

export default router;