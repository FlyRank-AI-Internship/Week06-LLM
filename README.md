# AI Support Message Triage API

A small Node.js API that uses an LLM to classify customer support messages into a closed, validated schema.

## What It Does

`POST /api/triage` accepts a support message and returns:

- category
- urgency
- confidence
- reason

Allowed categories:

- billing
- bug
- feature
- other

Allowed urgency values:

- low
- normal
- high

## Tech Stack

- Node.js 20+
- Express
- OpenAI JavaScript SDK
- OpenRouter
- Zod

## Setup

Install dependencies:

```bash
npm install