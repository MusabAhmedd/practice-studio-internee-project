export type Seniority = "junior" | "mid" | "senior";
export type InterviewType =
  "technical" | "behavioral" | "system design" | "mixed";

export type Question = {
  id: string;
  text: string;
  topic: string;
  difficulty: number;
  type?: InterviewType;
};

export type Turn = {
  question: Question;
  answerText: string;
  skipped?: boolean;
};

export type InterviewState = {
  turns: Turn[];
  timeLeftSec: number;
  topicsCovered: string[];
  lastScore: number | null;
  targetCount: number;
  seniority: Seniority;
  topics: string[];
  type: InterviewType;
  jdText?: string;
};

export type Decision = {
  action:
    | "open"
    | "follow_up"
    | "new_topic"
    | "probe_or_clarify"
    | "clarify"
    | "close";
  difficulty: number;
  topic: string;
  reason?: string;
};

/** Deterministic policy; selection of a unique question is handled by the bank. */
export function nextQuestion(state: InterviewState): Decision {
  if (state.topics.length === 0)
    throw new Error("At least one topic is required");
  const previous = state.turns.at(-1);
  const initialDifficulty = { junior: 2, mid: 3, senior: 4 }[state.seniority];
  const difficulty = previous?.question.difficulty ?? initialDifficulty;
  const topic = previous?.question.topic ?? state.topics[0];

  if (state.timeLeftSec < 90 || state.turns.length >= state.targetCount)
    return {
      action: "close",
      difficulty,
      topic,
      reason: "Time or question limit reached",
    };

  if (!previous)
    return { action: "open", difficulty, topic, reason: "First question" };

  const wasSkipped = previous.skipped === true;
  const wordCount = previous.answerText
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
  const isShortAnswer = wordCount < 15 && !wasSkipped;

  if (wasSkipped) {
    return {
      action: "new_topic",
      difficulty: Math.max(difficulty - 1, 1),
      topic: getNextTopic(state, topic),
      reason: "Question skipped, moving to new topic at lower difficulty",
    };
  }

  if (isShortAnswer)
    return {
      action: "clarify",
      difficulty,
      topic,
      reason: "Answer too brief, asking for clarification",
    };

  if (
    state.lastScore === null ||
    !Number.isFinite(state.lastScore) ||
    state.lastScore < 0 ||
    state.lastScore > 10
  )
    throw new Error("A score from 0 to 10 is required");

  if (state.lastScore >= 7.5)
    return {
      action: "follow_up",
      difficulty: Math.min(difficulty + 1, 5),
      topic,
      reason: "Strong answer, probing deeper on same topic",
    };

  if (state.lastScore < 4)
    return {
      action: "probe_or_clarify",
      difficulty: Math.max(difficulty - 1, 1),
      topic,
      reason: "Weak answer, probing for clarification at lower difficulty",
    };

  const nextTopic = getNextTopic(state, topic);
  return {
    action: "new_topic",
    difficulty,
    topic: nextTopic,
    reason: "Average answer, moving to next topic",
  };
}

function getNextTopic(state: InterviewState, currentTopic: string): string {
  const uncovered = state.topics.find(
    (t) => !state.topicsCovered.includes(t) && t !== currentTopic,
  );
  if (uncovered) return uncovered;
  const other = state.topics.find((t) => t !== currentTopic);
  return other ?? currentTopic;
}

export function calculateTargetCount(
  durationMin: number,
  type: InterviewType,
): number {
  const basePerQuestion = type === "system design" ? 15 : 10;
  return Math.max(3, Math.min(10, Math.floor(durationMin / basePerQuestion)));
}
