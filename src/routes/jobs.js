import express from "express";
import crypto from "node:crypto";

import {
  createJob,
  getJob,
} from "../jobs/jobStore.js";

import { enqueue } from "../jobs/queue.js";
import { triageInputSchema } from "../llm/schema.js";

const router = express.Router();

router.post("/triage-jobs", (req, res) => {
  const inputResult = triageInputSchema.safeParse(req.body);

  if (!inputResult.success) {
    const issue = inputResult.error.issues[0];

    return res.status(400).json({
      error: "Invalid request",
      field: issue.path.join(".") || "body",
      message: issue.message,
    });
  }
router.post("/jobs/:jobId/requeue", (req, res) => {
  const job = getJob(req.params.jobId);

  if (!job) {
    return res.status(404).json({
      error: "Job not found",
    });
  }

  enqueue(job.id);

  return res.status(202).json({
    jobId: job.id,
    status: job.status,
    message: "Job queued again for idempotency testing.",
  });
});

  const jobId = crypto.randomUUID();

  const job = {
    id: jobId,
    type: "triage",
    status: "queued",
    input: inputResult.data,
    result: null,
    error: null,
    attempts: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  createJob(job);
  enqueue(jobId);

  return res.status(202).json({
    jobId,
    status: "queued",
    statusUrl: `/api/jobs/${jobId}`,
  });
});

router.get("/jobs/:jobId", (req, res) => {
  const job = getJob(req.params.jobId);

  if (!job) {
    return res.status(404).json({
      error: "Job not found",
    });
  }

  return res.status(200).json({
    jobId: job.id,
    status: job.status,
    attempts: job.attempts,
    result: job.result,
    error: job.error,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
  });
});

export default router;