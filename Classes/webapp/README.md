# gitClasses WebApp

A Next.js 16 multi-tenant webapp that serves as both a Udemy-style course platform and the gitClasses docs site. Teachers and students interact with GitHub workflows, AI, and course content through a browser UI.

---

## Quick Start

```bash
cd webapp
cp .env.local.example .env.local   # fill in GitHub OAuth credentials
npm install
npm run dev                         # http://localhost:3000
npm run build                       # production build
```

---

## Environment Variables

Copy `webapp/.env.local.example` and populate:

| Variable | Description |
|----------|-------------|
| `GITHUB_ID` | GitHub OAuth App client ID |
| `GITHUB_SECRET` | GitHub OAuth App client secret |
| `AUTH_SECRET` | NextAuth secret (`openssl rand -base64 32`) |
| `NEXT_PUBLIC_GITHUB_ORG` | Your GitHub org slug (= tenant) |
| `NEXT_PUBLIC_GITHUB_REPO` | Repo name (default: `gitClasses`) |
| `GITHUB_MODELS_ENDPOINT` | GitHub Models endpoint (default provided) |
| `GITHUB_MODELS_MODEL` | AI model (default: `openai/gpt-4o-mini`) |

Create the GitHub OAuth App at `https://github.com/settings/applications/new` with callback URL: `http://localhost:3000/api/auth/callback/github`.

---

## Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16.2 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| Auth | next-auth v4 with GitHub OAuth |
| GitHub API | @octokit/rest |
| AI | GitHub Models (OpenAI-compatible SSE) |
| Markdown | react-markdown + remark-gfm |
| Icons | lucide-react |

---

## Routes

### Pages

| Route | Description | Auth Required |
|-------|-------------|:---:|
| `/` | Landing page — hero, features, learning paths | No |
| `/courses` | Udemy-style module catalog | No |
| `/courses/[slug]` | Module detail: Guide, Starter Code, Tests, Resources tabs | Yes |
| `/dashboard` | User dashboard — stats, quick actions, workflow run history | Yes |
| `/dashboard/contract` | Learning Contract form → creates GitHub Issue | Yes |
| `/dashboard/workflows` | Trigger GitHub Actions workflows from the UI | Yes |
| `/ai` | AI Assistant chat with streaming, quick prompts, module context | Yes |
| `/docs` | Documentation hub | No |
| `/docs/[slug]` | Individual doc pages (8 pages) | No |

### API Routes

| Route | Method | Description |
|-------|--------|-------------|
| `/api/auth/[...nextauth]` | GET/POST | GitHub OAuth (next-auth v4) |
| `/api/github/module-content` | GET | Fetches module content from GitHub repo via Octokit |
| `/api/github/workflow-runs` | GET | Lists recent workflow runs |
| `/api/github/trigger-workflow` | POST | Dispatches a `workflow_dispatch` event |
| `/api/github/create-issue` | POST | Creates a GitHub Issue (Learning Contracts) |
| `/api/ai/chat` | POST | Streams AI chat via GitHub Models SSE |

---

## Architecture

### Multi-Tenancy
Tenant = GitHub org, set via `NEXT_PUBLIC_GITHUB_ORG`. GitHub org admins map to the **teacher** role; org members are **students**. All GitHub API calls are scoped to that org's repo.

### GitHub Integration Flow
```
User action in webapp
  → API route at /api/github/*
  → Octokit (authenticated with user's GitHub token from OAuth session)
  → GitHub API (read repo content / create issues / dispatch workflows)
  → GitHub Actions picks up dispatch event
  → Runs .github/workflows/*.yml (which may call actions/ai-inference)
```

### AI Chat Flow
```
User message in /ai page
  → POST /api/ai/chat (server-side)
  → Forward to GitHub Models endpoint with user's access token
  → Stream SSE chunks back to browser
  → Rendered as markdown in chat UI
```

### Key Library Files

| File | Purpose |
|------|---------|
| `src/lib/auth.ts` | NextAuth config — GitHub provider, JWT/session callbacks |
| `src/lib/github.ts` | All Octokit operations (module content, workflows, issues) |
| `src/lib/api-auth.ts` | `getAuthenticatedContext()` helper for API routes |
| `src/lib/env.ts` | Typed environment variable access |
| `src/lib/constants.ts` | Workflow filenames, grading weights, learning path definitions |
| `src/types/index.ts` | Shared TypeScript types (User, Course, Module, WorkflowRun, etc.) |

---

## GitHub Actions Integration

The webapp connects to the same workflows in `.github/workflows/`. The Workflow Triggers page (`/dashboard/workflows`) exposes these:

| UI Name | Workflow File | Role | Inputs |
|---------|--------------|------|--------|
| Generate AI Module | `generate-module.yml` | Teacher | topic, difficulty |
| Generate Course Website | `generate-pages.yml` | Teacher | — |
| Deploy Pages | `deploy-pages.yml` | Teacher | — |
| Run AutoGrader | `classroom.yml` | Any | — |

Triggering a workflow calls `actions.createWorkflowDispatch` via Octokit, which fires `workflow_dispatch` on the repo — the same event `actions/ai-inference` workflows listen for.

---

## AI Assistant Features

The `/ai` page provides an interactive chat with the gitClasses AI tutor:

- **Students** — ask about Git concepts, debug pytest failures, get help writing Learning Contracts, get peer review advice
- **Teachers** — brainstorm module topics, refine AI prompts, review curriculum ideas

Context-aware: visiting `/ai?module=module-01-basics` sets the system prompt to focus on that module.

The AI uses the same GitHub Models infrastructure as the GitHub Actions workflows — no separate API key needed beyond the user's GitHub OAuth token.

---

## Docs Site Pages

Built into the webapp at `/docs`:

| Slug | Content |
|------|---------|
| `overview` | What gitClasses is and how it works |
| `teacher-setup` | 30-minute deployment guide |
| `student-guide` | Accept assignment, choose path, completion checklist |
| `learning-paths` | Path A/B/C explained |
| `autograding` | Scoring breakdown, running tests locally |
| `peer-review` | 2-for-1 rule, Code of Review |
| `ai-features` | All AI-powered features explained |
| `community` | Community Guidelines (mirrors `docs/COMMUNITY_GUIDELINES.md`) |
