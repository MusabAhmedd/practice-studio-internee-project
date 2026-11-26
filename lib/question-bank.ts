import ai from "@/data/questions/SAMPLE_generative_ai.json";
import ml from "@/data/questions/SAMPLE_ml_engineer.json";
import data from "@/data/questions/SAMPLE_data_analyst.json";
import fullstack from "@/data/questions/SAMPLE_full_stack.json";
import { z } from "zod";
import type { Decision, Question, InterviewType } from "./engine";

const schema = z.object({
  id: z.string().min(1),
  text: z.string().min(1),
  topic: z.string().min(1),
  difficulty: z.number().int().min(1).max(5),
  type: z
    .enum(["technical", "behavioral", "system design", "mixed"])
    .optional(),
});
const banks: Record<string, Question[]> = {
  "Generative AI Engineer": z.array(schema).parse(ai),
  "ML Engineer": z.array(schema).parse(ml),
  "Data Analyst": z.array(schema).parse(data),
  "Full-Stack Engineer": z.array(schema).parse(fullstack),
};
export function getBank(role: string): Question[] {
  const bank = banks[role];
  if (!bank) throw new Error("Unknown role");
  return bank.map((q) => ({ ...q }));
}

export function filterByType(
  bank: Question[],
  type: InterviewType,
): Question[] {
  if (type === "mixed") return bank;
  return bank.filter((q) => !q.type || q.type === type);
}

/** Select an unused sample; nearest difficulty is a fallback if the exact level is exhausted. */
export function chooseQuestion(
  bank: Question[],
  decision: Decision,
  usedIds: string[],
  interviewType: InterviewType = "mixed",
): Question | null {
  if (decision.action === "close") return null;

  const typeFiltered = filterByType(bank, interviewType);
  const candidates = typeFiltered.filter(
    (q) => q.topic === decision.topic && !usedIds.includes(q.id),
  );

  if (candidates.length === 0) {
    const fallback = typeFiltered.filter((q) => !usedIds.includes(q.id));
    if (fallback.length === 0) return null;
    return fallback.sort(
      (a, b) =>
        Math.abs(a.difficulty - decision.difficulty) -
          Math.abs(b.difficulty - decision.difficulty) ||
        a.id.localeCompare(b.id),
    )[0];
  }

  return candidates.sort(
    (a, b) =>
      Math.abs(a.difficulty - decision.difficulty) -
        Math.abs(b.difficulty - decision.difficulty) ||
      a.id.localeCompare(b.id),
  )[0];
}

export function getAvailableTopics(
  bank: Question[],
  interviewType: InterviewType,
): string[] {
  const typeFiltered = filterByType(bank, interviewType);
  return [...new Set(typeFiltered.map((q) => q.topic))];
}
