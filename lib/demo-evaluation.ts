import type { Evaluation } from "./schemas";
// NOT_IMPLEMENTED: Demo scoring is an illustrative deterministic fixture, not AI assessment.
export function demoEvaluation(answer: string): Evaluation {
  const count = answer.trim().split(/\s+/).filter(Boolean).length;
  const score = count < 15 ? 3 : count < 45 ? 5 : 8;
  return {
    scores: {
      correctness: score,
      depth: score,
      clarity: score,
      structure: score,
      relevance: score,
    },
    strengths: ["SAMPLE: Your response was recorded."],
    weaknesses: ["SAMPLE: This is a demonstration, not an evaluation."],
    idealOutline: ["SAMPLE: Explain your reasoning and give an example."],
    tip: "SAMPLE: Practice adding a concrete example.",
  };
}
