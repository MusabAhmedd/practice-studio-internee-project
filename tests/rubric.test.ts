import { test } from "node:test";
import assert from "node:assert/strict";
import { aggregate, meanScore, validateWithRetry } from "../lib/rubric";
import { evaluationSchema } from "../lib/schemas";
const item = {
  scores: { correctness: 8, depth: 6, clarity: 7, structure: 5, relevance: 9 },
  strengths: ["Clear"],
  weaknesses: ["More detail"],
  idealOutline: ["Explain"],
  tip: "Use an example.",
};
test("mean and aggregation", () => {
  assert.equal(meanScore(item), 7);
  assert.equal(aggregate([item, item]).overall, 7);
  assert.equal(aggregate([item, item]).subscores.correctness, 8);
  assert.throws(() => aggregate([]));
});
test("scores and output are schema validated", () => {
  assert.equal(
    evaluationSchema.safeParse({
      ...item,
      scores: { ...item.scores, depth: 11 },
    }).success,
    false,
  );
  assert.equal(
    evaluationSchema.safeParse({ ...item, extra: 1 }).success,
    false,
  );
});
test("malformed JSON is retried and validated", async () => {
  let calls = 0;
  const result = await validateWithRetry(
    async () => {
      calls++;
      return calls === 1 ? "{bad" : JSON.stringify(item);
    },
    async () => {},
  );
  assert.equal(calls, 2);
  assert.deepEqual(result, item);
});
test("rejects persistently invalid output after three calls", async () => {
  let calls = 0;
  await assert.rejects(
    validateWithRetry(
      async () => {
        calls++;
        return "{}";
      },
      async () => {},
    ),
    /invalid evaluation/,
  );
  assert.equal(calls, 3);
});
