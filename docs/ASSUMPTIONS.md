# Assumptions

- Groq replaces OpenAI as the model provider at the user's request. The OpenAI-compatible SDK is configured for Groq's documented endpoint, subject to model support. Model names must be supplied via environment variables.
- No real Internee.pk content was provided. Question data is explicitly labelled SAMPLE.
- The user's Firebase project contains real data, so tests use isolated Firebase emulators and no live rules or data have been changed. Google authentication remains untested.
- During M1, the setup page saves a session document directly from the authenticated client. This is provisional; the requested server-side state machine and authenticated API remain unimplemented. The provisional rules have not been security-tested.
- Tailwind source detection is restricted to the app directory because unrestricted detection caused build workers to be terminated in the sandbox. Add shared component directories explicitly when those are created.
- A replacement Groq credential is required for real-provider tests. The key shared in chat was exposed and must be revoked; it is not stored in the project.
