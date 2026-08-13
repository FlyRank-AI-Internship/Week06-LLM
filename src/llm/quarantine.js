import fs from "node:fs/promises";
import path from "node:path";

const quarantinePath = path.resolve(
  process.cwd(),
  "logs",
  "quarantine.jsonl"
);

export async function writeQuarantine(entry) {
  await fs.mkdir(path.dirname(quarantinePath), {
    recursive: true,
  });

  const line =
    JSON.stringify({
      timestamp: new Date().toISOString(),
      ...entry,
    }) + "\n";

  await fs.appendFile(quarantinePath, line, "utf8");
}