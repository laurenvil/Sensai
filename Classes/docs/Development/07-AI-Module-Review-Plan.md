# Goal Description

The goal is to allow teachers to natively review, edit, and approve AI-generated curriculum modules directly from the webapp's Admin dashboard. Currently, modules are generated via GitHub Actions and submitted as Pull Requests labeled `ai-generated`. This feature will pull those PRs into the webapp, present a specialized review interface mirroring the "Teacher Review Checklist", allow in-browser file editing, and ultimately merge the PR into the `main` branch.

## Proposed Changes

We will build out new backend GitHub utilities to interact with PRs and branch references, and then build a new frontend UI under `/admin/drafts`.

---

### Backend API & GitHub Utilities

#### [MODIFY] `github.ts`
Add the following helper functions to interface with GitHub:
*   `listDraftModules`: Fetch open Pull Requests labeled `ai-generated`.
*   `getDraftModuleDetails`: Fetch a specific PR's details, files, and contents.
*   `updateDraftFile`: Update a specific file's content directly on the PR's branch.
*   `mergeDraftModule`: Merge the PR into `main`.

#### API Routes
*   `GET /api/admin/drafts`: List pending drafts.
*   `GET /api/admin/drafts/[prNumber]`: Fetch draft details and files.
*   `POST /api/admin/drafts/[prNumber]`: Merge the Pull Request.
*   `PUT /api/admin/drafts/[prNumber]/files`: Update file content on the branch.

---

### Frontend Admin UI

#### Admin Dashboard Update
Add a "Review AI Modules" button to the main Admin dashboard header.

#### Drafts List Page (`/admin/drafts`)
A list view displaying all currently open `ai-generated` Pull Requests.

#### Review Interface (`/admin/drafts/[prNumber]`)
*   **Teacher Review Checklist**: Localized, interactive checklist (Learning objectives, Starter code, Tests, Resources, Difficulty).
*   **File Editor**: Two-pane layout with file list and a monospaced code editor (`textarea`).
*   **Approve & Merge**: Enabled once the checklist is completed.

## Verification Plan

### Automated Tests
*   `npm run build` — Ensure TypeScript compiles correctly.

### Manual Verification
*   Open the pending "AI Module 06: Python Functions" PR.
*   Edit `README.md` and save the changes.
*   Check off the Teacher Review Checklist and click "Approve & Merge".
