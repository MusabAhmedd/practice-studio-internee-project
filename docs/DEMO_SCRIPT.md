# Demo Script — Practice Studio

## Overview

This script walks through a complete demonstration of Practice Studio for an internship evaluation. Total time: ~10 minutes.

## Prerequisites

- Application running locally (see [SETUP.md](../SETUP.md))
- Firebase emulators active (for demo mode)
- Browser at http://localhost:3000

---

## 1. Landing Page (30 seconds)

**Navigate to**: http://localhost:3000

**Talking Points**:

- "Practice Studio is an interview preparation platform, not a hiring assessment tool"
- "Built with Next.js 16, React 19, Firebase, and Groq AI"
- "Supports role-based practice with adaptive questioning"

**Actions**:

- Scroll to show "The Approach" section
- Click "Set up your practice" button

---

## 2. Authentication (45 seconds)

**Navigate to**: /login (auto-redirect from setup)

**Talking Points**:

- "Firebase Authentication with email/password and Google OAuth"
- "Demo mode uses local emulators - no real accounts created"

**Actions**:

1. Click "Need an account? Register"
2. Enter email: `demo-[timestamp]@example.test`
3. Enter password: `test-password-123`
4. Click "Create account"
5. Observe redirect to /setup

---

## 3. Interview Setup (90 seconds)

**Navigate to**: /setup

**Talking Points**:

- "Four software engineering roles with tailored question banks"
- "Three seniority levels affect starting difficulty"
- "Four interview types change evaluation criteria"
- "Optional job description personalizes questions"
- "Configurations saved to Firestore, separate from interview sessions"

**Actions**:

1. **Role**: Select "Generative AI Engineer"
2. **Seniority**: Select "mid"
3. **Interview type**: Select "technical"
4. **Duration**: Enter "15" minutes
5. **Job description**: Paste:
   ```
   We're looking for a Generative AI Engineer to build RAG systems
   and LLM-powered applications. Experience with vector databases,
   prompt engineering, and model evaluation required.
   ```
6. Click **"Save configuration"**
7. Verify success message and config appears in "Saved configurations"
8. Click **"Start practice"** on the saved config (or the form button)

---

## 4. Interview Session (3 minutes)

**Navigate to**: /interview/[sessionId]

**Talking Points**:

- "Server-authoritative session state with deterministic engine"
- "Adaptive difficulty based on answer quality"
- "AI-generated follow-up questions for strong answers"
- "Timer enforced server-side, not just client-side"
- "Skip button properly records skipped questions (not evaluated as poor answers)"

**Actions**:

1. **Observe**: Header shows "PRACTICE SESSION", role, type, question count, timer
2. **Question 1**: Read aloud, then answer:
   ```
   I would evaluate a RAG system by separating retrieval quality
   from generation quality. For retrieval, I'd use metrics like
   recall@k and MRR against a labeled dataset. For generation,
   I'd evaluate factual accuracy, relevance, and hallucination rate
   using both automated metrics and human evaluation.
   ```
3. Click **"Submit answer"**
4. **Observe**: Feedback appears with tip, strengths, weaknesses
5. **Question 2** (likely follow-up): Answer with technical depth
6. Click **"Submit answer"**
7. **Question 3**: Give a shorter answer (~10 words)
8. Click **"Submit answer"**
9. **Observe**: "clarify" action triggers - asks for more detail
10. **Question 4**: Click **"Skip"** button
11. **Observe**: Shows "(skipped)" in history, not evaluated as poor
12. **Final question**: Answer thoroughly
13. **Observe**: "Session complete" with "View report" button

---

## 5. Final Report (2 minutes)

**Navigate to**: /report/[sessionId] (click "View report")

**Talking Points**:

- "Aggregated scores from all answered questions (skipped excluded)"
- "Radar chart visualizes 5 evaluation criteria"
- "Strengths/weaknesses deduplicated and ranked by frequency"
- "Personalized 7-day practice plan based on actual weaknesses"
- "Question-by-question breakdown with ideal answer outlines"
- "Professional print/PDF export"

**Actions**:

1. **Skill Overview**: Note overall score, radar chart, per-criterion scores
2. **Highlights**: Review ranked strengths and improvement areas
3. **Question Breakdown**: Expand each question to see:
   - Your answer
   - Improvement tip
   - Ideal answer outline
