import Link from "next/link";
import {
  ArrowRight,
  AudioLines,
  Check,
  MessageCircle,
  ShieldCheck,
  Sparkles,
  UserRound,
} from "lucide-react";
import { Header, Footer } from "./ui";

export default function Home() {
  return (
    <>
      <Header />
      <main>
        <div className="page-wrap">
          <section className="hero">
            <div className="hero-copy">
              <div className="eyebrow">
                <span className="eyebrow-dot" /> A calmer way to prepare
              </div>
              <h1>
                Better interviews
                <br />
                start with <span>practice.</span>
              </h1>
              <p className="lead">
                Make space to think, learn, and show up more confidently.
                Practice Studio is being built to help you prepare for the
                conversations that matter.
              </p>
              <div className="hero-actions">
                <Link href="/setup" className="button">
                  Set up your practice{" "}
                  <ArrowRight size={16} aria-hidden="true" />
                </Link>
                <Link href="#how-it-works" className="text-link">
                  Explore the approach{" "}
                  <ArrowRight size={14} aria-hidden="true" />
                </Link>
              </div>
              <p className="disclaimer">
                <ShieldCheck size={16} aria-hidden="true" /> A practice tool,
                not a hiring assessment. The interview is available only as an
                illustrative local demo.
              </p>
            </div>
            <div className="preview-wrap">
              <div className="preview">
                <div className="preview-top">
                  <div>
                    <strong>Practice room</strong>
                    <small>Generative AI Engineer · Technical</small>
                  </div>
                  <span className="live-tag">SAMPLE PREVIEW</span>
                </div>
                <div className="preview-body">
                  <div className="preview-meta">
                    <span>Question 2 of 6</span>
                    <span>Illustration only</span>
                  </div>
                  <div className="progress">
                    <span />
                  </div>
                  <div className="chat-line">
                    <span className="avatar">
                      <AudioLines size={17} aria-hidden="true" />
                    </span>
                    <div className="chat-content">
                      <p className="chat-title">INTERVIEWER</p>
                      <div className="bubble">
                        How would you evaluate whether a retrieval-augmented
                        generation system is producing useful answers?
                      </div>
                    </div>
                  </div>
                  <div className="chat-line chat-gap">
                    <span className="avatar user">
                      <UserRound size={17} aria-hidden="true" />
                    </span>
                    <div className="chat-content">
                      <p className="chat-title">YOUR RESPONSE</p>
                      <div className="bubble answer">
                        I’d start by separating retrieval quality from answer
                        quality, then build a small set of representative
                        questions...
                      </div>
                    </div>
                  </div>
                </div>
                <div className="sample-note">
                  SAMPLE · Illustrative conversation, not a live or saved
                  interview.
                </div>
              </div>
            </div>
          </section>
          <hr className="divider" />
          <section id="how-it-works">
            <div className="section-head">
              <div>
                <div className="eyebrow">
                  <span className="eyebrow-dot" /> THE APPROACH
                </div>
                <h2>Practice with purpose.</h2>
              </div>
              <p>
                A thoughtful workflow for turning preparation into progress.
                Features below are planned and not yet available.
              </p>
            </div>
            <div className="feature-grid">
              <article className="feature-card">
                <div className="feature-icon">
                  <Sparkles size={19} aria-hidden="true" />
                </div>
                <h3>Make it yours</h3>
                <p>
                  Choose a role, experience level and interview type. Add a job
                  description to give your practice context.
                </p>
              </article>
              <article className="feature-card">
                <div className="feature-icon">
                  <MessageCircle size={19} aria-hidden="true" />
                </div>
                <h3>Think out loud</h3>
                <p>
                  The planned interview experience will adapt questions as you
                  answer, with space to find your own voice.
                </p>
              </article>
              <article className="feature-card">
                <div className="feature-icon">
                  <Check size={19} aria-hidden="true" />
                </div>
                <h3>Keep improving</h3>
                <p>
                  Planned feedback will help you reflect on strengths, identify
                  gaps and decide what to practice next.
                </p>
              </article>
            </div>
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
}
