# Architecture Documentation

## System Overview

Practice Studio is a full-stack interview preparation platform built with Next.js, Firebase, and Groq AI. The architecture follows a client-server model with clear separation of concerns.

## Component Diagram

```mermaid
flowchart TB
    subgraph Client["Browser (Next.js)"]
        UI[React Components]
        Auth[Firebase Auth Client]
        DB[Firestore Client]
    end

    subgraph Server["Next.js API Routes (Node.js)"]
        Start[/api/session/start]
        Answer[/api/session/answer]
        Finish[/api/session/finish]
        Transcribe[/api/transcribe]
    end

    subgraph Services["External Services"]
        Firebase[(Firebase Auth & Firestore)]
        Groq[Groq API]
    end

    UI --> Auth
    UI --> DB
    UI --> Start
    UI --> Answer
    UI --> Finish
    UI --> Transcribe

    Start -->|Admin SDK| Firebase
    Answer -->|Admin SDK| Firebase
    Finish -->|Admin SDK| Firebase
    Transcribe --> Groq
    Start --> Groq
    Answer --> Groq
```

## Data Flow

### 1. Interview Setup & Start

```
User → Setup Page → POST /api/session/start
    → Validate input (Zod)
    → Rate limit check
    → Get question bank for role
    → Engine: nextQuestion() → first decision
    → Question bank: chooseQuestion() → first question
    → Create session document in Firestore
    → Return sessionId + first question
```

### 2. Answer Submission

```
User → Interview Page → POST /api/session/answer
    → Verify auth & session ownership
    → Rate limit check
    → Load current question & previous turns
    → If skipped: use skippedEvaluation
    → Else if DEMO_MODE: demoEvaluation()
    → Else: evaluateAnswer() via Groq
    → Engine: nextQuestion() with updated state
    → Question bank: chooseQuestion() or AI follow-up
    → Transaction: save turn + update session
    → Return evaluation + next question
```

### 3. Interview Completion

```
User → Report Page → POST /api/session/finish
    → Verify auth & session ownership
    → Load all turns
    → Filter skipped evaluations
    → Aggregate scores (rubric.ts)
    → Deduplicate & rank strengths/weaknesses
    → Generate personalized practice plan
    → Update session with overall scores
    → Return complete report data
```

### 4. Voice Transcription

```
User → VoiceInput Component → POST /api/transcribe
    → Verify auth & rate limit
    → Validate audio format (WebM/OGG)
    → Size limit: 5MB
    → Groq Whisper API call
    → Return transcript text
    → Client: speechMetrics() on transcript
```

## Core Modules

### lib/engine.ts - Deterministic Interview Policy

- `InterviewState`: turns, timeLeftSec, topicsCovered, lastScore, targetCount, seniority, topics, type, jdText
- `Decision`: action (open/follow_up/new_topic/probe_or_clarify/clarify/close), difficulty, topic, reason
- `nextQuestion(state)`: Pure function determining next action
- `calculateTargetCount(durationMin, type)`: Questions based on time and type

### lib/question-bank.ts - Question Selection

- Four role-specific banks (Generative AI, ML, Data Analyst, Full-Stack)
- 15 questions per role, difficulties 1-5, typed by interview type
- `chooseQuestion(bank, decision, usedIds, interviewType)`: Nearest difficulty fallback
- `filterByType(bank, type)`: Type-aware filtering
- `getAvailableTopics(bank, type)`: Topic discovery

### lib/openai.ts - Groq Integration

- `evaluateAnswer()`: Structured evaluation with JSON schema
- `generateFollowUpQuestion()`: Contextual follow-up generation
- Retry logic with validation (3 attempts, exponential backoff)
- Prompt injection protection via "untrusted_" prefixes

### lib/rubric.ts - Scoring & Aggregation

- `meanScore(evaluation)`: Average of 5 criteria
- `aggregate(evaluations)`: Overall + per-criterion averages
- `validateWithRetry()`: Schema validation with retries

### lib/schemas.ts - Validation

- `setupSchema`: Interview configuration
- `evaluationSchema`: AI evaluation output
- `answerRequestSchema`: Answer submission input
- `sessionStatusSchema`: Session lifecycle states

### lib/speech-metrics.ts - Voice Analysis

- Word count, filler detection, words/minute
- Filler rate, avg words per sentence
- Disclaimer: approximate metrics only

## Session Lifecycle

```
created → active → completed
              ↘ expired (time limit)
              ↘ cancelled (user action)
```

Server-authoritative state transitions via Firestore transactions.

## Security Model

- **Authentication**: Firebase ID tokens on all API routes
- **Authorization**: Session ownership verified per request
- **Data Isolation**: Firestore rules enforce uid matching
- **Rate Limiting**: Per-user token bucket (15 req/min)
- **Input Validation**: Zod schemas on all inputs
- **Secrets**: Server-only (GROQ_API_KEY, Firebase Admin credentials)
- **Prompt Injection**: Untrusted data prefixed, never used as instructions

## Deployment Architecture

```
Vercel (Next.js) ──► Firebase (Auth, Firestore)
                    ──► Groq (Chat, STT)
```

- Static assets & SSR on Vercel Edge
- Serverless functions for API routes
- Firebase handles auth & database globally
- Groq provides AI inference