4. **7-Day Plan**: Note personalized recommendations
5. Click **"Print / save as PDF"** → Save as PDF
6. Click **"New setup"** to return

---

## 6. Voice Interview Demo (Optional - 90 seconds)

**Prerequisites**: Groq STT configured, microphone permission granted

**Navigate to**: /setup → Start new interview

**Actions**:

1. On interview page, click **"Record voice answer"**
2. Allow microphone permission
3. Speak answer for 30-60 seconds
4. Click **"Stop recording"**
5. **Observe**: Transcription appears in text area
6. Review/edit transcript
7. Click **"Submit answer"**
8. **Observe**: Speech metrics displayed (pace, fillers, sentence length)
9. Continue with text or voice

**Talking Points**:

- "Real Groq Whisper transcription"
- "Approximate speech metrics for self-awareness"
- "Text fallback always available"
- "Metrics are not scored - only for practice awareness"

---

## 7. Configuration Management (30 seconds)

**Navigate to**: /setup

**Actions**:

1. View saved configurations list
2. Click **"Start"** on a saved config
3. Click **"Delete"** on a config → confirm
4. Observe removal from list

**Talking Points**:

- "Configurations separate from interview sessions"
- "Start new interviews from saved configs"
- "Full CRUD: Create, Read, Update (via new save), Delete"

---

## 8. Security & Architecture Highlights (30 seconds)

**Navigate to**: Any page, show browser DevTools → Network tab

**Talking Points**:

- "All API calls include Firebase ID token"
- "Groq API key never exposed to client"
- "Firestore rules enforce user data isolation"
- "Rate limiting: 15 requests/minute per user"
- "Input validation with Zod on all endpoints"
- "Prompt injection protection in AI prompts"

---

## 9. Code Quality Evidence (30 seconds)

**Terminal Commands**:

```bash
# Run all quality checks
npm run lint
npm run format:check
npx tsc --noEmit
npm run test:engine
npm run test:rubric
npm run test:speech
```

**Talking Points**:

- "Zero linting errors"
- "Consistent Prettier formatting"
- "Strict TypeScript with no errors"
- "16 unit tests passing"
- "CI/CD pipeline with GitHub Actions"

---

## 10. Closing (30 seconds)

**Summary Points**:

1. **Complete workflow**: Auth → Setup → Interview → Report
2. **Real AI integration**: Groq evaluation + transcription
3. **Adaptive engine**: Difficulty adjusts, follow-ups generated
4. **Proper skipped handling**: Not penalized as poor answers
5. **Professional reporting**: Charts, personalized plans, PDF
6. **Security-first**: Server secrets, user isolation, validation
7. **Tested & documented**: Unit tests, E2E, CI/CD, docs

**Repository**: [GitHub URL]
**Live Demo**: [Vercel URL if deployed]
**Documentation**: `/docs` folder

---

## Demo Tips

- **Reset between demos**: Use different email each time
- **Emulator data persists**: Until emulator restart
- **Demo mode scores**: Clearly labeled "SAMPLE DEMO · SIMULATED FEEDBACK"
- **Voice issues**: "Text always works" - graceful fallback
- **Time management**: Skip questions if running long
- **PDF export**: Use browser print → Save as PDF

---

## Troubleshooting During Demo

| Issue                     | Quick Fix                                     |
| ------------------------- | --------------------------------------------- |
| "Firebase not configured" | Rebuild with `NEXT_PUBLIC_USE_EMULATORS=true` |
| "Groq not configured"     | Enable DEMO_MODE=true                         |
| Voice transcription fails | "Text fallback always available"              |
| Emulator connection lost  | Restart emulators, rebuild                    |
| Session not found         | Clear browser cache, re-login                 |

---

## Key Files for Evaluators

```
├── lib/engine.ts           # Deterministic interview policy
├── lib/openai.ts           # Groq AI integration
├── lib/question-bank.ts    # Question selection logic
├── lib/rubric.ts           # Scoring & aggregation
├── app/api/session/answer  # Answer submission with transactions
├── app/report/[id]/page.tsx # Report with Recharts
├── firestore.rules         # Security rules
└── .github/workflows/ci.yml # CI/CD pipeline
```
