"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, signOut, type User } from "firebase/auth";
import {
  addDoc,
  collection,
  getDocs,
  query,
  where,
  deleteDoc,
  doc,
} from "firebase/firestore";
import { useEffect, useState, type FormEvent } from "react";
import { firebaseClient } from "@/lib/firebase-client";
import { setupSchema, type Setup } from "@/lib/schemas";
import { Header, Footer } from "../ui";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  LogOut,
  ShieldCheck,
  Trash2,
  Play,
} from "lucide-react";

type Saved = Setup & { id: string; createdAt: string };
export default function SetupPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [saved, setSaved] = useState<Saved[]>([]);
  const [role, setRole] = useState("Generative AI Engineer");
  const [seniority, setSeniority] = useState("junior");
  const [type, setType] = useState("technical");
  const [durationMin, setDuration] = useState("15");
  const [jdText, setJd] = useState("");
  async function load(uid: string) {
    const { db } = firebaseClient();
    const docs = await getDocs(
      query(collection(db, "configurations"), where("uid", "==", uid)),
    );
    setSaved(
      docs.docs
        .map((item) => {
          const data = item.data();
          const parsed = setupSchema.safeParse(data);
          return parsed.success
            ? [{ ...parsed.data, id: item.id, createdAt: data.createdAt }]
            : [];
        })
        .flat()
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    );
  }
  useEffect(() => {
    try {
      const { auth } = firebaseClient();
      return onAuthStateChanged(auth, (current) => {
        setUser(current);
        if (!current) {
          setSaved([]);
          setLoading(false);
          return;
        }
        load(current.uid)
          .catch(() =>
            setError(
              "Could not load saved configurations. Check your Firestore rules and connection.",
            ),
          )
          .finally(() => setLoading(false));
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Firebase initialization failed.";
      queueMicrotask(() => {
        setError(message);
        setLoading(false);
      });
    }
  }, []);
  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setSuccess("");
    const parsed = setupSchema.safeParse({
      role,
      seniority,
      type,
      durationMin,
      jdText,
    });
    if (!parsed.success) {
      setError(
        "Check the fields: duration must be 5–60 minutes and the job description at most 10,000 characters.",
      );
      return;
    }
    if (!user) {
      setError("Sign in first.");
      return;
    }
    setBusy(true);
    try {
      const submitter = (e.nativeEvent as SubmitEvent)
        .submitter as HTMLButtonElement | null;
      if (submitter?.value === "start") {
        const token = await user.getIdToken();
        const response = await fetch("/api/session/start", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(parsed.data),
        });
        const result: { sessionId?: string; error?: string } =
          await response.json();
        if (!response.ok || !result.sessionId) {
          setError(result.error ?? "Could not start the session.");
          return;
        }
        router.push(`/interview/${result.sessionId}`);
        return;
      }
      const { db } = firebaseClient();
      await addDoc(collection(db, "configurations"), {
        ...parsed.data,
        uid: user.uid,
        createdAt: new Date().toISOString(),
      });
      await load(user.uid);
      setSuccess(
        "Configuration saved. It will be available here when you return.",
      );
    } catch {
      setError(
        "Could not save the configuration. Check your connection and Firestore rules.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function deleteConfig(configId: string) {
    if (!user) return;
    if (!window.confirm("Delete this saved configuration?")) return;
    setBusy(true);
    try {
      const { db } = firebaseClient();
      await deleteDoc(doc(db, "configurations", configId));
      await load(user.uid);
      setSuccess("Configuration deleted.");
    } catch {
      setError("Could not delete configuration.");
    } finally {
      setBusy(false);
    }
  }
  async function startFromConfig(config: Saved) {
    const token = await user?.getIdToken();
    if (!token) return;
    const response = await fetch("/api/session/start", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(config),
    });
    const result: { sessionId?: string; error?: string } =
      await response.json();
    if (!response.ok || !result.sessionId) {
      setError(result.error ?? "Could not start the session.");
      return;
    }
    router.push(`/interview/${result.sessionId}`);
  }
  if (loading)
    return (
      <>
        <Header />
        <main className="screen" aria-live="polite">
          <p className="aside-copy">Loading your practice space…</p>
        </main>
        <Footer />
      </>
    );
  if (!user)
    return (
      <>
        <Header />
        <main className="screen">
          <Link className="back" href="/">
            <ArrowLeft size={14} aria-hidden="true" /> Back to home
          </Link>
          <div className="screen-heading">
            <div className="eyebrow">
              <span className="eyebrow-dot" /> YOUR PRACTICE SPACE
            </div>
            <h1>Let&apos;s get you set up.</h1>
            <p>Sign in to save your interview configuration.</p>
          </div>
          {error && (
            <p role="alert" className="alert" style={{ marginBottom: 20 }}>
              {error}
            </p>
          )}
          <Link className="button" href="/login">
            Continue to sign in <ArrowRight size={15} aria-hidden="true" />
          </Link>
        </main>
        <Footer />
      </>
    );
  return (
    <>
      <Header />
      <main className="screen">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 16,
            alignItems: "center",
          }}
        >
          <Link className="back" href="/">
            <ArrowLeft size={14} aria-hidden="true" /> Back to home
          </Link>
          <button
            className="back"
            onClick={() => {
              signOut(firebaseClient().auth).catch(() =>
                setError("Sign out failed."),
              );
            }}
          >
            <LogOut size={14} aria-hidden="true" /> Sign out
          </button>
        </div>
        <div className="screen-heading">
          <div className="eyebrow">
            <span className="eyebrow-dot" /> START WITH THE DETAILS
          </div>
          <h1>Let&apos;s get you set up.</h1>
          <p>
            Choose what you&apos;d like to practice. You can save more than one
            configuration.
          </p>
        </div>
        <div className="setup-grid">
          <section className="panel" aria-labelledby="details-title">
            <h2 id="details-title">Your interview details</h2>
            <p className="panel-intro">
              A few details to shape your practice session.
            </p>
            <form onSubmit={save}>
              <div className="form-grid">
                <label className="form-label full">
                  Role
                  <select
                    className="field"
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                  >
                    {[
                      "Generative AI Engineer",
                      "ML Engineer",
                      "Data Analyst",
                      "Full-Stack Engineer",
                    ].map((x) => (
                      <option key={x}>{x}</option>
                    ))}
                  </select>
                </label>
                <label className="form-label">
                  Seniority
                  <select
                    className="field"
                    value={seniority}
                    onChange={(e) => setSeniority(e.target.value)}
                  >
                    {["junior", "mid", "senior"].map((x) => (
                      <option key={x}>{x}</option>
                    ))}
                  </select>
                </label>
                <label className="form-label">
                  Interview type
                  <select
                    className="field"
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                  >
                    {["technical", "behavioral", "system design", "mixed"].map(
                      (x) => (
                        <option key={x}>{x}</option>
                      ),
                    )}
                  </select>
                </label>
                <label className="form-label full">
                  Duration in minutes
                  <input
                    className="field"
                    type="number"
                    min="5"
                    max="60"
                    required
                    value={durationMin}
                    onChange={(e) => setDuration(e.target.value)}
                  />
                  <span className="form-hint">
                    Choose between 5 and 60 minutes.
                  </span>
                </label>
                <label className="form-label full">
                  Job description (optional)
                  <textarea
                    className="field"
                    rows={5}
                    maxLength={10000}
                    placeholder="Paste the role description to add context..."
                    value={jdText}
                    onChange={(e) => setJd(e.target.value)}
                  />
                  <span className="form-hint">
                    {jdText.length.toLocaleString()} / 10,000 characters · Avoid
                    including sensitive personal information.
                  </span>
                </label>
              </div>
              {error && (
                <p role="alert" className="alert" style={{ marginTop: 18 }}>
                  {error}
                </p>
              )}
              {success && (
                <p
                  role="status"
                  className="alert success"
                  style={{ marginTop: 18 }}
                >
                  {success}
                </p>
              )}
              <div className="form-footer">
                <span className="form-hint">
                  Demo feedback is illustrative, not an assessment.
                </span>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button
                    className="button button-secondary"
                    name="action"
                    value="save"
                    disabled={busy}
                  >
                    {busy ? "Working..." : "Save configuration"}
                  </button>
                  <button
                    className="button"
                    name="action"
                    value="start"
                    disabled={busy}
                  >
                    {busy ? "Working..." : "Start practice"}{" "}
                    <ArrowRight size={15} aria-hidden="true" />
                  </button>
                </div>
              </div>
            </form>
          </section>
          <aside>
            <section className="panel">
              <div className="aside-title">
                <BookOpen className="aside-icon" size={17} aria-hidden="true" />{" "}
                Saved configurations
              </div>
              <p className="aside-copy">Your saved setups will appear here.</p>
              {saved.length === 0 ? (
                <div className="status-box">
                  <strong>Nothing here yet</strong>
                  <p>Save your first configuration to come back to it later.</p>
                </div>
              ) : (
                <ul className="saved-list">
                  {saved.map((s) => (
                    <li key={s.id} className="saved-item">
                      <strong>{s.role}</strong>
                      <p>
                        {s.seniority} · {s.type} · {s.durationMin} min
                      </p>
                      {s.jdText && (
                        <p style={{ whiteSpace: "pre-wrap" }}>{s.jdText}</p>
                      )}
                      <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                        <button
                          className="button button-secondary"
                          style={{ padding: "6px 12px", fontSize: 12 }}
                          onClick={() => startFromConfig(s)}
                        >
                          <Play size={14} aria-hidden="true" /> Start
                        </button>
                        <button
                          className="button button-secondary"
                          style={{
                            padding: "6px 12px",
                            fontSize: 12,
                            background: "#fff2f1",
                            borderColor: "#f6d5d1",
                            color: "#a63b3b",
                          }}
                          onClick={() => deleteConfig(s.id)}
                        >
                          <Trash2 size={14} aria-hidden="true" /> Delete
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
            <div className="status-box">
              <strong>
                <ShieldCheck
                  size={14}
                  style={{
                    display: "inline",
                    verticalAlign: "middle",
                    marginRight: 5,
                  }}
                  aria-hidden="true"
                />{" "}
                Practice, not a verdict
              </strong>
              <p>
                This tool is for preparation only, not hiring decisions. Demo
                feedback is simulated; live evaluation is not yet verified.
              </p>
            </div>
          </aside>
        </div>
      </main>
      <Footer />
    </>
  );
}
