function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isTimeout(error) {
  return (
    error?.name === "APIConnectionTimeoutError" ||
    error?.code === "ETIMEDOUT" ||
    error?.code === "ECONNABORTED"
  );
}

function shouldRetry(error) {
  const status = error?.status;

  if (isTimeout(error)) {
    return true;
  }

  if (status === 429) {
    return true;
  }

  if (status >= 500 && status <= 599) {
    return true;
  }

  return false;
}

function getRetryAfterMs(error) {
  const value =
    error?.headers?.get?.("retry-after") ??
    error?.headers?.["retry-after"];

  if (!value) {
    return null;
  }

  const seconds = Number(value);

  if (Number.isFinite(seconds)) {
    return seconds * 1000;
  }

  const retryDate = Date.parse(value);

  if (!Number.isNaN(retryDate)) {
    return Math.max(0, retryDate - Date.now());
  }

  return null;
}

export async function withRetry(operation, maxRetries = 3) {
  let retryCount = 0;

  while (true) {
    try {
      const result = await operation();

      return {
        result,
        retryCount,
      };
    } catch (error) {
      if (!shouldRetry(error) || retryCount >= maxRetries) {
        error.retryCount = retryCount;
        throw error;
      }

      let delayMs;

      if (error?.status === 429) {
        delayMs = getRetryAfterMs(error);
      }

      if (delayMs == null) {
        // 1s, 2s, 4s + small random jitter
        const baseDelay = 1000 * 2 ** retryCount;
        const jitter = Math.floor(Math.random() * 300);

        delayMs = baseDelay + jitter;
      }

      retryCount += 1;

      console.warn(
        `Retrying LLM call ${retryCount}/${maxRetries} after ${delayMs}ms`
      );

      await sleep(delayMs);
    }
  }
}