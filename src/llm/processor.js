import { triageOutputSchema } from "./schema.js";
import { extractJsonObject } from "./parse.js";
import {
  triageWithLLM,
  repairTriageOutput,
  PROMPT_VERSION,
} from "./service.js";
import { writeQuarantine } from "./quarantine.js";

function validateRawOutput(rawOutput) {
  let parsed;

  try {
    parsed = extractJsonObject(rawOutput);
  } catch (error) {
    return {
      success: false,
      error: `JSON parsing failed: ${error.message}`,
    };
  }

  const validation = triageOutputSchema.safeParse(parsed);

  if (!validation.success) {
    return {
      success: false,
      error: validation.error.issues
        .map((issue) => {
          const field = issue.path.join(".") || "output";
          return `${field}: ${issue.message}`;
        })
        .join("; "),
    };
  }

  return {
    success: true,
    data: validation.data,
  };
}

export async function processTriage(text) {
  // Attempt 1
  const firstRawOutput = await triageWithLLM(text);

  const firstResult = validateRawOutput(firstRawOutput);

  if (firstResult.success) {
    return {
      data: firstResult.data,
      repaired: false,
    };
  }

  // Exactly one repair attempt
  const repairedRawOutput = await repairTriageOutput({
    text,
    brokenOutput: firstRawOutput,
    validationError: firstResult.error,
  });

  const repairedResult = validateRawOutput(repairedRawOutput);

  if (repairedResult.success) {
    return {
      data: repairedResult.data,
      repaired: true,
    };
  }

  await writeQuarantine({
    input: {
      text,
    },
    promptVersion: PROMPT_VERSION,
    originalOutput: firstRawOutput,
    originalError: firstResult.error,
    repairedOutput: repairedRawOutput,
    repairedError: repairedResult.error,
  });

  const error = new Error(
    "The model could not produce a valid response."
  );

  error.code = "INVALID_LLM_OUTPUT";
  error.details = repairedResult.error;

  throw error;
}