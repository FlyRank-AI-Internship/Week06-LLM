## Setup

Install dependencies:

```bash
npm install
```

Create a `.env` file based on `.env.example`:

```env
PORT=3000
LLM_BASE_URL=https://openrouter.ai/api/v1
LLM_API_KEY=your_api_key_here
LLM_MODEL=openrouter/free
LLM_STUB=0
LLM_ENABLED=true
```

Never commit the real `.env` file or API key.

## Run the API

Start the server:

```bash
npm start
```

Health check:

```text
GET http://localhost:3000/health
```

Expected response:

```json
{
  "status": "ok"
}
```

## API Endpoint

### POST `/api/triage`

Example request:

```bash
curl -X POST http://localhost:3000/api/triage \
  -H "Content-Type: application/json" \
  -d '{"text":"I was charged twice for the same invoice."}'
```

Example response:

```json
{
  "category": "billing",
  "urgency": "normal",
  "confidence": 0.95,
  "reason": "The customer is reporting a duplicate billing charge."
}
```

## Job Card

The endpoint performs one bounded AI task: classifying an incoming customer support message.

### Input

```json
{
  "text": "string, 1-2000 characters"
}
```

### Output

```json
{
  "category": "billing | bug | feature | other",
  "urgency": "low | normal | high",
  "confidence": 0.0,
  "reason": "one short sentence"
}
```

When the model is unsure, it should return `other` with confidence below `0.5` instead of guessing.

The full specification is available in `JOB-CARD.md`.

## Prompt Versioning

The production prompt is stored separately from the application code:

```text
prompts/triage-v1.md
```

Keeping the prompt in a versioned file makes prompt changes easier to review, test, and compare.

## Trust Boundary

LLM output is never trusted directly.

Every model response goes through the following process:

1. Extract and parse the JSON object.
2. Validate it against the Zod output schema.
3. If validation fails, perform exactly one repair attempt.
4. Validate the repaired response again.
5. If it still fails, return HTTP `422`.
6. Store the failed response in the quarantine log for debugging.

Raw invalid model output is never returned to the API caller.

## Reliability

Each model request has a maximum timeout of 30 seconds.

Automatic SDK retries are disabled using:

```text
maxRetries: 0
```

The application implements its own retry policy.

Retries are allowed only for:

- Request timeouts
- HTTP `429`
- HTTP `5xx`

The following errors are not retried:

- HTTP `400`
- HTTP `401`
- HTTP `403`

Retries use exponential backoff with jitter, approximately:

```text
1 second → 2 seconds → 4 seconds
```

When a `429` response provides a `Retry-After` value, the application respects it.

## Kill Switch

The AI feature can be disabled without changing the application code.

Set:

```env
LLM_ENABLED=false
```

When disabled, `/api/triage` immediately returns HTTP `503` without making an LLM request.

## Structured Logging

Each LLM call records operational information such as:

```json
{
  "type": "llm_call",
  "promptVersion": "triage-v1",
  "model": "openrouter/free",
  "inputTokens": 430,
  "outputTokens": 55,
  "durationMs": 2140,
  "repairCount": 0,
  "retryCount": 0,
  "status": "success"
}
```

Token counts and duration make the cost and performance of model calls visible.

## Evaluation

The API was evaluated using eight labelled cases covering:

- Billing messages
- Bug reports
- Feature requests
- General messages
- Edge cases
- Prompt-injection/adversarial input

Run the evaluation suite with:

```bash
npm run eval
```

### Latest Evaluation Result

**Date:** August 13, 2026  
**Prompt Version:** `triage-v1`

```text
Passed: 6/8
Score: 75.0%
```

### Evaluation Analysis

The category classification was correct in all eight cases:

```text
Category accuracy: 8/8 (100%)
```

Two exact-match cases failed because the predicted urgency differed from the labelled urgency.

**Case 3**

```text
Expected: bug / normal
Actual:   bug / high
```

**Case 8**

```text
Expected: other / low
Actual:   other / normal
```

These results show that the category classification is reliable on the current evaluation set, while the urgency rules need to be defined more precisely.

The labelled evaluation cases are stored in:

```text
evals/cases.json
```

## Security and Privacy

- API keys are stored only in environment variables.
- `.env` is excluded from Git.
- Model output is schema validated before use.
- User messages are kept separate from system instructions.
- Prompt-injection instructions inside customer messages are treated as data rather than trusted instructions.
- Invalid model responses are not exposed directly to callers.
- Real confidential or personal customer data should not be sent to free model endpoints.

## Limitations

LLM classifications are probabilistic.

Schema validation guarantees the structure of a successful response, but it cannot guarantee that every classification is semantically correct.

The current evaluation suite contains only eight labelled examples and should be expanded before using the endpoint in a production environment.

Urgency classification is currently less consistent than category classification.

## What I Would Improve With Another Day

I would create `triage-v2` with clearer definitions and examples for low, normal, and high urgency, then rerun the same evaluation suite to measure whether the change improves the 75% exact-match score without reducing category accuracy.

I would also expand the evaluation dataset with more ambiguous and adversarial messages.

## Project Structure

```text
ai-triage-api/
├── src/
│   ├── llm/
│   │   ├── client.js
│   │   ├── hello.js
│   │   ├── logger.js
│   │   ├── parse.js
│   │   ├── processor.js
│   │   ├── quarantine.js
│   │   ├── retry.js
│   │   ├── schema.js
│   │   └── service.js
│   ├── routes/
│   │   └── triage.js
│   └── server.js
├── prompts/
│   └── triage-v1.md
├── evals/
│   ├── cases.json
│   └── run-evals.js
├── JOB-CARD.md
├── .env.example
├── .gitignore
├── README.md
├── package.json
└── package-lock.json
```