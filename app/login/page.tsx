"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
} from "firebase/auth";
import { useState, type FormEvent } from "react";
import { firebaseClient } from "@/lib/firebase-client";
import { Header, Footer } from "../ui";
import { ArrowLeft, ArrowRight, ShieldCheck } from "lucide-react";

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [register, setRegister] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const { auth } = firebaseClient();
      if (register)
        await createUserWithEmailAndPassword(auth, email.trim(), password);
      else await signInWithEmailAndPassword(auth, email.trim(), password);
      router.push("/setup");
    } catch (err) {
      setError(
        err instanceof Error &&
          err.message.startsWith("Firebase is not configured")
          ? err.message
          : "Sign-in failed. Check your details or Firebase authentication settings.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function googleLogin() {
    setBusy(true);
    setError("");
    try {
      await signInWithPopup(firebaseClient().auth, new GoogleAuthProvider());
      router.push("/setup");
    } catch {
      setError(
        "Google sign-in failed. Verify the provider and authorized domain in Firebase.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <Header />
      <main className="auth-layout">
        <div className="auth-copy">
          <Link href="/" className="back">
            <ArrowLeft size={14} aria-hidden="true" /> Back to home
          </Link>
          <div className="eyebrow" style={{ marginTop: 42 }}>
            <span className="eyebrow-dot" /> YOUR PRACTICE SPACE
          </div>
          <h1>
            Good preparation
            <br />
            is a <span style={{ color: "var(--purple)" }}>practice.</span>
          </h1>
          <p>
            A little reflection goes a long way. Sign in to save your setup and
            keep your preparation in one place.
          </p>
          <div className="status-box">
            <strong>Work in progress</strong>
            <p>
              Setup has been tested locally. A simulated interview demo is
              available locally; live provider integrations remain untested.
            </p>
          </div>
          <p className="disclaimer">
            <ShieldCheck size={16} aria-hidden="true" /> Made for practice, not
            hiring decisions.
          </p>
        </div>
        <section className="panel auth-panel" aria-labelledby="auth-title">
          <div className="eyebrow">
            <span className="eyebrow-dot" /> WELCOME
          </div>
          <h2 id="auth-title" style={{ marginTop: 12 }}>
            {register ? "Create your account" : "Welcome back"}
          </h2>
          <p className="panel-intro">
            {register
              ? "Start by creating your practice account."
              : "Sign in to continue your preparation."}
          </p>
          <form onSubmit={submit}>
            <label className="form-label">
              Email
              <input
                className="field"
                type="email"
                required
                autoComplete="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>
            <label className="form-label">
              Password
              <input
                className="field"
                type="password"
                minLength={6}
                required
                autoComplete={register ? "new-password" : "current-password"}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </label>
            {error && (
              <p role="alert" className="alert">
                {error}
              </p>
            )}
            <button className="button full-button" disabled={busy}>
              {busy ? "Please wait…" : register ? "Create account" : "Sign in"}{" "}
              <ArrowRight size={15} aria-hidden="true" />
            </button>
          </form>
          <div className="or">OR</div>
          <button
            type="button"
            className="button button-secondary full-button"
            disabled={busy}
            onClick={googleLogin}
          >
            Continue with Google
          </button>
          <button
            type="button"
            className="switch-auth"
            onClick={() => {
              setRegister(!register);
              setError("");
            }}
          >
            {register
              ? "Already have an account? Sign in"
              : "Need an account? Register"}
          </button>
        </section>
      </main>
      <Footer />
    </>
  );
}
