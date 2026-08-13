import fs from "node:fs/promises";

const API_URL =
  process.env.EVAL_API_URL ||
  "http://localhost:3000/api/triage";

const cases = JSON.parse(
  await fs.readFile(
    new URL("./cases.json", import.meta.url),
    "utf8"
  )
);

let passed = 0;
const results = [];

for (const testCase of cases) {
  const startedAt = Date.now();

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text: testCase.text,
      }),
    });

    const body = await response.json();

    const categoryMatch =
      body.category === testCase.expected.category;

    const urgencyMatch =
      body.urgency === testCase.expected.urgency;

    const success =
      response.ok &&
      categoryMatch &&
      urgencyMatch;

    if (success) {
      passed += 1;
    }

    results.push({
      id: testCase.id,
      expected: testCase.expected,
      actual: {
        category: body.category,
        urgency: body.urgency,
      },
      httpStatus: response.status,
      passed: success,
      durationMs: Date.now() - startedAt,
    });

    console.log(
      `${success ? "PASS" : "FAIL"} — Case ${testCase.id}`
    );

    if (!success) {
      console.log("  Expected:", testCase.expected);
      console.log("  Actual:", {
        category: body.category,
        urgency: body.urgency,
      });
    }
  } catch (error) {
    results.push({
      id: testCase.id,
      expected: testCase.expected,
      error: error.message,
      passed: false,
      durationMs: Date.now() - startedAt,
    });

    console.log(
      `FAIL — Case ${testCase.id}: ${error.message}`
    );
  }
}

const total = cases.length;
const score = (passed / total) * 100;

console.log("\n-------------------------");
console.log(`Passed: ${passed}/${total}`);
console.log(`Score: ${score.toFixed(1)}%`);
console.log("-------------------------");

await fs.writeFile(
  new URL("./results.json", import.meta.url),
  JSON.stringify(
    {
      timestamp: new Date().toISOString(),
      passed,
      total,
      score,
      results,
    },
    null,
    2
  )
);