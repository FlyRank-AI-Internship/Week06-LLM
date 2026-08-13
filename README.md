# Your First Background Job

## Overview

This project demonstrates the professional background-job pattern for slow operations.

Instead of keeping an HTTP request open while an AI model processes a support message, the API accepts the request immediately, creates a background job, and returns HTTP `202 Accepted` with a job ID.

A background worker processes the AI classification separately, while a status endpoint allows the client to check whether the job is queued, processing, completed, or failed.

## Architecture

```text
Client
  |
  | POST /api/triage-jobs
  v
API
  |
  | create job
  | enqueue job
  |
  +----> 202 Accepted + jobId
  |
  v
Queue
  |
  v
Background Worker
  |
  | AI triage call
  v
Job Store
  |
  v
GET /api/jobs/:jobId
```

## Tech Stack

* Node.js
* Express
* OpenAI-compatible JavaScript SDK
* OpenRouter
* Zod
* In-memory queue
* In-memory job store

## Installation

Install dependencies:

```bash
npm install
```

Create a `.env` file:

```env
PORT=3000

LLM_BASE_URL=https://openrouter.ai/api/v1
LLM_API_KEY=your_api_key_here
LLM_MODEL=openrouter/free

LLM_STUB=0
LLM_ENABLED=true
```

The real API key must never be committed to Git.

## Run the Application

```bash
npm start
```

Expected startup output:

```text
API running on http://localhost:3000
Background worker started.
```

## Health Check

```text
GET /health
```

Expected:

```json
{
  "status": "ok"
}
```

## Create a Background Job

### Endpoint

```text
POST /api/triage-jobs
```

Example request:

```bash
curl -X POST http://localhost:3000/api/triage-jobs \
  -H "Content-Type: application/json" \
  -d '{"text":"I was charged twice for the same invoice."}'
```

The endpoint does not wait for the AI model.

It immediately returns HTTP `202 Accepted`:

```json
{
  "jobId": "ac4bdc34-7ddb-41e6-bcf7-fc7e287fa723",
  "status": "queued",
  "statusUrl": "/api/jobs/ac4bdc34-7ddb-41e6-bcf7-fc7e287fa723"
}
```

## Check Job Status

### Endpoint

```text
GET /api/jobs/:jobId
```

A newly created job can have one of these states:

```text
queued
processing
completed
failed
```

Example completed response:

```json
{
  "jobId": "ac4bdc34-7ddb-41e6-bcf7-fc7e287fa723",
  "status": "completed",
  "attempts": 1,
  "result": {
    "category": "billing",
    "urgency": "high",
    "confidence": 0.95,
    "reason": "The customer is reporting a duplicate billing charge."
  },
  "error": null
}
```

## Background Worker

The worker continuously checks the queue.

For each job it:

1. loads the job from the job store
2. checks whether it has already completed
3. changes the status to `processing`
4. performs the AI classification
5. stores the result
6. marks the job as `completed`

If processing fails, the worker decides whether the failure should be retried.

## Idempotency

Background jobs may be delivered more than once.

To make processing idempotent, the worker checks the job status before running:

```text
If status = completed:
    skip processing
```

This prevents an already completed job from performing the AI operation again.

### Idempotency Test

A completed job was deliberately queued again.

Before requeue:

```text
status   : completed
attempts : 1
```

After requeue:

```text
status   : completed
attempts : 1
```

The worker skipped the duplicate execution and the existing result remained unchanged.

## Retry Policy

Not every failure should be retried.

The worker retries only temporary failures such as:

* timeouts
* HTTP `429`
* HTTP `5xx`
* selected network failures

Retries use exponential delays:

```text
Attempt 1 failure
    ↓
wait 1 second

Attempt 2 failure
    ↓
wait 2 seconds

Attempt 3
```

Permanent client or authentication failures are not retried.

Examples:

```text
400 → no retry
401 → no retry
403 → no retry
```

## Permanent Failure Test

A deliberately invalid API key produced:

```text
status   : failed
attempts : 1
error    : 401 Missing Authentication header
```

This confirmed that a permanent `401` authentication error was not retried unnecessarily.

## Alerts

If a background job cannot be completed, the application emits an alert-style structured log.

Example:

```json
{
  "type": "job_alert",
  "jobId": "3a777f2a-c7f0-43ed-a883-b2fa6415fc50",
  "message": "Background job permanently failed",
  "attempts": 3
}
```

This ensures permanent job failures are visible instead of disappearing silently.

## Input Validation

Invalid requests are rejected before a job is created.

Example:

```json
{}
```

Response:

```json
{
  "error": "Invalid request",
  "field": "text",
  "message": "Invalid input: expected string, received undefined"
}
```

## Unknown Job Handling

Request:

```text
GET /api/jobs/not-a-real-job
```

Response:

```json
{
  "error": "Job not found"
}
```

The endpoint returns HTTP `404`.

## Tested Workflow

The following scenarios were tested successfully:

* API health endpoint works
* background job creation returns immediately
* job initially returns `queued`
* worker processes the AI task independently
* completed result is available through the status endpoint
* completed jobs are not processed twice
* permanent `401` errors are not retried
* permanent failures generate alerts
* invalid input is rejected
* unknown job IDs return `404`

## Current Limitation

The queue and job store are currently in memory.

This means queued jobs and completed job records are lost if the Node.js process restarts.

For a production implementation, I would replace the in-memory queue and store with a persistent system such as Redis/BullMQ or a database-backed queue.

## What I Learned

This assignment showed why slow operations should not keep HTTP requests open.

The API now follows the pattern:

```text
accept fast
→ queue work
→ process in background
→ report status
```

It also demonstrated that background jobs need more than asynchronous execution. They must be safe to run more than once, retry only appropriate failures, expose their state, and make permanent failures visible.
