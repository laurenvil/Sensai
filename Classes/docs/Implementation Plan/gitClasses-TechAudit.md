GitClasses Production SaaS — Tech Audit (gitClass)

Executive Summary
- gitClass is the production SaaS tier of The Open Frontier’s gitClasses platform. It replaces per-user tokens with a GitHub App installation token, uses a SQLite data store for rapid MVP deployment, and exposes a production-grade API surface for assignment distribution, grading, and contract management. This document captures current state, gaps, risks, and a roadmap to strengthen security, reliability, observability, and multi-tenant readiness for pre-seed and Series A discussions.

1) Architecture & Scope
- Two-tier deployment: Free Classroom (main branch) and Production SaaS (gitClass branch).
- Core tech: Next.js-based frontend with a GitHub App-based backend integration; SQLite for rapid MVP persistence; webhook-driven event flow for grading and contract updates.
- Key components:
  - GitHub App authentication and installation token management (production tier)
  - Webhook receiver for workflow_run and issues events with payload auditing
  - DB-first approach for progress, grading, and contracts
  - Admin/distribution APIs to generate repos from templates and add collaborators

2) Current Production State (gitClass branch)
- Branch gitClass contains: production-grade GitHub App auth, webhook handling, and a SQLite-based persistence layer.
- The webapp folder contains the admin UI, AI modules, and API endpoints to manage progress, contracts, and assignments.
- Production configuration requires the following env vars (at minimum): GITHUB_APP_ID, GITHUB_APP_PRIVATE_KEY (base64), GITHUB_APP_INSTALLATION_ID, GITHUB_WEBHOOK_SECRET, DATABASE_PATH.
- Documented deployment checklist includes GitHub App registration, app installation, secret handling, and data directory write permissions.

3) Gap Closure Summary
- Gap 1: GitHub App Authentication – Completed. App installation token management and context helpers are in place.
- Gap 2: Webhook Receiver – Completed. Handles workflow_run and issues events; stores payloads for audit.
- Gap 3: Persistent Database – Completed. SQLite with WAL, foreign keys, and migrations at startup.
- Gap 4: Automated Repository Distribution – Completed. Template-based repo creation and collaborator addition are implemented.

Gaps Remaining (high priority)
- Multi-tenancy: tenancy boundary and data isolation for multiple tenants (orgs) beyond a single install.
- Observability: structured logging, metrics, tracing; basic dashboards exist but require more depth for production-scale usage.
- Security & Compliance: secrets rotation, stricter GitHub App permissions, and privacy controls; data retention and audit policies.
- Reliability: staged CI/CD, canary deployments, disaster recovery planning, backup strategies for SQLite DB and eventual migration path to a more scalable DB.
- Performance: API latency budgets, rate-limiting on critical routes, and caching for read-heavy endpoints.

4) Security & Compliance
- GitHub App authentication and webhook verification (HMAC) are implemented.
- env-based secrets: GITHUB_APP_ID, GITHUB_APP_PRIVATE_KEY (base64), GITHUB_WEBHOOK_SECRET. Rotation and secure storage recommended.
- Data handling: Privacy policy and retention policy should be codified for student data and grades.

5) Observability, Reliability & Operations
- Observability: basic logging in code paths; no unified metrics/alerts in scope yet.
- Reliability: no documented SLOs or SLI targets; plan for staging environments, canary, and backups.
- Operations: requires documented DR/backup plan; monitor health endpoints and job queues.

6) Data Model & Tenancy
- Current tables cover students, assignments, student_repos, grading_results, contracts, webhook_events.
- Tenancy strategy is undefined; plan to introduce tenant_id or org-level scoping and per-tenant backups.

7) Roadmap Alignment & Recommendations
- Short-term (0–90 days): finalize tenancy boundary, add RBAC, implement PostgreSQL migration plan, and harden security posture. Establish observability dashboards and SRE-style runbooks.
- Medium-term: integrate with LMS (LTI), expand partner ecosystem, refine pricing and monetization for SaaS.
- Investor narrative: assemble a 6–12 month plan with traction metrics, ARR targets, and cost-to-acquire/ lifetime value projections.

8) Risks & Mitigations
- Risk: Single-tenant SQLite backing may not scale. Mitigation: design migration path to Postgres; run costed POCs.
- Risk: Data privacy and retention compliance. Mitigation: documented policies and consent flows; encrypt sensitive fields if required.
- Risk: Operational overhead of maintaining a GitHub App. Mitigation: robust monitoring, automated token refresh, and least-privilege permissions.

9) Recommendations for Immediate Action
- Create a formal tenancy model (per-tenant isolation or schema-based) and add a tenant_id column across key tables.
- Establish observability stack (OTEL/OpenTelemetry, Prometheus, Grafana, Sentry).
- Draft privacy and retention policies for the MVP audience.
- Prepare investor-ready tech appendix and a 6–8 week, high-confidence sprint backlog to push Phase 2 milestones.
