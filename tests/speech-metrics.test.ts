import { test } from "node:test";
import assert from "node:assert/strict";
import { speechMetrics } from "../lib/speech-metrics";
test("counts fillers and pace", () => {
  const result = speechMetrics("Um this is uh an example", 3);
  assert.equal(result.wordCount, 6);
  assert.equal(result.fillers, 2);
  assert.equal(result.wordsPerMinute, 120);
  assert.equal(result.fillerRate, 40);
  assert.ok(typeof result.avgWordsPerSentence === "number");
  assert.equal(result.durationSec, 3);
  assert.ok(typeof result.disclaimer === "string");
});
test("handles zero duration and whitespace", () => {
  const result = speechMetrics("   ", 0);
  assert.equal(result.wordCount, 0);
  assert.equal(result.fillers, 0);
  assert.equal(result.wordsPerMinute, null);
  assert.equal(result.fillerRate, null);
  assert.equal(result.durationSec, 0);
  assert.ok(typeof result.disclaimer === "string");
});
test("counts extended fillers", () => {
  const result = speechMetrics("Um like so basically actually an example", 5);
  assert.equal(result.fillers, 5);
  assert.ok(result.fillerRate !== null);
});
