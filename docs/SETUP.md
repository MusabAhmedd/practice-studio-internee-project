# Setup Guide

## Prerequisites

- **Node.js**: 24.12+ (check with `node --version`)
- **npm**: 10+ (comes with Node.js)
- **Java**: 21 (for Firebase emulators)
- **Git**: For version control
- **Firebase CLI**: `npm install -g firebase-tools`

## Quick Start (Development with Emulators)

### 1. Clone and Install

```bash
git clone <your-repo-url>
cd practice-studio
npm ci
```

### 2. Configure Environment

```bash
cp .env.example .env.local
```

Edit `.env.local` with your values:

```env
# Groq AI (required for live AI evaluation)
GROQ_API_KEY=your_groq_api_key
OPENAI_CHAT_MODEL=llama-3.3-70b-versatile
OPENAI_STT_MODEL=whisper-large-v3-turbo

# Firebase (required for auth & database)
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=your-service-account-email
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# Firebase Web Config (public, safe to expose)
NEXT_PUBLIC_FIREBASE_API_KEY=your-web-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_APP_ID=your-web-app-id

# Demo/Emulator Settings (development only)
DEMO_MODE=false
NEXT_PUBLIC_USE_EMULATORS=false
# FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099
# FIRESTORE_EMULATOR_HOST=127.0.0.1:8080
```

### 3. Firebase Project Setup

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Create a new project (or use existing)
3. **Authentication**:
   - Enable Email/Password provider
   - Enable Google provider
   - Add authorized domains (localhost, your Vercel domain)
4. **Firestore Database**:
   - Create database in Native mode
   - Start in test mode (rules will be deployed later)
5. **Web App**:
   - Add a web app (</> icon)
   - Copy config values to `.env.local`
6. **Service Account**:
   - Project Settings → Service Accounts → Generate New Private Key
   - Copy values to `.env.local` (private key must preserve newlines)

### 4. Groq API Setup

1. Sign up at [Groq Console](https://console.groq.com)
2. Create an API key
3. Verify model access:
   - Chat: `llama-3.3-70b-versatile` (supports JSON schema)
   - STT: `whisper-large-v3-turbo`
4. Add key to `.env.local`

### 5. Run with Emulators

```bash
# Terminal 1: Start emulators
npx firebase emulators:start --only auth,firestore --project demo-interview-test

# Terminal 2: Build for emulators
NEXT_PUBLIC_USE_EMULATORS=true npm run build

# Terminal 3: Start app in demo mode
DEMO_MODE=true FIREBASE_PROJECT_ID=demo-interview-test \
FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099 \
FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 \
npm run start
```

Open http://localhost:3000

### 6. Run without Emulators (Production Mode)

```bash
# Ensure DEMO_MODE=false and NEXT_PUBLIC_USE_EMULATORS=false in .env.local
npm run build
npm run start
```

Open http://localhost:3000

## Verification Checklist

- [ ] `npm run lint` passes
- [ ] `npm run format:check` passes
- [ ] `npx tsc --noEmit` passes
- [ ] `npm run test:engine` passes (9 tests)
- [ ] `npm run test:rubric` passes (4 tests)
- [ ] `npm run test:speech` passes (3 tests)
- [ ] Firebase emulators start without errors
- [ ] App loads at localhost:3000
- [ ] Can create account and sign in
- [ ] Can save interview configuration
- [ ] Can start interview session
- [ ] Can submit text answers
- [ ] Can skip questions
- [ ] Can record voice (if Groq STT configured)
- [ ] Can view report with radar chart
- [ ] Can print/save report as PDF

## Troubleshooting

### "Firebase is not configured"

- Check `.env.local` has all `NEXT_PUBLIC_FIREBASE_*` values
- Rebuild after changing env vars: `npm run build`

### "Groq evaluation is not configured"

- Verify `GROQ_API_KEY` and `OPENAI_CHAT_MODEL` in `.env.local`
- Ensure model supports JSON schema (e.g., `llama-3.3-70b-versatile`)

### "Voice transcription is unavailable"

- Verify `OPENAI_STT_MODEL` in `.env.local`
- Check Groq model access in console

### Emulator connection errors

- Ensure Java 21 is installed: `java -version`
- Check emulator ports (9099, 8080) are free
- Restart emulators: `firebase emulators:start --only auth,firestore`

### Build failures

- Clear cache: `rm -rf .next node_modules && npm ci`
- Check Node version: `node --version` (must be 24.12+)

### TypeScript errors

- Run `npx tsc --noEmit` for full diagnostics
- Ensure all imports use `@/` alias correctly

## Environment Variables Reference

| Variable                              | Required | Description                       |
| ------------------------------------- | -------- | --------------------------------- |
| `GROQ_API_KEY`                        | Yes*     | Groq API key for AI evaluation    |
| `OPENAI_CHAT_MODEL`                   | Yes*     | Groq chat model name              |
| `OPENAI_STT_MODEL`                    | Yes*     | Groq speech-to-text model         |
| `FIREBASE_PROJECT_ID`                 | Yes      | Firebase project ID               |
| `FIREBASE_CLIENT_EMAIL`               | Yes*     | Service account email             |
| `FIREBASE_PRIVATE_KEY`                | Yes*     | Service account private key       |
| `NEXT_PUBLIC_FIREBASE_API_KEY`        | Yes      | Web app API key                   |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`    | Yes      | Auth domain                       |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID`     | Yes      | Project ID                        |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | Yes      | Storage bucket                    |
| `NEXT_PUBLIC_FIREBASE_APP_ID`         | Yes      | Web app ID                        |
| `DEMO_MODE`                           | No       | Enable demo scoring (dev only)    |
| `NEXT_PUBLIC_USE_EMULATORS`           | No       | Use Firebase emulators (dev only) |

*Required for production/live AI features. Demo mode works without them.

## Security Notes

- Never commit `.env.local` or any file with real credentials
- Rotate API keys if accidentally exposed
- Use separate Firebase projects for dev/staging/prod
- Restrict Firestore rules before production deployment
- Monitor Groq API usage and set billing alerts
