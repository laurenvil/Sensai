# Teacher Admin Panel & Student Progress Tracking — Tasks

## Types & Constants
- [x] Add `StudentProgress`, `ModuleProgress`, `ClassroomOverview` to `types/index.ts`
- [x] Add `MODULE_META` to `lib/constants.ts`

## GitHub Data Layer
- [x] Add `listOrgMembers`, `getStudentWorkflowRuns`, `listContractIssues`, `approveContract` to `lib/github.ts`

## API Routes
- [x] Create `api/admin/students/route.ts`
- [x] Create `api/admin/students/[username]/route.ts`
- [x] Create `api/admin/overview/route.ts`
- [x] Create `api/admin/contracts/[issueNumber]/approve/route.ts`
- [x] Create `api/progress/route.ts`

## Shared Components
- [x] Create `components/progress-bar.tsx`
- [x] Create `components/stat-card.tsx`
- [x] Create `components/admin-guard.tsx`
- [x] Create `hooks/use-admin-status.ts`

## Admin UI
- [x] Create `app/admin/layout.tsx`
- [x] Create `app/admin/page.tsx` (admin dashboard)
- [x] Create `app/admin/students/[username]/page.tsx` (student detail)

## Student Progress UI
- [x] Update `app/dashboard/page.tsx` with real progress data

## Navigation & Styling
- [x] Update `components/navbar.tsx` with admin link
- [x] Update `globals.css` with progress bar & admin styles

## Verification
- [x] Run `npm run build` to verify TypeScript compiles
