import express from "express";
import {
  triageInputSchema,
  triageOutputSchema,
  TRIAGE_STUB_RESPONSE,
} from "../llm/schema.js";

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

  if (process.env.LLM_STUB === "1") {
    const stubResult = triageOutputSchema.safeParse(TRIAGE_STUB_RESPONSE);

    if (!stubResult.success) {
      return res.status(500).json({
        error: "Stub response does not match output schema",
      });
    }

    return res.status(200).json(stubResult.data);
  }

  return res.status(503).json({
    error: "LLM integration is not enabled yet",
  });
});

export default router;