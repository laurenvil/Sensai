# gitClasses Webapp vs GitHub App Architecture — Comparative Analysis

> **Reference:** `docs/WebApp/GithubApp.md` — "Headless Classroom" blueprint using a GitHub App as the Keymaster.

---

## Executive Summary

The GithubApp.md blueprint proposes a three-layer production architecture: a webapp frontend/backend, a **GitHub App** as a privileged identity broker, and GitHub Actions as the grading engine. The `main` branch implements the same end-to-end vision using a **simpler OAuth delegation model** in place of a registered GitHub App. The `gitClass` branch closes all four gaps, implementing the full production SaaS architecture.

---

## Architecture Comparison Overview

| Dimension | GithubApp.md Blueprint | `main` (Free Tier) | `gitClass` (Production SaaS) |
|-----------|----------------------|---------------------|-------------------------------|
| **Identity model** | GitHub App (installation token) | GitHub OAuth (user-delegated token) | GitHub App + OAuth dual-auth |
| **API authority** | App acts as platform identity | User's token used for all calls | App token preferred, OAuth fallback |
| **Repo creation** | Automated via `POST /repos/{template}/generate` | Manual (GitHub Classroom) | Automated via `distributeAssignment()` |
| **Grading engine** | `actions/ai-inference` in `grading.yml` | `actions/ai-inference` in `classroom.yml` | Same as main |
| **Feedback loop** | `workflow_run` webhooks → database | Live API polling via Octokit | Webhooks → SQLite database |
| **Data persistence** | External database (implied) | Stateless — GitHub is the database | SQLite (WAL mode) |
| **Rate limits** | 15,000 req/hr (App installation) | 5,000 req/hr (per-user OAuth token) | 15,000 req/hr (App installation) |
| **Multi-tenant scope** | Per-org installation | Single org via env var | Same as main |
| **AI integration** | `actions/ai-inference` + direct prompts | Both: GitHub Actions + `/api/ai/chat` streaming | Same as main |

---

## Summary Score Card

| Phase | Blueprint Feature | `main` (Free) | `gitClass` (SaaS) | Notes |
|-------|------------------|--------------|-------------------|-------|
| 1 | GitHub App registration | Partial (OAuth) | Implemented | `lib/github-app.ts` + dual-auth fallback |
| 1 | Webhook subscription | Not implemented | Implemented | `/api/webhooks/github` + HMAC verification |
| 2 | Automated repo creation | Not implemented | Implemented | `distributeAssignment()` + `/api/admin/assignments/[slug]/distribute` |
| 2 | Student collaborator add | Substituted | Implemented | Both org-invite and collaborator API available |
| 3 | `actions/ai-inference` grading | Implemented | Implemented | Extended with prompt files + bonus quiz |
| 3 | AI code review in workflow | Implemented | Implemented | Plus contract curriculum generation |
| 4 | `workflow_run` webhook | Not implemented | Implemented | Stores grades in SQLite via webhook events |
| 4 | Database grade storage | Not implemented | Implemented | `lib/db.ts` — SQLite WAL, full schema |
| — | Conversational AI chat | Extra | Extra | Not in blueprint |
| — | Teacher Admin Panel | Extra | Extra | Not in blueprint |
| — | AI Draft Module Review | Extra | Extra | Not in blueprint |
| — | Role-based access control | Extra | Extra | Not in blueprint |
| — | Docs site | Extra | Extra | Not in blueprint |

**Overall:** The `gitClass` branch fully implements the GithubApp.md blueprint. All four architectural gaps (GitHub App auth, webhooks, persistent database, automated repo creation) are closed. The free-tier `main` branch remains as a zero-infrastructure classroom deployment using GitHub Classroom.

See [`docs/WebApp/ProductionSaaS.md`](./ProductionSaaS.md) for the full implementation reference.
