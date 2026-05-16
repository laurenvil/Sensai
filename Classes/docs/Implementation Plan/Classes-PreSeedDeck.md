# Arduino Classes — Pre-Seed Pitch Deck
### The Open Frontier, Inc.
#### "The Operating System for Technical Education"

---

## Slide 1 — Title

**Arduino Classes**
*Learn by Shipping — The GitHub-Native Education Platform*

The Open Frontier, Inc.
David Laurenvil, Founder & Board Chair

---

## Slide 2 — The Problem

Technical education is broken.

- **$50B+ global EdTech market** — yet 70%+ of online course students never finish.
- Video-based platforms (Udemy, Coursera) teach passive consumption, not real skills.
- Bootcamps charge $10k–$20k but still rely on manual grading and outdated LMS tools.
- **GitHub Classroom** exists but offers zero AI, no SaaS dashboard, no monetization layer, and no student analytics.
- Teachers spend **60%+ of their time** on grading and logistics instead of teaching.

> Students don't learn by watching. They learn by building, breaking, and shipping.

---

## Slide 3 — The Solution

**Arduino Classes turns every GitHub repo into a living classroom.**

- Teachers deploy a course in one click using a GitHub template.
- Students learn through real Pull Requests, not videos.
- AI works behind the scenes — generating modules, explaining test failures, facilitating peer review.
- AutoGrading runs on every `git push`. Scores appear instantly in the PR.
- The student's coursework IS their portfolio — visible, forkable, hireable.

**One platform. Zero context-switching. Real developer workflows from Day 1.**

---

## Slide 4 — How It Works

```
Teacher clicks "Use this template" → Course repo created
                ↓
Teacher runs "Generate AI Module" → Full module (README, code, tests) created in seconds
                ↓
Students accept GitHub Classroom invitation → Private workspace created
                ↓
Student pushes code → AutoGrader runs → AI explains failures → Score posted to PR
                ↓
Peer Review required → AI generates review guide from actual diffs
                ↓
Learning Contract approved → AI generates personalized curriculum
```

**All AI features use GitHub Models (free, no API keys, works with existing GITHUB_TOKEN).**

---

## Slide 5 — Product: Two Tiers

| | **Free Classroom** | **Arduino Class SaaS** |
|---|---|---|
| **Branch** | `main` | `Arduino Class` |
| **Auth** | GitHub OAuth | GitHub App (15k req/hr) |
| **Data** | Stateless | SQLite → PostgreSQL |
| **Grading** | GitHub Classroom polling | Webhook-driven, real-time |
| **Repo Distribution** | Manual (GitHub Classroom) | Automated (one-click) |
| **Admin Dashboard** | None | Full teacher command center |
| **AI Features** | Basic (AutoGrader explainer) | Full suite (module gen, quiz gen, review facilitator, contract curriculum) |
| **Price** | Free forever | $X/seat/month (TBD) |

**The free tier is the funnel. The SaaS tier is the business.**

---

## Slide 6 — Market Opportunity

**Total Addressable Market (TAM): $50B+ Global EdTech**

- Online education market: $350B by 2030 (Grand View Research)
- Developer education segment: ~$15B (bootcamps, online courses, certifications)
- GitHub has 100M+ developers — the largest developer platform on Earth

**Serviceable Addressable Market (SAM): $2B+**

- 4,000+ coding bootcamps worldwide
- 25,000+ CS departments at universities
- 500,000+ technical instructors on platforms like Udemy, Coursera, Pluralsight

**Serviceable Obtainable Market (SOM): $50M (Year 3)**

- Target: 500 institutions × 200 seats × $50/seat/year = $5M ARR in Year 2
- Expand to enterprise training, certification programs, and API licensing

---

## Slide 7 — Competitive Landscape

| Platform | Model | AI Native? | GitHub Native? | Student Portfolio? | Price |
|---|---|---|---|---|---|
| **Udemy** | Video courses | ❌ | ❌ | ❌ | $10–$200/course |
| **Coursera** | Video + quizzes | Partial | ❌ | ❌ | $40–$80/mo |
| **GitHub Classroom** | Repo templates | ❌ | ✅ | Partial | Free |
| **Replit** | Browser IDE | Partial | ❌ | ❌ | $7–$20/mo |
| **Codecademy** | Interactive exercises | Partial | ❌ | ❌ | $15–$40/mo |
| **Arduino Classes** | PR-based learning | ✅ Full | ✅ Native | ✅ Built-in | Free + SaaS |

**Our moat: We don't compete with GitHub — we are built ON GitHub. Every student's work is a real repo, a real commit history, a real portfolio.**

---

## Slide 8 — Business Model

**Revenue Streams:**

1. **SaaS Subscriptions (Primary)**
   - Per-seat pricing for institutions and bootcamps
   - Tiered: Starter (free) → Pro ($X/seat/mo) → Enterprise (custom)

2. **Course Marketplace (Phase 2)**
   - Teachers list and sell Arduino Classes; platform takes 15–20% revenue share
   - Similar to Udemy model but with real, portfolio-grade coursework

3. **Enterprise Licensing (Phase 3)**
   - White-label deployments for large organizations
   - LMS integration (LTI) for Canvas, Moodle, Blackboard
   - Custom AI model training on proprietary curricula

4. **API & Partner Ecosystem (Phase 3+)**
   - API access for third-party integrations
   - Certification and credentialing partnerships

---

## Slide 9 — Traction & Milestones

