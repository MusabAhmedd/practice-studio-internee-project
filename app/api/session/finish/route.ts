import { NextResponse } from "next/server";
import { adminServices, requireUser } from "@/lib/firebase-admin";
import { apiError, limited } from "@/lib/api";
import { evaluationSchema } from "@/lib/schemas";
import { aggregate } from "@/lib/rubric";
export const runtime = "nodejs";
function deduplicateAndRank(items: string[], max: number): string[] {
  const counts = new Map<string, number>();
  for (const item of items) {
    const normalized = item.toLowerCase().trim();
    counts.set(normalized, (counts.get(normalized) || 0) + 1);
  }
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, max)
    .map(([item]) => item);
}
function generatePersonalizedPlan(
  weaknesses: string[],
  role: string,
  type: string,
): string[] {
  const basePlan = [
    `Review your ${role} interview questions and mark the topics to revisit.`,
    "Study one core concept from your weakest area and summarize it in your own words.",
    "Practice one answer aloud using a concrete example (STAR method for behavioral).",
    "Review gaps and seek reliable reference material for your top weakness.",
    "Try a timed practice answer and revise its structure for clarity.",
    "Revisit a difficult question and explain your reasoning step by step.",
    "Repeat a practice interview and reflect on changes.",
  ];
  if (weaknesses.length > 0) {
    const topWeakness = weaknesses[0];
    basePlan[1] = `Focus on "${topWeakness}" - study this concept deeply and practice explaining it.`;
    basePlan[3] = `Create a cheat sheet for "${topWeakness}" with key concepts and examples.`;
  }
  if (type === "behavioral") {
    basePlan[2] =
      "Practice behavioral answers using STAR (Situation, Task, Action, Result) format.";
  } else if (type === "system design") {
    basePlan[2] =
      "Practice system design by drawing architectures and explaining trade-offs aloud.";
  }
  return basePlan;
}
export async function POST(request: Request) {
  try {
    const uid = await requireUser(request);
    if (!(await limited(uid)))
      return NextResponse.json(
        { error: "Too many requests." },
        { status: 429 },
      );
    const text = await request.text();
    if (text.length > 1000)
      return NextResponse.json(
        { error: "Request too large." },
        { status: 413 },
      );
    let data: unknown;
    try {
      data = JSON.parse(text);
    } catch {
      return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
    }
    const id =
      typeof data === "object" && data !== null && "sessionId" in data
        ? data.sessionId
        : null;
    if (typeof id !== "string" || !/^[A-Za-z0-9_-]{1,128}$/.test(id))
      return NextResponse.json({ error: "Invalid session." }, { status: 400 });
    const { db } = adminServices();
    const ref = db.collection("sessions").doc(id);
    const snapshot = await ref.get();
    const session = snapshot.data();
    if (!session || session.uid !== uid)
      return NextResponse.json(
        { error: "Session not found." },
        { status: 404 },
      );
    if (session.status !== "completed" && session.status !== "done")
      return NextResponse.json(
        { error: "Complete the interview first." },
        { status: 409 },
      );
    const docs = await ref.collection("turns").orderBy("index").get();
    const turns = docs.docs.map((d) => d.data());
    if (!turns.length)
      return NextResponse.json(
        { error: "No answers available." },
        { status: 409 },
      );
    const evaluations = turns.map((t) => evaluationSchema.parse(t.evaluation));
    const answeredEvaluations = evaluations.filter((e) => !e.skipped);
    if (answeredEvaluations.length === 0) {
      return NextResponse.json(
        { error: "No answered questions to evaluate." },
        { status: 409 },
      );
    }
    const { overall, subscores } = aggregate(answeredEvaluations);
    const strengths = deduplicateAndRank(
      answeredEvaluations.flatMap((e) => e.strengths),
      5,
    );
    const improvements = deduplicateAndRank(
      answeredEvaluations.flatMap((e) => e.weaknesses),
      5,
    );
    const practicePlan = generatePersonalizedPlan(
      improvements,
      session.role,
      session.type,
    );
    await ref.update({ overall, subscores, status: "completed" });
    return NextResponse.json({
      overall,
      subscores,
      strengths,
      improvements,
      practicePlan,
      turns,
      demo: session.demo,
      role: session.role,
      startedAt: session.startedAt,
      type: session.type,
      answeredCount: answeredEvaluations.length,
      skippedCount: evaluations.length - answeredEvaluations.length,
    });
  } catch (error) {
    return apiError(error);
  }
}
