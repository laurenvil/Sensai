# gitClasses Production SaaS — Implementation Summary

> **Branch:** `gitClass`
> **Status:** All 4 infrastructure gaps closed; production build verified.

This document describes the full production SaaS platform built on top of the free-tier webapp (branch: `main`). All changes live in the `gitClass` branch. The free tier is preserved unchanged on `main`.

---

## Two-Tier Deployment Model

| Tier | Branch | Auth | Database | Webhooks | Repo Creation |
|------|--------|------|----------|----------|---------------|
| **Free / Classroom** | `main` | GitHub OAuth | None (stateless) | None (polling) | GitHub Classroom |
| **Production SaaS** | `gitClass` | GitHub App + OAuth | SQLite (WAL) | `workflow_run` + `issues` | Template API + Collaborator API |

---

## What Was Built (Gap Closure)

### Gap 1 — GitHub App Authentication (`lib/github-app.ts`)

Replaces per-user OAuth tokens with a single installation token for all platform operations.

- `createAppOctokit()` — returns an Octokit instance using `@octokit/auth-app` with the App's private key and installation ID
- `getInstallationToken()` — returns a cached raw token (50-minute cache, 60-minute GitHub expiry)
- `api-auth.ts` updated with dual-auth: prefers App installation token, falls back to user OAuth token for non-App deployments
- New `getAppContext()` export for webhook handlers and background jobs that don't have a user session

**Rate limit upgrade:** 5,000 req/hr (per-user OAuth) → 15,000 req/hr (per-installation GitHub App)

Required env vars:
```
GITHUB_APP_ID=
GITHUB_APP_PRIVATE_KEY=     # base64-encoded PEM
GITHUB_APP_INSTALLATION_ID=
```

---

### Gap 2 — Webhook Receiver (`app/api/webhooks/github/route.ts`)

Replaces page-load polling with push-based, real-time grade delivery.

- `lib/webhook-verify.ts` — HMAC SHA-256 signature verification using `timingSafeEqual` (prevents timing attacks)
- `/api/webhooks/github` handles two GitHub event types:
  - **`workflow_run` (completed)** — parses grading results from run name + branch, stores score and pass/fail in `grading_results` table
  - **`issues` (labeled)** — tracks contract status changes (`contract-pending` → `contract-approved`)
- Raw event payloads stored in `webhook_events` table for audit
- `detectModuleSlug()` heuristic matches module identity from workflow run name or branch name

Required env var:
```
GITHUB_WEBHOOK_SECRET=      # must match secret set in GitHub App settings
```

**GitHub App webhook URL to configure:** `https://your-domain.com/api/webhooks/github`

---

### Gap 3 — Persistent Database (`lib/db.ts`)

Replaces GitHub API as source of truth for grades, contracts, and student roster.

- SQLite via `better-sqlite3` with WAL mode and foreign key enforcement
- Auto-migration on first boot — no manual schema setup
- DB file location: `data/gitclasses.db` (configurable via `DATABASE_PATH` env var)
- `data/` added to `.gitignore`

**Tables:**

| Table | Purpose |
|-------|---------|
| `students` | username, name, avatar_url |
| `assignments` | slug, title, description, template_repo |
| `student_repos` | assignment → student → repo mapping |
| `grading_results` | score, passed, workflow_run_id, created_at |
| `contracts` | learning_path, status, issue_number, created_at |
| `webhook_events` | raw event audit log |

**Key queries:**
- `getLatestGrades(username)` — self-join to get only the most recent grade per (student, module)
- `getClassroomStats()` — aggregate stats: total students, avg score, contract counts by status
- `listContracts(status)` — filter contracts by approval state

---

### Gap 4 — Automated Repository Creation (`lib/github.ts` + admin routes)

Enables the teacher to distribute assignments directly from the webapp without GitHub Classroom.

New functions in `lib/github.ts`:
- `createRepoFromTemplate(octokit, templateOwner, templateRepo, org, repoName)` — calls `POST /repos/{template}/generate`
- `addCollaborator(octokit, owner, repo, username, permission)` — calls `PUT /repos/{owner}/{repo}/collaborators/{username}`
- `distributeAssignment(octokit, templateOwner, templateRepo, org, username, assignmentSlug)` — creates a `{username}-{slug}` repo from template and adds student as collaborator in one call

New API routes:
- `GET /api/admin/assignments` — list all assignments from DB
- `POST /api/admin/assignments` — create assignment definition (`slug`, `title`, `description`, `templateRepo`)
- `POST /api/admin/assignments/[slug]/distribute` — distribute to `{ usernames: string[] }`, skips already-distributed, returns per-student success/failure

---

## Integration — Updated Routes

All three main data routes updated to use DB-first with GitHub API fallback:

| Route | Before | After |
|-------|--------|-------|
| `/api/progress` | Always polls GitHub API | Reads DB grades; falls back to GitHub API if empty |
| `/api/admin/overview` | Calls GitHub org API on every load | Syncs org members → DB; reads stats from DB |
| `/api/admin/students` | Per-student GitHub API calls | Builds progress from DB grades; syncs org members first |

---

## Configuration Changes

### `next.config.ts`
```typescript
serverExternalPackages: ["better-sqlite3"]
```

### `.env.local.example` (new variables)
```bash
GITHUB_APP_ID=
GITHUB_APP_PRIVATE_KEY=          # base64-encoded PEM key
GITHUB_APP_INSTALLATION_ID=
GITHUB_WEBHOOK_SECRET=
DATABASE_PATH=data/gitclasses.db
```

---

## Deployment Checklist (Production SaaS)

1. **Register a GitHub App** in your org's Developer Settings
   - Permissions: Contents (R/W), Issues (R/W), Members (R), Actions (R), Workflows (R)
   - Events: `workflow_run`, `issues`
   - Webhook URL: `https://your-domain.com/api/webhooks/github`
2. **Install the App** on your org and note the Installation ID
3. **Base64-encode** the App's `.pem` private key: `base64 -w0 < app.pem`
4. **Set all env vars** from `.env.local.example` in your hosting platform
5. **Ensure `data/` is writable** — SQLite writes to `data/gitclasses.db` at runtime
6. **Create assignments** via `POST /api/admin/assignments`
7. **Distribute assignments** via `POST /api/admin/assignments/[slug]/distribute`

---

## File Map

```
webapp/
├── src/
│   ├── lib/
│   │   ├── github-app.ts          # Gap 1: GitHub App installation token manager
│   │   ├── webhook-verify.ts      # Gap 2: HMAC signature verification
│   │   ├── db.ts                  # Gap 3: SQLite database layer
│   │   ├── api-auth.ts            # Updated: dual-auth (App > OAuth fallback)
│   │   ├── github.ts              # Updated: + distributeAssignment(), createRepoFromTemplate()
│   │   └── env.ts                 # Updated: + GitHub App env vars + hasGitHubApp getter
│   └── app/api/
│       ├── webhooks/github/       # Gap 2: webhook receiver
│       ├── admin/assignments/     # Gap 4: assignment CRUD
│       │   └── [slug]/distribute/ # Gap 4: distribute to students
│       ├── progress/              # Updated: DB-first with fallback
│       ├── admin/overview/        # Updated: DB-first with fallback
│       └── admin/students/        # Updated: DB-first with fallback
├── next.config.ts                 # Updated: serverExternalPackages for better-sqlite3
├── .env.local.example             # Updated: all new env vars documented
├── .gitignore                     # Updated: /data/ excluded
└── data/                          # Runtime only — gitignored
    └── gitclasses.db              # SQLite database (auto-created on first boot)
```
