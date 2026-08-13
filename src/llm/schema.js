import { z } from "zod";

export const triageInputSchema = z.object({
  text: z
    .string({
      required_error: "text is required",
      invalid_type_error: "text must be a string",
    })
    .min(1, "text must contain at least 1 character")
    .max(2000, "text must not exceed 2000 characters"),
});

export const triageOutputSchema = z.object({
  category: z.enum(["billing", "bug", "feature", "other"]),
  urgency: z.enum(["low", "normal", "high"]),
  confidence: z.number().min(0).max(1),
  reason: z.string().min(1).max(250),
});

export const TRIAGE_STUB_RESPONSE = {
  category: "other",
  urgency: "normal",
  confidence: 0.4,
  reason: "Stub response used while AI calls are disabled.",
};