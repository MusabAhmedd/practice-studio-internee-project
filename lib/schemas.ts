import { z } from "zod";

export const setupSchema = z.object({
  role: z.enum([
    "Generative AI Engineer",
    "ML Engineer",
    "Data Analyst",
    "Full-Stack Engineer",
  ]),
  seniority: z.enum(["junior", "mid", "senior"]),
  type: z.enum(["technical", "behavioral", "system design", "mixed"]),
  durationMin: z.coerce.number().int().min(5).max(60),
  jdText: z.string().trim().max(10000).optional(),
});
export type Setup = z.infer<typeof setupSchema>;

export const sessionStatusSchema = z.enum([
  "created",
  "active",
  "completed",
  "expired",
  "cancelled",
]);
export type SessionStatus = z.infer<typeof sessionStatusSchema>;

const scoreSchema = z.number().min(0).max(10);
export const evaluationSchema = z
  .object({
    scores: z
      .object({
        correctness: scoreSchema,
        depth: scoreSchema,
        clarity: scoreSchema,
        structure: scoreSchema,
        relevance: scoreSchema,
      })
      .strict(),
    strengths: z.array(z.string().min(1).max(500)).max(6),
    weaknesses: z.array(z.string().min(1).max(500)).max(6),
    idealOutline: z.array(z.string().min(1).max(500)).min(1).max(8),
    tip: z.string().min(1).max(500),
    skipped: z.boolean().optional(),
  })
  .strict();
export type Evaluation = z.infer<typeof evaluationSchema>;

export const skippedEvaluation: Evaluation = {
  scores: { correctness: 0, depth: 0, clarity: 0, structure: 0, relevance: 0 },
  strengths: [],
  weaknesses: ["Question was skipped"],
  idealOutline: ["Provide an answer to receive feedback"],
  tip: "Attempt every question to get meaningful evaluation",
  skipped: true,
};

export const answerRequestSchema = z
  .object({
    sessionId: z.string().regex(/^[A-Za-z0-9_-]{1,128}$/),
    answerText: z.string().trim().max(5000),
    skipped: z.boolean().optional(),
    mode: z.enum(["text", "voice"]),
    durationSec: z.number().min(0).max(3600).optional(),
  })
  .strict();