**Built (Today):**
- ✅ Full open-source template with 6+ AI workflows
- ✅ Production SaaS tier with GitHub App auth, webhook grading, SQLite DB
- ✅ Admin dashboard, student progress tracking, AI chat assistant
- ✅ AutoGrading, Peer Review facilitation, Learning Contract system
- ✅ 3 learning paths (Guided, Explorer, Expert)
- ✅ Technical audit completed; staging plan drafted

**Next 90 Days:**
- 🎯 5 beta courses with real students
- 🎯 RBAC and multi-tenant isolation
- 🎯 PostgreSQL migration for scale
- 🎯 LTI integration roadmap
- 🎯 First 100 paid student seats
- 🎯 Pre-seed close

---

## Slide 10 — Go-to-Market Strategy

**Phase 1: Community-Led Growth (Months 1–3)**
- Open-source template drives organic discovery on GitHub
- Target: CS professors, bootcamp instructors, and technical content creators
- Content marketing: "How to teach coding with GitHub" tutorials and case studies

**Phase 2: Institutional Sales (Months 4–9)**
- Direct outreach to coding bootcamps (Flatiron, General Assembly, App Academy)
- University CS department pilots (start with 3–5 partner institutions)
- Conference presence: GitHub Universe, SIGCSE, EdTech conferences

**Phase 3: Platform & Marketplace (Months 9–18)**
- Launch course marketplace
- Enterprise sales team (2–3 reps)
- Strategic partnerships with GitHub, cloud providers, and hiring platforms

**Viral Loop:** Every student who completes a Arduino Class has a public GitHub portfolio → they share it → others discover Arduino Classes → network effect.

---

## Slide 11 — Team

**David Laurenvil — Founder & Board Chair**
- Innovative STEM leader and entrepreneur
- Background in Bioinformatics and Computer Science
- Deep expertise in AI-driven product development

**Catalyst — AI CEO (Operational Engine)**
- Strategic planning, technical execution, and product management
- AI-native operations: from code audit to investor deck in hours, not weeks

**Hiring Plan (Post-Seed):**
- 1× Full-Stack Engineer (Next.js / GitHub APIs)
- 1× DevRel / Community Manager
- 1× Designer (UX/UI for teacher and student dashboards)

---

## Slide 12 — The Ask

**Pre-Seed Round: $500K**

| Use of Funds | Allocation | Purpose |
|---|---|---|
| Engineering | 40% ($200K) | Full-stack hire, PostgreSQL migration, LTI integration |
| Go-to-Market | 25% ($125K) | DevRel hire, content marketing, conference sponsorships |
| Infrastructure | 15% ($75K) | Hosting, CI/CD, observability stack, security audit |
| Operations | 10% ($50K) | Legal (ToS, privacy policy, IP), accounting |
| Reserve | 10% ($50K) | Runway buffer and opportunistic hires |

**Runway:** 12–15 months to Series A milestones

**Series A Triggers:**
- 1,000+ active students on paid tier
- $5K+ MRR
- 2+ institutional partnerships signed
- LTI integration live with at least 1 LMS

---

## Slide 13 — Vision

**Year 1:** The best way to teach coding with GitHub.
**Year 3:** The marketplace where anyone can create, sell, and take portfolio-grade technical courses.
**Year 5:** The credentialing layer for technical hiring — employers trust Arduino Classes portfolios because the work is real, verified, and AI-graded.

> "We're not building another video platform. We're building the infrastructure where learning IS doing — and the proof of learning IS the portfolio."

---

## Slide 14 — Contact

**The Open Frontier, Inc.**
GitHub: https://github.com/laurenvil/Sensai

David Laurenvil
Founder & Board Chair

---

## Appendix A — Technical Architecture

```
┌─────────────────────────────────────────────────────┐
│                    Arduino Classes SaaS                    │
│                                                       │
│  ┌──────────┐  ┌──────────┐  ┌──────────────────┐   │
│  │ Next.js  │  │ Admin    │  │ AI Module        │   │
│  │ Frontend │  │ Dashboard│  │ Generator        │   │
│  └────┬─────┘  └────┬─────┘  └────────┬─────────┘   │
│       │              │                  │             │
│  ┌────▼──────────────▼──────────────────▼─────────┐  │
│  │              API Layer (Next.js Routes)          │  │
│  │  /api/progress  /api/admin/*  /api/webhooks/*   │  │
│  └────┬────────────────┬────────────────┬──────────┘  │
│       │                │                │             │
│  ┌────▼────┐    ┌──────▼──────┐   ┌─────▼─────────┐  │
│  │ SQLite  │    │ GitHub App  │   │ Webhook       │  │
│  │ (WAL)   │    │ Auth        │   │ Receiver      │  │
│  └─────────┘    └──────┬──────┘   └───────────────┘  │
│                        │                              │
└────────────────────────┼──────────────────────────────┘
                         │
              ┌──────────▼──────────┐
              │   GitHub Platform    │
              │                      │
              │  • Org Repos         │
              │  • Actions (CI/CD)   │
              │  • Models (AI)       │
              │  • Issues / PRs      │
              └──────────────────────┘
```

## Appendix B — Key Metrics & KPIs

| Metric | Definition | Target (90 Days) |
|---|---|---|
| Active Students | Students with ≥1 push in last 7 days | 100+ |
| Course Completion Rate | Students who complete all modules | >40% |
| AutoGrader Success Rate | % of grading runs that complete without error | >95% |
| Time to First Grade | Minutes from student push to grade posted | <5 min |
| Teacher Onboarding Time | Minutes from signup to first course deployed | <30 min |
| MRR | Monthly Recurring Revenue | $1K+ |
| CAC | Cost to Acquire a Customer (institution) | <$500 |
| NPS | Net Promoter Score (teacher survey) | >50 |
