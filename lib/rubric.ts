import { evaluationSchema, type Evaluation } from "./schemas";
export function meanScore(e: Evaluation): number {
  const scores = Object.values(e.scores);
  return scores.reduce((sum, value) => sum + value, 0) / scores.length;
}
export function aggregate(evaluations: Evaluation[]) {
  if (!evaluations.length)
    throw new Error("At least one evaluation is required");
  const keys = [
    "correctness",
    "depth",
    "clarity",
    "structure",
    "relevance",
  ] as const;
  const subscores = Object.fromEntries(
    keys.map((k) => [
      k,
      evaluations.reduce((sum, e) => sum + e.scores[k], 0) / evaluations.length,
    ]),
  ) as Record<(typeof keys)[number], number>;
  return {
    overall:
      evaluations.reduce((sum, e) => sum + meanScore(e), 0) /
      evaluations.length,
    subscores,
  };
}
/** Three attempts total; the caller provides the model transport. */
export async function validateWithRetry(
  request: (attempt: number) => Promise<string>,
  delay: (ms: number) => Promise<void> = (ms) =>
    new Promise((resolve) => setTimeout(resolve, ms)),
): Promise<Evaluation> {
  for (let attempt = 0; attempt < 3; attempt++) {
    const raw = await request(attempt);
    try {
      return evaluationSchema.parse(JSON.parse(raw));
    } catch {
      if (attempt === 2)
        throw new Error("AI returned invalid evaluation after three attempts");
      await delay(250 * 2 ** attempt);
    }
  }
  throw new Error("AI evaluation failed");
}
