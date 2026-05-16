# Walkthrough: Classes WebApp Framework

This document walks through the architecture, data flow, and key patterns of the Classes webapp — a Next.js 16 application that serves as the student/teacher portal for the Sensai Arduino Classes system.

---

## Overview

The webapp provides:

- **Student-facing pages** — course catalog, module viewer, dashboard with progress tracking, AI chat, learning contract submission
- **Teacher admin panel** — classroom overview, student management, AI-generated module review/merge, invitation management
- **GitHub integration** — OAuth login, workflow dispatch, issue creation, repo content fetching
- **AutoGrader results** — workflow run status, per-module scoring, grade persistence via SQLite

---

## Tech Stack

| Layer | Choice |
|-------|--------|
| Framework | Next.js 16 (App Router, Turbopack) |
| Language | TypeScript (strict mode) |
| Styling | Tailwind CSS 4 |
| Auth | next-auth v4 + GitHub OAuth |
| GitHub API | @octokit/rest v22 |
| Database | better-sqlite3 (local file) |
| AI | GitHub Models (OpenAI-compatible streaming) |
| Rendering | react-markdown + remark-gfm + rehype-highlight |
| Icons | lucide-react |

---

## Project Structure

```
webapp/
├── src/
│   ├── app/                    # Next.js App Router pages & API routes
│   │   ├── page.tsx            # Landing page
│   │   ├── courses/            # Module catalog + detail
│   │   ├── dashboard/          # Student dashboard, contract, workflows
│   │   ├── ai/                 # AI chat interface
│   │   ├── admin/              # Teacher panel (guard-protected)
│   │   │   ├── page.tsx        # Classroom overview
│   │   │   ├── drafts/         # AI module review & merge
│   │   │   └── students/       # Per-student detail
│   │   ├── docs/               # Documentation hub
│   │   └── api/                # Server-side API routes
│   │       ├── auth/           # NextAuth handler
│   │       ├── github/         # Octokit wrappers
│   │       ├── ai/             # Chat streaming
│   │       ├── admin/          # Teacher-only endpoints
│   │       ├── progress/       # Student progress
│   │       └── webhooks/       # GitHub webhook receiver
│   ├── components/             # Shared UI components
│   ├── hooks/                  # Custom React hooks
│   ├── lib/                    # Server utilities
│   │   ├── auth.ts             # NextAuth config
│   │   ├── github.ts           # Octokit operations
│   │   ├── github-app.ts       # GitHub App installation auth
│   │   ├── api-auth.ts         # API route auth helper
│   │   ├── db.ts               # SQLite database layer
│   │   ├── env.ts              # Typed env access + isTeacher()
│   │   ├── constants.ts        # Module metadata, weights
│   │   └── webhook-verify.ts   # GitHub webhook signature check
│   └── types/                  # TypeScript type definitions
├── data/                       # SQLite database file location
├── public/                     # Static assets
├── next.config.ts              # Next.js configuration
├── tsconfig.json               # TypeScript config
├── eslint.config.mjs           # ESLint flat config
└── package.json
```

---

## Authentication Flow

1. User clicks "Sign in with GitHub"
2. `next-auth` redirects to GitHub OAuth consent screen
3. GitHub redirects back with code to `/api/auth/callback/github`
4. `next-auth` exchanges code for access token, stores in encrypted JWT
5. Session includes: `user.name`, `user.githubUsername`, `user.image`, `accessToken`

**Teacher detection**: `lib/env.ts` exports `isTeacher(username)` which checks against the `TEACHER_USERNAMES` environment variable (comma-separated list).

---

## Data Flow Patterns

### Student Progress

```
Student pushes code → GitHub Actions (classroom.yml) runs AutoGrader
  → Webhook POST /api/webhooks/github (workflow_run completed)
  → Parses test output, stores grade in SQLite via db.ts
  → GET /api/progress reads from DB, falls back to GitHub API polling
  → Dashboard renders per-module scores and overall progress
```

### AI Module Generation (Teacher)

