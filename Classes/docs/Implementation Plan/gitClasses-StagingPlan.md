# GitClasses Production Staging Plan (Demo-Readiness)

Objective
- Create a pseudo-production staging environment to demonstrate gitClass SaaS capabilities to investors and early adopters. This plan provides a safe, isolated environment mirroring critical production components with synthetic data and controlled access.

Scope and Environment
- Branches: main (Free Classroom), gitClass (Production SaaS), staging (mirrors production for demos) if needed. For this plan we implement a dedicated staging environment that uses the same codebase (gitClass branch) but with separate resources.
- Domain & TLS: staging.yourdomain.example or a dedicated subdomain; TLS via Let's Encrypt or your cloud provider.
- Data store: separate staging SQLite database (or a dedicated PostgreSQL instance) with synthetic data.
- GitHub App: use a separate GitHub App installation for staging to avoid impacting production data; use distinct env vars for staging app id and keys.

Infrastructure & Deployment
- CI/CD: Implement a staging deployment workflow triggered by merges into a dedicated staging branch (e.g., gitClass-staging). Automatic deploy to a staging host when changes are pushed.
- Hosting: Deploy to the same cloud environment as production (e.g., Vercel/Render/AWS) with a staging namespace or project.
- Data seeding: Seed staging DB with a sample tenant, students, assignments, and contracts.
- Access control: Restrict staging access to invited testers and investors via login with GitHub OAuth federation or basic auth in staging.

Data & Seeding Strategy
- Seed dataset:
  - Tenants: 1–2 sample orgs
  - Students: 3–5 sample users
  - Assignments: 2 sample modules (module-01-basics, module-02-branching)
  - Contracts: 1–2 sample contracts with status pending/approved
- Reproducibility: Seed data must be reproducible across demo sessions; consider deterministic seeds.

Demo Playbook (Investor & Early Adopter Scenarios)
- Scenario A: Teacher creates an assignment and distributes to a student; student pushes a PR; grading runs via the AI grader; contract progresses through approval.
- Scenario B: Admin invites a new student; distribution occurs; see onboarding flow in the admin UI.
- Scenario C: Dashboard shows classroom stats (total students, average score, contract status).

Security & Access
- Secrets: Use staging secrets; never reuse production secrets.
- Access: Enforce strong access control for staging; rotate credentials after each major demo.
- Webhooks: Point staging webhook to staging endpoints; limit permissions.

Monitoring & Rollout
- Metrics: Track staging uptime, API latency, error rates, grading throughput, and demo conversion signals.
- Health checks: Implement readiness/liveness probes for staging services.
- Rollback: Maintain a quick rollback path to production-ready code if demo issues arise.

Acceptance Criteria
- Demoable end-to-end user journey (teacher creates, distributes, grading occurs, contract update).
- Clear, reproducible data seeds; tested end-to-end flow in staging.
- Observability dashboards populated with staging data; error budgets defined for staging.

Governance & Next Steps
- Schedule a 2-hour demo runway and a 30-minute Q&A with investors.
- Prepare slide pack highlighting staging readiness, metrics, and risk mitigations.
