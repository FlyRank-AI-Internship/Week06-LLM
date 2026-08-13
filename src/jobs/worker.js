import { dequeue } from "./queue.js";
import {
  getJob,
  updateJob,
} from "./jobStore.js";

import { processTriage } from "../llm/processor.js";

const MAX_ATTEMPTS = 3;

let workerRunning = false;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Only retry temporary/transient failures
function isRetryableError(error) {
  const status = error?.status;

  // Network / timeout errors
  if (
    error?.name === "APIConnectionTimeoutError" ||
    error?.code === "ETIMEDOUT" ||
    error?.code === "ECONNRESET" ||
    error?.code === "ECONNABORTED"
  ) {
    return true;
  }

  // Rate limiting
  if (status === 429) {
    return true;
  }

  // Temporary provider/server errors
  if (status >= 500 && status <= 599) {
    return true;
  }

  // 400 / 401 / 403 etc. are permanent failures
  return false;
}

async function processJob(jobId) {
  const job = getJob(jobId);

  if (!job) {
    return;
  }

  // Idempotency protection:
  // a completed job must never be processed again.
  if (job.status === "completed") {
    console.log(
      `Job ${jobId} already completed. Skipping.`
    );
    return;
  }

  const attempt = (job.attempts ?? 0) + 1;

  updateJob(jobId, {
    status: "processing",
    attempts: attempt,
  });

  try {
    const result = await processTriage(job.input.text);

    updateJob(jobId, {
      status: "completed",
      result: result.data,
      error: null,
      completedAt: new Date().toISOString(),
    });

    console.log(`Job ${jobId} completed.`);
  } catch (error) {
    console.error(
      `Job ${jobId} failed on attempt ${attempt}:`,
      error?.message ?? error
    );

    const retryable = isRetryableError(error);

    // Retry only temporary failures
    if (retryable && attempt < MAX_ATTEMPTS) {
      updateJob(jobId, {
        status: "queued",
        error: error?.message ?? "Unknown error",
      });

      const delay = 1000 * 2 ** (attempt - 1);

      console.log(
        `Retrying job ${jobId} in ${delay}ms`
      );

      await sleep(delay);

      enqueueAgain(jobId);
      return;
    }

    // Permanent failure or retry limit reached
    updateJob(jobId, {
      status: "failed",
      error: error?.message ?? "Unknown error",
      failedAt: new Date().toISOString(),
    });

    // Alert/log so permanent failures are visible
    console.error(
      JSON.stringify({
        type: "job_alert",
        jobId,
        message: "Background job permanently failed",
        attempts: attempt,
        retryable,
        error: error?.message ?? "Unknown error",
      })
    );
  }
}

function enqueueAgain(jobId) {
  import("./queue.js").then(({ enqueue }) => {
    enqueue(jobId);
  });
}

export async function startWorker() {
  if (workerRunning) {
    return;
  }

  workerRunning = true;

  console.log("Background worker started.");

  while (workerRunning) {
    const jobId = dequeue();

    if (!jobId) {
      await sleep(500);
      continue;
    }

    await processJob(jobId);
  }
}