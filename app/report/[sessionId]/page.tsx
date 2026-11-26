"use client";
import Link from "next/link";
import { use, useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
} from "recharts";
import { firebaseClient } from "@/lib/firebase-client";
import { Header, Footer } from "@/app/ui";
import type { Evaluation } from "@/lib/schemas";
type Report = {
  overall: number;
  subscores: Record<string, number>;
  strengths: string[];
  improvements: string[];
  practicePlan: string[];
  turns: {
    question: { text: string; topic: string };
    answer: { text: string; skipped?: boolean };
    evaluation: Evaluation;
  }[];
  demo: boolean;
  role: string;
  type: string;
  startedAt: string;
  answeredCount: number;
  skippedCount: number;
};
export default function ReportPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = use(params);
  const [report, setReport] = useState<Report | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    try {
      return onAuthStateChanged(firebaseClient().auth, async (user) => {
        if (!user) {
          setError("Please sign in to view this report.");
          setLoading(false);
          return;
        }
        try {
          const token = await user.getIdToken();
          const response = await fetch("/api/session/finish", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ sessionId }),
          });
          const data = await response.json();
          if (!response.ok) throw new Error(data.error);
          setReport(data);
        } catch (err) {
          setError(
            err instanceof Error ? err.message : "Could not load the report.",
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
  return (
    <>
      <div className="no-print">
        <Header />
      </div>
      <main className="screen">
        {loading ? (
          <p aria-live="polite">Preparing your report…</p>
        ) : error ? (
          <p role="alert" className="alert">
            {error}{" "}
            <Link href="/login" className="text-link">
              Sign in
            </Link>
          </p>
        ) : (
          report && (
            <>
              <div className="screen-heading">
                <div className="eyebrow">
                  <span className="eyebrow-dot" />
                  {report.demo
                    ? "SAMPLE DEMO REPORT · SIMULATED SCORES"
                    : "PRACTICE REPORT"}
                </div>
                <h1>Your practice, reflected.</h1>
                <p>
                  {report.role} · {report.type} · Practice only, not a hiring
                  assessment.
                </p>
                <p className="aside-copy">
                  Answered: {report.answeredCount} · Skipped:{" "}
                  {report.skippedCount}
                </p>
                <div
                  className="no-print"
                  style={{
                    display: "flex",
                    gap: 12,
                    marginTop: 18,
                    flexWrap: "wrap",
                  }}
                >
                  <button className="button" onClick={() => window.print()}>
                    Print / save as PDF
                  </button>
                  <Link className="button button-secondary" href="/setup">
                    New setup
                  </Link>
                </div>
              </div>
              {report.demo && (
                <p className="alert">
                  SAMPLE: Scores are simulated from answer length, not AI
                  assessment. Do not use them to judge performance.
                </p>
              )}
              <div className="setup-grid" style={{ marginTop: 20 }}>
                <section className="panel">
                  <h2>Skill overview</h2>
                  <p className="aside-copy">
                    Overall score{" "}
                    <strong style={{ fontSize: 26, color: "var(--purple)" }}>
                      {report.overall.toFixed(1)} / 10
                    </strong>
                  </p>
                  <div
                    style={{ width: "100%", height: 300 }}
                    aria-label="Radar chart of rubric scores"
                  >
                    <ResponsiveContainer>
                      <RadarChart
                        data={Object.entries(report.subscores).map(
                          ([skill, score]) => ({ skill, score }),
                        )}
                      >
                        <PolarGrid />
                        <PolarAngleAxis
                          dataKey="skill"
                          tick={{ fontSize: 11, fill: "#50495b" }}
                        />
                        <PolarRadiusAxis
                          domain={[0, 10]}
                          tick={{ fontSize: 10 }}
                        />
                        <Radar
                          dataKey="score"
                          stroke="#5843ba"
                          fill="#8e7bdb"
                          fillOpacity={0.45}
                        />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                  <ul className="aside-copy">
                    {Object.entries(report.subscores).map(([skill, score]) => (
                      <li key={skill}>
                        {skill}: {score.toFixed(1)} / 10
                      </li>
                    ))}
                  </ul>
                </section>
                <aside className="panel">
                  <h2>Highlights</h2>
                  <p className="eyebrow" style={{ marginTop: 20 }}>
                    STRENGTHS
                  </p>
                  <ul className="aside-copy">
                    {report.strengths.map((x, i) => (
                      <li key={i}>{x}</li>
                    ))}
                  </ul>
                  <p className="eyebrow" style={{ marginTop: 20 }}>
                    IMPROVEMENT AREAS
                  </p>
                  <ul className="aside-copy">
                    {report.improvements.map((x, i) => (
                      <li key={i}>{x}</li>
                    ))}
                  </ul>
                  <p className="aside-copy">
                    Ranked and deduplicated from per-answer feedback.
                  </p>
                </aside>
              </div>
              <section className="panel" style={{ marginTop: 20 }}>
                <h2>Question breakdown</h2>
                {report.turns.map((turn, i) => (
                  <article
                    className="saved-item"
                    key={i}
                    style={{ marginTop: 14 }}
                  >
                    <p className="eyebrow">
                      QUESTION {i + 1} · {turn.question.topic}{" "}
                      {turn.answer.skipped && (
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
                    <p>
                      <strong>{turn.question.text}</strong>
                    </p>
                    <p>
                      <strong>Your answer:</strong>{" "}
                      {turn.answer.skipped ? (
                        <em style={{ color: "var(--muted)" }}>
                          Question skipped
                        </em>
                      ) : (
                        turn.answer.text
                      )}
                    </p>
                    <p>
                      <strong>Improvement tip:</strong> {turn.evaluation.tip}
                    </p>
                    <p>
                      <strong>Ideal answer outline:</strong>{" "}
                      {turn.evaluation.idealOutline.join(" ")}
                    </p>
                  </article>
                ))}
              </section>
              <section className="panel" style={{ marginTop: 20 }}>
                <h2>7-day practice plan</h2>
                <p className="aside-copy">
                  Personalized based on your improvement areas.
                </p>
                <ol className="aside-copy">
                  {report.practicePlan.map((x, i) => (
                    <li key={i} style={{ marginBottom: 8 }}>
                      Day {i + 1}: {x}
                    </li>
                  ))}
                </ol>
              </section>
            </>
          )
        )}
      </main>
      <div className="no-print">
        <Footer />
      </div>
    </>
  );
}
