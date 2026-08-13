export function logLLMCall({
  promptVersion,
  model,
  inputTokens,
  outputTokens,
  durationMs,
  repairCount,
  retryCount,
  status,
}) {
  console.log(
    JSON.stringify({
      type: "llm_call",
      timestamp: new Date().toISOString(),
      promptVersion,
      model,
      inputTokens,
      outputTokens,
      durationMs,
      repairCount,
      retryCount,
      status,
    })
  );
}