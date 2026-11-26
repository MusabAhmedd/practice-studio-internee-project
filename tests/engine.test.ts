import { test } from "node:test";
import assert from "node:assert/strict";
import { nextQuestion, type InterviewState } from "../lib/engine";
import { getBank, chooseQuestion } from "../lib/question-bank";
const q = { id: "a", text: "Question", topic: "a", difficulty: 3 };
const long =
  "This answer has enough words to pass the short answer threshold without being treated as vague.";
const base: InterviewState = {
  turns: [{ question: q, answerText: long }],
  timeLeftSec: 600,
  topicsCovered: ["a"],
  lastScore: 5,
  targetCount: 5,
  seniority: "mid",
  topics: ["a", "b", "c"],
  type: "technical",
  jdText: "",
};
test("first question has seniority-based difficulty", () => {
  for (const [seniority, difficulty] of [
    ["junior", 2],
    ["mid", 3],
    ["senior", 4],
  ] as const)
    assert.equal(
      nextQuestion({ ...base, turns: [], seniority }).difficulty,
      difficulty,
    );
});
test("close has priority when less than 90 seconds or target reached", () => {
  assert.equal(nextQuestion({ ...base, timeLeftSec: 89 }).action, "close");
  assert.notEqual(nextQuestion({ ...base, timeLeftSec: 90 }).action, "close");
  assert.equal(nextQuestion({ ...base, targetCount: 1 }).action, "close");
});
test("short answers clarify before score policy", () => {
  assert.equal(
    nextQuestion({
      ...base,
      turns: [{ question: q, answerText: "short" }],
      lastScore: 9,
    }).action,
    "clarify",
  );
});
test("strong answers increase difficulty with a maximum of five", () => {
  assert.deepEqual(nextQuestion({ ...base, lastScore: 7.5 }), {
    action: "follow_up",
    difficulty: 4,
    topic: "a",
    reason: "Strong answer, probing deeper on same topic",
  });
  assert.equal(
    nextQuestion({
      ...base,
      turns: [{ question: { ...q, difficulty: 5 }, answerText: long }],
      lastScore: 10,
    }).difficulty,
    5,
  );
});
test("average answers keep difficulty and choose an uncovered topic", () => {
  assert.deepEqual(nextQuestion({ ...base, lastScore: 4 }), {
    action: "new_topic",
    difficulty: 3,
    topic: "b",
    reason: "Average answer, moving to next topic",
  });
  assert.equal(
    nextQuestion({ ...base, lastScore: 7.49, topicsCovered: ["a", "b"] }).topic,
    "c",
  );
});
test("weak answers lower difficulty with a minimum of one", () => {
  assert.deepEqual(nextQuestion({ ...base, lastScore: 3.9 }), {
    action: "probe_or_clarify",
    difficulty: 2,
    topic: "a",
    reason: "Weak answer, probing for clarification at lower difficulty",
  });
  assert.equal(
    nextQuestion({
      ...base,
      turns: [{ question: { ...q, difficulty: 1 }, answerText: long }],
      lastScore: 0,
    }).difficulty,
    1,
  );
});
test("skipped answers move to new topic at lower difficulty", () => {
  const skippedTurn = { question: q, answerText: "", skipped: true };
  const result = nextQuestion({
    ...base,
    turns: [skippedTurn],
    lastScore: 5,
  });
  assert.equal(result.action, "new_topic");
  assert.equal(result.difficulty, 2);
  assert.equal(
    result.reason,
    "Question skipped, moving to new topic at lower difficulty",
  );
});
test("question selection never returns an already used ID", () => {
  const bank = getBank("ML Engineer");
  const decision = {
    action: "open" as const,
    topic: bank[0].topic,
    difficulty: 1,
  };
  const first = chooseQuestion(bank, decision, []);
  assert.ok(first);
  const second = chooseQuestion(bank, decision, [first.id]);
  assert.ok(second);
  assert.notEqual(second.id, first.id);
  assert.equal(
    chooseQuestion(
      bank,
      decision,
      bank.map((x) => x.id),
    ),
    null,
  );
});
test("every role has at least 15 labelled questions", () => {
  for (const role of [
    "Generative AI Engineer",
    "ML Engineer",
    "Data Analyst",
    "Full-Stack Engineer",
  ]) {
    const bank = getBank(role);
    assert.ok(bank.length >= 15);
    assert.ok(
      bank.every(
        (q) =>
          q.id.startsWith("SAMPLE-") && q.difficulty >= 1 && q.difficulty <= 5,
      ),
    );
  }
});
