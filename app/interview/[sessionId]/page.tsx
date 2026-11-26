"use client";
import Link from "next/link";
import { use, useEffect, useState, type FormEvent } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { firebaseClient } from "@/lib/firebase-client";
import { Header, Footer } from "@/app/ui";
import type { Question } from "@/lib/engine";
import type { Evaluation } from "@/lib/schemas";
import { VoiceInput } from "./voice";

type Turn = {
  question: Question;
  answer: {
    text: string;
    skipped?: boolean;
    mode?: string;
    durationSec?: number;
  };
  evaluation: Evaluation;
};
type Session = {
  role: string;
  type: string;
  status: string;
  startedAt: string;
  durationMin: number;
  currentQuestion: Question | null;
  turnCount: number;
  targetCount: number;
  demo: boolean;
};
export default function Interview({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = use(params);
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [answer, setAnswer] = useState("");
  const [answerMode, setAnswerMode] = useState<"text" | "voice">("text");
  const [voiceDuration, setVoiceDuration] = useState<number | undefined>();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [hint, setHint] = useState(false);
  const [focus, setFocus] = useState(false);
  const [now, setNow] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    try {
      return onAuthStateChanged(firebaseClient().auth, async (current) => {
        setUser(current);
        if (!current) {
          setLoading(false);
          return;
        }
        try {
          const token = await current.getIdToken();
          const response = await fetch(
            `/api/session/answer?sessionId=${encodeURIComponent(sessionId)}`,
            { headers: { Authorization: `Bearer ${token}` } },
          );
          const data = await response.json();
          if (!response.ok) throw new Error(data.error);
          setSession(data.session);
          setTurns(data.turns);
          setNow(Date.now());
        } catch (err) {
          setError(
            err instanceof Error ? err.message : "Could not load session.",
          );
        } finally {
          setLoading(false);
        }
      });
    } catch {
      queueMicrotask(() => {
        setError("Firebase is not configured.");
        setLoading(false);
      });
    }
  }, [sessionId]);
  async function submitAnswer(text: string, skipped = false) {
    if (!user || !session) return;
    if (!skipped && !text.trim()) return;
    setError("");
    setBusy(true);
    try {
      const token = await user.getIdToken();
      const response = await fetch("/api/session/answer", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          sessionId,
          answerText: text,
          skipped,
          mode: skipped ? "text" : answerMode,
          ...(answerMode === "voice" && !skipped && text !== "[Skipped]"
            ? { durationSec: voiceDuration }
            : {}),
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setTurns((prev) => [
        ...prev,
        {
          question: session.currentQuestion!,
          answer: { text, skipped, mode: skipped ? "text" : answerMode },
          evaluation: result.evaluation,
        },
      ]);
      setSession({
        ...session,
        turnCount: session.turnCount + 1,
        currentQuestion: result.nextQuestion,
        status: result.nextQuestion ? "active" : "completed",
      });
      setAnswer("");
      setAnswerMode("text");
      setVoiceDuration(undefined);
      setHint(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not submit answer.");
    } finally {
      setBusy(false);
    }
  }
  function submit(e: FormEvent) {
    e.preventDefault();
    void submitAnswer(answer);
  }
  function handleSkip() {
    void submitAnswer("", true);
  }
  const remaining =
    session && now
      ? Math.max(
          0,
          Math.ceil(
            session.durationMin * 60 -
              (now - Date.parse(session.startedAt)) / 1000,
          ),
        )
      : 0;
  const isActive = session?.status === "active";
  const isComplete =
    session?.status === "completed" || session?.status === "done";
  return (
    <>
      {!focus && <Header />}
      <main className="screen">
        {loading ? (
          <p aria-live="polite">Loading your session…</p>
        ) : !user ? (
          <p>
            Please{" "}
            <Link className="text-link" href="/login">
              sign in
            </Link>{" "}
            to continue.
          </p>
        ) : !session ? (
          <p role="alert" className="alert">
            {error || "Session not found."}
          </p>
        ) : (
          <>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 12,
                flexWrap: "wrap",
              }}
            >
              <Link className="back" href="/setup">
                ← Setup
              </Link>
              <button className="text-link" onClick={() => setFocus(!focus)}>
                {focus ? "Exit focus mode" : "Focus mode"}
              </button>
            </div>
            <div className="screen-heading">
              <div className="eyebrow">
                <span className="eyebrow-dot" />
                {session.demo
                  ? "SAMPLE DEMO · SIMULATED FEEDBACK"
                  : "PRACTICE SESSION"}
              </div>
              <h1>Practice room.</h1>
              <p>
                {session.role} · {session.type} ·{" "}
                {isActive
                  ? `Question ${session.turnCount + 1} of ${session.targetCount}`
                  : "Session complete"}{" "}
                · {Math.floor(remaining / 60)}:
                {String(remaining % 60).padStart(2, "0")} remaining
              </p>
            </div>
            <div className="setup-grid">
              <section className="panel" aria-label="Interview conversation">
                <div
                  className="progress"
                  aria-label={`Completed ${session.turnCount} of ${session.targetCount} questions`}
                >
                  <span
                    style={{
                      width: `${(session.turnCount / session.targetCount) * 100}%`,
                    }}
                  />
                </div>
                {turns.map((t, i) => (
                  <article
                    key={i}
                    className="saved-item"
                    style={{ marginBottom: 14 }}
                  >
                    <p className="eyebrow">
                      QUESTION {i + 1}{" "}
                      {t.answer.skipped && (
                        <span
                          style={{
                            color: "var(--muted)",
                            fontSize: 12,
                            fontWeight: "normal",
                          }}
                        >
                          (skipped)
                        </span>
                      )}
                    </p>
                    <p style={{ fontSize: 14, color: "var(--ink)" }}>
                      {t.question.text}
                    </p>
                    <p>
                      <strong>Your answer:</strong>{" "}
                      {t.answer.skipped ? (
                        <em style={{ color: "var(--muted)" }}>
                          Question skipped
                        </em>
                      ) : (
                        t.answer.text
                      )}
                    </p>
                    <p>
                      <strong>
                        {session.demo ? "SAMPLE feedback" : "Feedback"}:
                      </strong>{" "}
                      {t.evaluation.tip}
                    </p>
                  </article>
                ))}
                {session.currentQuestion && isActive ? (
                  <>
                    <div className="eyebrow">
                      YOUR INTERVIEWER · {session.currentQuestion.topic}
                    </div>
                    <h2 style={{ margin: "16px 0 24px", lineHeight: 1.5 }}>
                      {session.currentQuestion.text}
                    </h2>
                    <form onSubmit={submit}>
                      <label className="form-label">
                        Your answer
                        <textarea
                          className="field"
                          rows={6}
                          maxLength={5000}
                          required={!busy}
                          value={answer}
                          onChange={(e) => setAnswer(e.target.value)}
                          placeholder="Take your time. Write your response here…"
                          disabled={busy}
                        />
                      </label>
                      <p className="form-hint">
                        {answer.length} / 5,000 characters
                      </p>
                      <VoiceInput
                        user={user}
                        disabled={busy}
                        onTranscript={(text, duration) => {
                          setAnswer(text);
                          setAnswerMode("voice");
                          setVoiceDuration(duration);
                        }}
                      />
                      {error && (
                        <p role="alert" className="alert">
                          {error}
                        </p>
                      )}
                      <div className="form-footer">
                        <button
                          className="button button-secondary"
                          type="button"
                          onClick={() => setHint(!hint)}
                          disabled={busy}
                        >
                          {hint ? "Hide hint" : "Show hint"}
                        </button>
                        <button
                          className="button button-secondary"
                          type="button"
                          disabled={busy}
                          onClick={handleSkip}
                        >
                          Skip
                        </button>
                        <button
                          className="button"
                          disabled={busy || !answer.trim()}
                        >
                          {busy ? "Evaluating…" : "Submit answer"}
                        </button>
                      </div>
                      {hint && (
                        <p className="status-box" role="status">
                          Think about the topic{" "}
                          <strong>{session.currentQuestion.topic}</strong> and
                          use a specific example.
                        </p>
                      )}
                    </form>
                  </>
                ) : isComplete ? (
                  <div className="status-box">
                    <strong>Session complete</strong>
                    <p>
                      Your answers are saved. Review a practice report with your
                      answers and feedback.
                    </p>
                    <Link
                      className="button"
                      style={{ marginTop: 15 }}
                      href={`/report/${sessionId}`}
                    >
                      View report
                    </Link>
                  </div>
                ) : (
                  <div className="status-box">
                    <strong>Session {session.status}</strong>
                    <p>This session is no longer active.</p>
                  </div>
                )}
              </section>
              <aside className="panel">
                <h2>Make room to think</h2>
                <p className="aside-copy">
                  Use the timer as a guide, not a deadline to rush against. You
                  can request a hint or skip a question.
                </p>
                <div className="status-box">
                  <strong>Practice only</strong>
                  <p>
                    {session.demo
                      ? "SAMPLE demo scores are simulated from answer length and do not evaluate your response."
                      : "Feedback is for practice, not a hiring decision."}
                  </p>
                </div>
                <p className="aside-copy">
                  Streaming responses are not yet implemented. Voice
                  transcription requires a configured provider.
                </p>
              </aside>
            </div>
          </>
        )}
      </main>
      {!focus && <Footer />}
    </>
  );
}
