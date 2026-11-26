import { NextResponse } from "next/server";
import { adminServices, requireUser } from "@/lib/firebase-admin";
import { apiError, limited } from "@/lib/api";
import {
  answerRequestSchema,
  evaluationSchema,
  skippedEvaluation,
} from "@/lib/schemas";
import { evaluateAnswer, generateFollowUpQuestion } from "@/lib/openai";
import { demoEvaluation } from "@/lib/demo-evaluation";
import { meanScore } from "@/lib/rubric";
import { nextQuestion, type Question, type Turn } from "@/lib/engine";
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
    const text = await request.text();
    if (text.length > 10000)
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
    const parsed = answerRequestSchema.safeParse(input);
    if (!parsed.success)
      return NextResponse.json({ error: "Invalid answer." }, { status: 400 });
    const { db } = adminServices();
    const ref = db.collection("sessions").doc(parsed.data.sessionId);
    const snapshot = await ref.get();
    const session = snapshot.data();
    if (!session || session.uid !== uid)
      return NextResponse.json(
        { error: "Session not found." },
        { status: 404 },
      );
    if (session.status !== "active" || !session.currentQuestion)
      return NextResponse.json(
        { error: "Session is no longer accepting answers." },
        { status: 409 },
      );
    const current = session.currentQuestion as Question;
    const turnsSnap = await ref.collection("turns").orderBy("index").get();
    const previous = turnsSnap.docs.map((d) => d.data());
    const isSkipped = parsed.data.skipped === true;
    const evaluation = isSkipped
      ? skippedEvaluation
      : evaluationSchema.parse(
          session.demo
            ? demoEvaluation(parsed.data.answerText)
            : await evaluateAnswer(
                current.text,
                parsed.data.answerText,
                session.role,
                session.seniority,
                session.type,
                session.jdText,
              ),
        );
    const turn = {
      index: session.turnCount,
      question: current,
      answer: {
        text: parsed.data.answerText,
        mode: parsed.data.mode,
        skipped: isSkipped,
        ...(parsed.data.durationSec === undefined
          ? {}
          : { durationSec: parsed.data.durationSec }),
      },
      evaluation,
      createdAt: new Date().toISOString(),
    };
    const bank = getBank(session.role);
    const topics = getAvailableTopics(bank, session.type);
    const all = [...previous, turn];
    const stateTurns = all.map((t) => ({
      question: t.question as Question,
      answerText: t.answer.text as string,
      skipped: t.answer.skipped === true,
    })) as Turn[];
    const timeLeftSec = Math.max(
      0,
      session.durationMin * 60 -
        (Date.now() - Date.parse(session.startedAt)) / 1000,
    );
    const decision = nextQuestion({
      turns: stateTurns,
      timeLeftSec,
      topicsCovered: all.map((t) => t.question.topic as string),
      lastScore: isSkipped ? 0 : meanScore(evaluation),
      targetCount: session.targetCount,
      seniority: session.seniority,
      topics,
      type: session.type,
      jdText: session.jdText,
    });
    let next = chooseQuestion(
      bank,
      decision,
      all.map((t) => t.question.id as string),
      session.type,
    );
    if (decision.action === "follow_up" && !session.demo) {
      const followUp = await generateFollowUpQuestion(
        current.text,
        parsed.data.answerText,
        session.role,
        session.seniority,
        session.type,
        session.jdText,
      );
      if (followUp) {
        next = {
          ...next!,
          id: `followup-${Date.now()}`,
          text: followUp,
          difficulty: decision.difficulty,
          topic: decision.topic,
        };
      }
    }
    await db.runTransaction(async (tx) => {
      const fresh = await tx.get(ref);
      const data = fresh.data();
      if (
        !data ||
        data.status !== "active" ||
        data.turnCount !== session.turnCount ||
        data.currentQuestion?.id !== current.id
      )
        throw new Error("STALE");
      tx.create(
        ref.collection("turns").doc(String(session.turnCount).padStart(4, "0")),
        turn,
      );
      tx.update(ref, {
        turnCount: session.turnCount + 1,
        currentQuestion: next,
        ...(next
          ? {}
          : { status: "completed", endedAt: new Date().toISOString() }),
      });
    });
    return NextResponse.json({
      evaluation,
      nextQuestion: next,
      demo: session.demo,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "STALE")
      return NextResponse.json(
        { error: "This answer has already been submitted." },
        { status: 409 },
      );
    return apiError(error);
  }
}
export async function GET(request: Request) {
  try {
    const uid = await requireUser(request);
    if (!(await limited(uid)))
      return NextResponse.json(
        { error: "Too many requests." },
        { status: 429 },
      );
    const id = new URL(request.url).searchParams.get("sessionId");
    if (!id || !/^[A-Za-z0-9_-]{1,128}$/.test(id))
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
    const turns = await ref.collection("turns").orderBy("index").get();
    return NextResponse.json({
      session: {
        role: session.role,
        status: session.status,
        startedAt: session.startedAt,
        durationMin: session.durationMin,
        currentQuestion: session.currentQuestion,
        turnCount: session.turnCount,
        targetCount: session.targetCount,
        demo: session.demo,
      },
      turns: turns.docs.map((d) => d.data()),
    });
  } catch (error) {
    return apiError(error);
  }
}
