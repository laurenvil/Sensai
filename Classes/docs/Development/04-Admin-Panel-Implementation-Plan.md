# Teacher Admin Panel & Student Progress Tracking

Extend the gitClasses webapp with a **teacher admin panel** for classroom oversight and **student progress tracking** for both teachers and students.

## Architecture Overview

All data is sourced from the **GitHub API** — no additional database is needed. The system leverages:
- **GitHub Org roles** (`admin` → teacher, `member` → student) for role-based access
- **Workflow runs** → AutoGrading results per student
- **Issues** with `contract-pending`/`contract-approved` labels → learning contracts
- **Repository forks** → student enrollment

---

## Proposed Changes

### Types & Constants

#### [MODIFY] `index.ts`
Add new types:
```typescript
export interface StudentProgress {
  username: string;
  name: string;
  avatarUrl: string;
  modules: ModuleProgress[];
  contractStatus: LearningContract["status"] | "none";
  contractIssueNumber?: number;
  learningPath?: "A" | "B" | "C";
  lastActivity?: string;
}

export interface ModuleProgress {
  moduleSlug: string;
  latestRun?: WorkflowRun;
  score?: number;
  maxScore: number;
  attempts: number;
  passed: boolean;
}

export interface ClassroomOverview {
  totalStudents: number;
  contractsSubmitted: number;
  contractsApproved: number;
  averageScore: number;
  moduleCompletionRates: Record<string, number>; // slug → percentage
}
```

#### [MODIFY] `constants.ts`
Add module metadata for display:
```typescript
export const MODULE_META: Record<string, { title: string; maxScore: number }> = {
  "module-01-basics": { title: "Git Basics", maxScore: 100 },
  "module-02-branching": { title: "Branching & Merging", maxScore: 100 },
};
```

---

### GitHub Data Layer

#### [MODIFY] `github.ts`
Add new functions to fetch student-level data:
- `listOrgMembers(octokit, org)` → list all org members with role & avatar
- `getStudentWorkflowRuns(octokit, owner, repo, username)` → filter workflow runs by actor
- `listContractIssues(octokit, owner, repo)` → get all issues labeled `contract-*`
- `approveContract(octokit, owner, repo, issueNumber)` → add `contract-approved` label, remove `contract-pending`

---

### API Routes

#### [NEW] `src/app/api/admin/students/route.ts`
`GET` — Returns list of all org members with computed progress.

#### [NEW] `src/app/api/admin/students/[username]/route.ts`
`GET` — Returns detailed progress for a single student.

#### [NEW] `src/app/api/admin/overview/route.ts`
`GET` — Returns `ClassroomOverview` aggregate stats.

#### [NEW] `src/app/api/admin/contracts/[issueNumber]/approve/route.ts`
`POST` — Approve a learning contract.

#### [NEW] `src/app/api/progress/route.ts`
`GET` — Returns the authenticated user's own progress (student self-view).

---

### Admin UI Pages

#### [NEW] `src/app/admin/page.tsx` — **Admin Dashboard**
The main teacher command center:
- **Stats bar**: total students, contracts pending, average score, completion rate
- **Student roster table**: sortable by name, score, last activity, contract status

#### [NEW] `src/app/admin/students/[username]/page.tsx` — **Student Detail**
Deep-dive view for a single student.

#### [NEW] `src/app/admin/layout.tsx` — **Admin Layout**
Wraps admin pages with role checks and sidebar navigation.

---

### Verification Plan

#### Automated Tests
- `npm run build` — Ensure TypeScript compiles with no errors

#### Manual Verification
- Sign in as teacher → verify Admin nav appears → verify student roster loads
- Approve a contract from admin panel → verify label swap on GitHub issue
