export function extractJsonObject(rawText) {
  if (typeof rawText !== "string") {
    throw new Error("Model output is not text.");
  }

  let cleaned = rawText.trim();

  // Remove markdown code fences if model added them.
  cleaned = cleaned
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");

  if (firstBrace === -1 || lastBrace === -1 || lastBrace < firstBrace) {
    throw new Error("No JSON object found in model output.");
  }

  const jsonText = cleaned.slice(firstBrace, lastBrace + 1);

  return JSON.parse(jsonText);
}