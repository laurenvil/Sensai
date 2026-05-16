# Implementation Plan — Arduino Classes (Sensai) Deployment & Validation

This plan outlines the final steps necessary to guarantee that the Arduino Classes repository, autograding workflows, Next.js web application, and Sensai AI hardware integrations are fully functional and production-ready for student onboarding.

## Phase 1: Repository Configuration & Template Setup (GitHub Level)

1.  **Repository Template State Verification**
    *   **Action:** Ensure the base repository (e.g., `laurenvil/Sensai`) is designated as a "Template repository" in its GitHub settings.
    *   **Reasoning:** GitHub Classroom relies on this setting to instantiate new, isolated assignment repositories for each student based on this template.

2.  **GitHub Classroom Assignment Creation**
    *   **Action:** Create a test assignment within GitHub Classroom linking to this template.
    *   **Reasoning:** Validates the permission handshakes and ensures that the `.github/workflows/classroom.yml` file is correctly inherited by student forks.

3.  **GitHub Models AI Access Allocation**
    *   **Action:** Verify that the target GitHub Organization (`laurenvil` or the organization hosting the classroom) has explicitly opted into and accepted the **GitHub Models** Terms of Service.
    *   **Reasoning:** The Sensai-driven feedback workflows (e.g., `ai-peer-review.yml`, `classroom.yml` failure explainer) rely on the `openai/gpt-4o-mini` endpoints routed through GitHub Models. If access is disabled at the org level, PR reviews will fail with `403 Forbidden`.

## Phase 2: Web Application & Dashboard Deployment

1.  **Environment Variable Injection**
    *   **Action:** Deploy the `webapp/` directory (e.g., via Vercel or GitHub Pages, if using static export) with the appropriate environment bindings:
        *   `NEXT_PUBLIC_GITHUB_ORG` = The active organization (default: `laurenvil`)
        *   `NEXT_PUBLIC_GITHUB_REPO` = The active template repo (default: `Sensai`)
        *   `TEACHER_USERNAMES` = Comma-separated list of instructor GitHub handles (required for `/admin` access).
    *   **Reasoning:** The application relies heavily on real-time Octokit calls to read module statuses.

2.  **Authentication & Database Initialization**
    *   **Action:** Configure NextAuth with a valid GitHub OAuth App Client ID and Secret. Ensure the SQLite database (`data/arduino-classes.db`) has write access in the deployment environment.
    *   **Reasoning:** Required to establish session states and enforce the `AdminGuard` restrictions fixed during linting.

## Phase 3: Hardware & Autograding Test Drive (The "Dummy Student" Test)

1.  **Path A: The "Perfect Student" Simulation**
    *   **Action:** As a test student, accept the Module 01 assignment.
    *   **Steps to Execute:**
        1.  Create `learning-contract.md` with appropriate content.
        2.  Create a Markdown file in `curriculum-master/community-resources/`.
        3.  Ensure `hello_serial.ino` contains valid `void setup()` and `void loop()` functions.
        4.  Commit and push.
    *   **Validation:** The `classroom.yml` workflow should execute, run `pytest`, and return a 100/100 score on the GitHub Check. The "Bonus Quiz" AI comment should automatically post to the active PR.

2.  **Path B: The "Struggling Student" Simulation**
    *   **Action:** Intentionally break the Arduino sketch (e.g., remove `void setup()`).
    *   **Validation:** The pytest AutoGrader should fail (specifically `test_sketch_has_setup_and_loop`). The `classroom.yml` workflow must catch the failure and trigger the AI Explainer to post a supportive, Arduino-contextualized PR comment.

3.  **Sensai CLI Validation**
    *   **Action:** Use a physical Arduino Uno Q board. Pull down the test student repository and compile the sketch using the on-device `arduino-cli` / Sensai toolchain.
    *   **Reasoning:** Confirms that the generic structure validated by the GitHub Python autograder matches the actual physical compilation requirements of the Uno Q hardware (especially regarding 3.3V logic considerations).

## Phase 4: Peer Review & Feedback Workflows

1.  **Cross-Review Simulation**
    *   **Action:** Open two distinct PRs from two test students. Have Student A review Student B's PR.
    *   **Validation:** Trigger the `ai-peer-review.yml` workflow. Ensure the AI review guide correctly highlights Arduino-specific code patterns (e.g., "Are pin numbers declared as constants?").

## Rollout Readiness Checklist

- [x] TypeScript constraints met and passing (`npx tsc --noEmit` clean).
- [x] React hydration and Effect lifecycle logic (`setState` in effects) resolved.
- [x] Next.js production build (`npm run build`) passing with all static routes pre-rendered.
- [x] Python/Pytest AutoGrader configured to target `.ino` sketch structures instead of Python files.
- [ ] GitHub Organization has GitHub Models enabled.
- [ ] Vercel/Hosting platform connected to `webapp/`.
- [ ] OAuth App created and secrets bound to the webapp deployment.
