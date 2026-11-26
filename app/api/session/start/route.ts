import { NextResponse } from "next/server";
import { adminServices, requireUser } from "@/lib/firebase-admin";
import { apiError, limited } from "@/lib/api";
import { setupSchema } from "@/lib/schemas";
import { nextQuestion, calculateTargetCount } from "@/lib/engine";
import {
  chooseQuestion,
  getBank,
  getAvailableTopics,
} from "@/lib/question-bank";
export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    const uid = await requireUser(request);
    if (!(await limited(uid)))
      return NextResponse.json(
        { error: "Too many requests. Please try again shortly." },
        { status: 429 },
      );
    if (Number(request.headers.get("content-length") || 0) > 20000)
      return NextResponse.json(
        { error: "Request too large." },
        { status: 413 },
      );
    const text = await request.text();
    if (text.length > 20000)
      return NextResponse.json(
        { error: "Request too large." },
        { status: 413 },
      );
    let input: unknown;
    try {
      input = JSON.parse(text);
    } catch {
      return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
    }
    const parsed = setupSchema.safeParse(input);
    if (!parsed.success)
      return NextResponse.json({ error: "Invalid setup." }, { status: 400 });
    const demo = process.env.DEMO_MODE === "true";
    if (!demo && (!process.env.GROQ_API_KEY || !process.env.OPENAI_CHAT_MODEL))
      return NextResponse.json(
        { error: "AI provider is not configured." },
        { status: 503 },
      );
    const bank = getBank(parsed.data.role);
    const topics = getAvailableTopics(bank, parsed.data.type);
    if (topics.length === 0)
      return NextResponse.json(
        { error: "No questions available for this interview type." },
        { status: 400 },
      );
    const targetCount = calculateTargetCount(
      parsed.data.durationMin,
      parsed.data.type,
    );
    const decision = nextQuestion({
      turns: [],
      timeLeftSec: parsed.data.durationMin * 60,
      topicsCovered: [],
      lastScore: null,
      targetCount,
      seniority: parsed.data.seniority,
      topics,
      type: parsed.data.type,
      jdText: parsed.data.jdText,
    });
    const firstQuestion = chooseQuestion(bank, decision, [], parsed.data.type);
    if (!firstQuestion) throw new Error("No question available");
    const { db } = adminServices();
    const ref = db.collection("sessions").doc();
    await ref.set({
      ...parsed.data,
      uid,
      status: "active",
      startedAt: new Date().toISOString(),
      currentQuestion: firstQuestion,
      turnCount: 0,
      targetCount,
      demo,
    });
    return NextResponse.json({ sessionId: ref.id, firstQuestion, demo });
  } catch (error) {
    return apiError(error);
  }
}
