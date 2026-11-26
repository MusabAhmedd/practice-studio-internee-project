# Testing Guide

## Test Suite Overview

| Category       | Command                | Description                      |
| -------------- | ---------------------- | -------------------------------- |
| Unit Tests     | `npm run test:engine`  | Interview engine logic (9 tests) |
| Unit Tests     | `npm run test:rubric`  | Scoring & aggregation (4 tests)  |
| Unit Tests     | `npm run test:speech`  | Speech metrics (3 tests)         |
| Linting        | `npm run lint`         | ESLint                           |
| Formatting     | `npm run format:check` | Prettier                         |
| Type Checking  | `npx tsc --noEmit`     | TypeScript                       |
| E2E Tests      | `npx playwright test`  | Playwright browser tests         |
| Firebase Rules | _(TODO)_               | Rules unit testing               |

## Running Tests

### All Unit Tests

```bash
npm run test:engine && npm run test:rubric && npm run test:speech
```

### With Coverage (Future)

```bash
# TODO: Add c8/nyc coverage when needed
```

### E2E Tests (Requires Emulators)

```bash
# Terminal 1: Start emulators
npx firebase emulators:start --only auth,firestore --project demo-interview-test

# Terminal 2: Build for emulators
NEXT_PUBLIC_USE_EMULATORS=true npm run build

# Terminal 3: Start app
DEMO_MODE=true FIREBASE_PROJECT_ID=demo-interview-test \
FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099 \
FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 \
npm run start &

# Terminal 4: Run Playwright
npx playwright test tests/e2e --workers=1
```

## Test Details

### Engine Tests (`tests/engine.test.ts`)

Tests the deterministic interview policy in `lib/engine.ts`:

1. **Seniority-based difficulty**: Junior=2, Mid=3, Senior=4
2. **Close priority**: <90s or target count reached → close
3. **Short answers**: <15 words → clarify action
4. **Strong answers**: Score ≥7.5 → follow_up, difficulty+1 (max 5)
5. **Average answers**: 4-7.49 → new_topic, same difficulty
6. **Weak answers**: Score <4 → probe_or_clarify, difficulty-1 (min 1)
7. **Skipped answers**: Moves to new topic at lower difficulty
8. **Question selection**: No duplicate IDs, nearest difficulty fallback
9. **Question bank**: 15+ questions per role, valid difficulties

### Rubric Tests (`tests/rubric.test.ts`)

Tests scoring logic in `lib/rubric.ts`:

1. **Mean & aggregation**: Correct averages
2. **Schema validation**: Rejects invalid scores (>10, extra fields)
3. **Retry logic**: Malformed JSON retried up to 3 times
4. **Failure handling**: Persistent invalid output throws

### Speech Metrics Tests (`tests/speech-metrics.test.ts`)

Tests voice analysis in `lib/speech-metrics.ts`:

1. **Filler counting**: um, uh, like, so, etc.
2. **Pace calculation**: Words per minute
3. **Edge cases**: Zero duration, whitespace
4. **Extended fillers**: you know, basically, actually

### E2E Tests (`tests/e2e/`)

Playwright browser automation tests:

#### `interview.spec.ts` - Full Interview Flow

- Register → Setup → Start interview
- Answer 3 questions with text
- Verify session completion
- Navigate to report
- Generate PDF

#### `setup.spec.ts` - Configuration Persistence

- Register → Setup → Save config
- Verify config appears in list
- Reload page → config persists

#### `voice-disabled.spec.ts` - Voice Fallback

- Start interview → Attempt voice recording
- Verify transcription unavailable message
- Submit text answer → continues normally

## Writing New Tests

### Unit Test Pattern

```typescript
// tests/new-feature.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { myFunction } from "../lib/my-module";

test("describes expected behavior", () => {
  const result = myFunction(input);
  assert.deepEqual(result, expected);
});
```

### E2E Test Pattern

```typescript
// tests/e2e/new-feature.spec.ts
import { test, expect } from "@playwright/test";

test("user can do something", async ({ page }) => {
  await page.goto("http://127.0.0.1:3000/login");
  // ... interactions
  await expect(page.locator("text=Expected")).toBeVisible();
});
```

## CI Integration

GitHub Actions (`.github/workflows/ci.yml`) runs:

1. **lint-and-typecheck**: ESLint, Prettier, TypeScript
2. **unit-tests**: All three test suites
3. **firebase-rules-tests**: (Placeholder)
4. **build**: Production build with emulator config
5. **e2e-tests**: Playwright with emulators
6. **deploy-preview**: Vercel preview on PRs

## Test Data

### Question Banks

Located in `data/questions/`:

- `SAMPLE_generative_ai.json` - 15 questions
- `SAMPLE_ml_engineer.json` - 15 questions
- `SAMPLE_data_analyst.json` - 15 questions
- `SAMPLE_full_stack.json` - 15 questions

All questions prefixed with `SAMPLE-` to indicate they are illustrative.

### Demo Evaluation

`lib/demo-evaluation.ts` provides deterministic length-based scoring:

- <15 words: 3/10
- 15-44 words: 5/10
- ≥45 words: 8/10

Used when `DEMO_MODE=true` or Groq not configured.

## Troubleshooting Tests

### "Cannot find package 'tsx'"

```bash
npm ci
```

### Playwright browser not found

```bash
npx playwright install --with-deps chromium
```

### Emulator connection refused

- Check Java 21: `java -version`
- Verify ports 8080, 9099 free
- Increase startup wait time in CI

### Flaky E2E tests

- Use `test.setTimeout(90000)` for slow operations
- Add explicit waits: `await expect(locator).toBeVisible({timeout: 30000})`
- Run with `--workers=1` for isolation

## Future Test Improvements

- [ ] Firebase Rules Unit Tests (@firebase/rules-unit-testing)
- [ ] API Integration Tests (with mocked Groq)
- [ ] Visual Regression Tests (Playwright screenshots)
- [ ] Load Testing (k6 or artillery)
- [ ] Accessibility Tests (axe-core)
- [ ] Code Coverage Reporting (c8 + Istanbul)