```
Teacher triggers "Generate AI Module" workflow from /dashboard/workflows
  → POST /api/github/trigger-workflow dispatches workflow_dispatch
  → GitHub Actions generates module content (README, sketch, tests)
  → Creates a Pull Request on a feature branch
  → Teacher reviews at /admin/drafts/[prNumber]
  → Can edit files inline, run checklist, then approve & merge
```

### Learning Contract

```
Student fills form at /dashboard/contract
  → POST /api/github/create-issue creates GitHub Issue with labels
  → Teacher sees it in /admin panel, clicks Approve
  → POST /api/admin/contracts/[issueNumber]/approve updates labels
  → DB records contract status
```

---

## Key Patterns

### API Route Authentication

All authenticated API routes use a shared helper:

```typescript
// src/lib/api-auth.ts
const ctx = await getAuthenticatedContext();
if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

// ctx provides: { session, octokit, owner, repo }
```

### Admin Guard

Teacher-only pages are wrapped in `<AdminGuard>` which:
1. Checks session existence
2. Calls `/api/progress` to verify `isTeacher` status
3. Renders access denied or loading states

### Effect Pattern (React 19 compatible)

The codebase uses a cancellation pattern for data fetching in effects:

```typescript
useEffect(() => {
  if (!session) return;
  let cancelled = false;
  fetch("/api/data")
    .then((r) => r.json())
    .then((data) => { if (!cancelled) setState(data); })
    .finally(() => { if (!cancelled) setDone(true); });
  return () => { cancelled = true; };
}, [session]);
```

This avoids the `react-hooks/set-state-in-effect` lint rule by never calling setState synchronously in the effect body.

### Module Metadata

`src/lib/constants.ts` defines `MODULE_META` — a map of module slugs to their titles and max scores. This is the source of truth for the progress system.

---

## Database (SQLite)

The webapp uses `better-sqlite3` for persistent state that supplements the GitHub API:

- **students** — username, name, avatar, enrolled date
- **grades** — module scores, pass/fail, workflow run references
- **contracts** — learning contract status per student
- **student_repos** — assignment distribution tracking

Located at `data/classes.db`. Created automatically on first access.

---

## Running Locally

```bash
cd Classes/webapp
cp .env.local.example .env.local   # Fill in credentials
npm install
npm run dev                         # http://localhost:3000
```

Required environment variables:
- `GITHUB_ID` / `GITHUB_SECRET` — GitHub OAuth App credentials
- `AUTH_SECRET` — NextAuth encryption secret
- `NEXT_PUBLIC_GITHUB_ORG` — GitHub org (tenant identifier)
- `TEACHER_USERNAMES` — Comma-separated GitHub usernames with admin access

---

## Linting & Type Checking

```bash
npm run lint          # ESLint (eslint-config-next + typescript rules)
npx tsc --noEmit     # TypeScript strict checking
npm run build         # Full production build (includes both)
```

The project enforces:
- `strict: true` TypeScript
- `@typescript-eslint/no-explicit-any` (no `any` types)
- `react-hooks/set-state-in-effect` (no synchronous setState in effects)
- `@next/next/no-img-element` (use `next/image` for optimization)

---

## Deployment

The webapp is designed for Vercel or any Node.js hosting:

1. Set environment variables in hosting provider
2. Ensure `better-sqlite3` is listed in `serverExternalPackages` (already configured)
3. Configure `images.remotePatterns` for GitHub avatar domains (already configured)
4. Deploy — static pages are pre-rendered, dynamic routes run on-demand

---

## Extending the Framework

### Adding a New API Route

1. Create `src/app/api/<path>/route.ts`
2. Use `getAuthenticatedContext()` for auth
3. Check `isTeacher()` if teacher-only
4. Return `NextResponse.json()`

### Adding a New Page

1. Create `src/app/<path>/page.tsx` with `"use client"` directive
2. Use `useSession()` for client-side auth state
3. Wrap in `<AdminGuard>` if teacher-only
4. Fetch data from API routes in effects using the cancellation pattern

### Adding a New Module to the Curriculum

1. Add entry to `MODULE_META` in `src/lib/constants.ts`
2. Push module content to the repo under `curriculum-master/`
3. The AutoGrader workflow and progress API automatically pick it up
