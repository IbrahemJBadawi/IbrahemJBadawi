# CodeMood — TechMood Technology

CodeMood is an independent, Arabic-first, mobile-first programming and AI learning product.

## Current deliverable
An interactive front-end MVP/prototype with:
- Dashboard, responsive navigation and mobile bottom bar.
- Learning paths: Python, Web, AI fundamentals and SQL.
- Short lessons, syntax-pattern code challenges and multiple-choice quizzes.
- Local progress, first-completion XP, daily streak, achievements and drafts.
- Light/dark mode and reusable line iconography.
- MentorMood transition call to action with an explicitly disclosed interim TechMood Academy link.

## Important limits
This is a prototype, NOT a production learning backend.
- Challenge checker matches basic answer structures; it DOES NOT execute, compile or securely test the submitted code.
- Data is stored in localStorage per browser. No auth, multi-device sync or server grading.
- AI guidance is static lesson hints, not an active LLM.
- Push notifications, admin authoring, payments and MentorMood SSO are not connected.
- No user code is evaluated with eval, Function or unsandboxed execution.
- MentorMood is independent; the CTA discloses that its final URL is unconfigured.

## Design
The visual tokens are inspired by the existing TechMood system: #006BE0 royal blue, #38BDF8 sky, #F5F7FB light surface, rounded cards and RTL. Arabic UI uses IBM Plex Sans Arabic, with Inter as the Latin fallback.

## Hosting
Static files in this folder deploy to a separate Vercel project named codemood. The code is deliberately stored on an isolated feature branch to avoid touching existing products in the shared GitHub profile repo. A dedicated CodeMood repository should be created when the repository-creation permission becomes available.

## Next steps
1. Dedicated repository and production domain.
2. Independent Supabase project, migrations, RLS, identity and admin authoring.
3. Real isolated code runner and robust automated tests for Python/JavaScript/SQL.
4. Server-side XP, reliable timezone-aware streaks, anti-cheat and achievement ledger.
5. Live AI tutor with guardrails, rate limits and logging.
6. Verified two-way MentorMood integration once its URL and auth contract are final.
7. Automated unit, accessibility, mobile and end-to-end tests.
