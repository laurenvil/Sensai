import { MarkdownRenderer } from "@/components/markdown-renderer";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

const DOCS: Record<string, { title: string; content: string }> = {
  overview: {
    title: "Overview",
    content: `# gitClasses — Open Classroom Framework

**gitClasses** is a GitHub template repository that transforms any GitHub organization into a Udemy-styled learning platform.

## How It Works

1. **Teachers** click "Use this template" to create a course repo
2. **GitHub Classroom** distributes the repo to students as individual assignments
3. **Students** learn by writing real code, pushing to GitHub, and opening Pull Requests
4. **AutoGrading** via GitHub Actions runs pytest and scores code automatically
5. **AI** explains failures, generates quizzes, and creates personalized curricula
6. **Peer Review** is enforced — every student reviews 2 peers before their work is complete

## Key Principles

- **Pull-Based Learning** — Students choose their path (Guided, Explorer, or Expert)
- **Real-World Workflow** — Everything happens through Git, PRs, and CI/CD
- **Community-Driven** — Students contribute resources and improve the curriculum

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Version Control | Git + GitHub |
| CI/CD | GitHub Actions |
| AutoGrading | pytest + classroom-resources actions |
| AI | GitHub Models via \`actions/ai-inference\` |
| Auth | GitHub OAuth |
| Hosting | GitHub Pages |
`,
  },
  "teacher-setup": {
    title: "Teacher Setup",
    content: `# Teacher Setup Guide

Deploy a gitClasses course in 30 minutes.

## Prerequisites

- A GitHub organization (free tier works)
- GitHub Classroom linked to your org

## Step-by-Step

### 1. Create Your Course Repo

Click **"Use this template"** on the gitClasses repository to create a new repo in your org.

### 2. Link to GitHub Classroom

1. Go to [classroom.github.com](https://classroom.github.com)
2. Create a new classroom for your org
3. Create an assignment using your new repo as the template

### 3. Configure AI (Optional)

AI features use GitHub Models — no API keys needed. They work automatically with \`GITHUB_TOKEN\`.

To customize AI behavior, edit the \`.github/prompts/*.prompt.yml\` files.

### 4. Share the Invitation Link

Give students the GitHub Classroom invitation URL. They'll get their own private copy of the repo instantly.

### 5. Monitor Progress

- Watch PRs come in for real-time progress
- AutoGrader scores appear as GitHub Checks
- Use the webapp dashboard to trigger workflows and view student progress
`,
  },
  "student-guide": {
    title: "Student Guide",
    content: `# Student Guide

## Getting Started

1. Click the **Invitation Link** your teacher shared
2. Accept the assignment — your private repo is created instantly
3. Clone your repo locally: \`git clone <your-repo-url>\`
4. Open \`curriculum-master/modules/module-01-basics/README.md\`

## Choose Your Path

| Path | Who It's For | How to Start |
|------|-------------|-------------|
| **A — Guided** | New learners | Follow the README step by step |
| **B — Explorer** | Self-directed | Open a Learning Contract issue |
| **C — Expert** | Advanced | Submit a PR to improve the curriculum |

## Your Checklist

- [ ] Open a Learning Contract issue
- [ ] Create \`learning-contract.md\` in your repo root
- [ ] Complete the starter code and pass the AutoGrader
- [ ] Review 2 peers' Pull Requests
- [ ] Add a resource to \`community-resources/\`
- [ ] Open your PR and wait for peer + teacher review
`,
  },
  "learning-paths": {
    title: "Learning Paths",
    content: `# Learning Paths

gitClasses offers three paths — choose based on your experience level.

## Path A — Guided

Follow the step-by-step instructions in each module's README. The starter code has TODO comments showing exactly what to implement.

**Best for:** First-time Git users, students who prefer structured learning.

## Path B — Explorer

Open a **Learning Contract** issue describing your custom project idea. Your teacher approves it, then AI generates a personalized curriculum just for you.

**Best for:** Self-directed learners who want to build something original.

## Path C — Expert

Submit Pull Requests to the \`curriculum-master/\` directory to improve the course itself. Fix bugs, add tests, improve AI prompts, or create new resources.

**Best for:** Advanced students who learn by teaching others.

## Switching Paths

You can switch paths at any time by updating your Learning Contract issue. Just tag your teacher.
`,
  },
  autograding: {
    title: "AutoGrading",
    content: `# AutoGrading

Every \`git push\` triggers a GitHub Actions workflow that scores your code.

## How It Works

1. GitHub Actions runs \`pytest\` against your code
2. Each test has a point value (via \`@pytest.mark.parametrize("points", [N])\`)
3. The grading reporter posts a score as a GitHub Check
4. If tests fail, AI explains the failure in a PR comment
5. If all tests pass, AI generates bonus quiz questions

## Scoring — Module 01

| Component | Points | What It Checks |
|-----------|--------|----------------|
| Learning Contract | 25 | \`learning-contract.md\` exists with >50 chars |
| Module Mastery | 50 | \`hello()\` returns "Hello, Open Classroom!" |
| Community Contribution | 25 | A \`.md\` file in \`community-resources/\` |

## Scoring — Module 02

| Component | Points | What It Checks |
|-----------|--------|----------------|
| add() function | 40 | Correct addition with edge cases |
| subtract() function | 40 | Correct subtraction with edge cases |
| Branch naming | 20 | Pushed from \`feature/*\` or \`fix/*\` branch |

## Running Tests Locally

\`\`\`bash
pip install pytest
pytest curriculum-master/modules/module-01-basics/tests/test_basics.py -v
\`\`\`
`,
  },
  "peer-review": {
    title: "Peer Review",
    content: `# Peer Review

Peer review is a core requirement in gitClasses — it's not optional.

## The 2-for-1 Rule

For every PR you open, you must provide **meaningful feedback on 2 other students' PRs** before yours can be merged.

## What Counts as Meaningful

A comment that:
- References specific lines of code
- Explains a tradeoff or alternative approach
- Asks a genuine question about a design decision

**"Looks good!" alone does NOT count.**

## How to Give Great Feedback

| Do | Don't |
|---|-------|
| "This function could be simplified by..." | "You wrote this wrong." |
| "Consider using X because it handles edge case Y..." | "Just use X." |
| "I learned from your approach — have you considered..." | "Mine is better." |

## Workflow

1. Open your PR
2. Bot posts peer review instructions automatically
3. Find 2 classmates' PRs to review
4. Leave meaningful feedback
5. Paste review links in your PR description
6. Request a review from your teacher
`,
  },
  "ai-features": {
    title: "AI Features",
    content: `# AI Features

gitClasses uses [GitHub Models](https://docs.github.com/en/github-models) for all AI features — no external APIs, no cost, no API keys beyond \`GITHUB_TOKEN\`.

## AI-Powered Features

### AutoGrader Failure Explanation
When tests fail, AI reads your code and the test output, then posts a plain-English explanation as a PR comment with suggested fixes.

### Bonus Quiz Generation
When all tests pass, AI generates 3 multiple-choice questions from your actual code to deepen your understanding.

### Learning Contract Curriculum
When a teacher approves your Learning Contract (by commenting "Approved"), AI generates a personalized mini-curriculum with:
- Actionable steps
- Suggested project structure
- Milestones
- Real resource links

### Review Facilitator
On every new PR, AI posts tailored review guidance based on the actual code changes.

## Customizing AI Behavior

AI prompts are plain YAML files in \`.github/prompts/\`:
- \`explain-test-failure.prompt.yml\`
- \`generate-quiz.prompt.yml\`
- \`generate-contract-curriculum.prompt.yml\`

Teachers and Path C students can edit these to improve AI behavior.

## Webapp AI Assistant

The web app includes a chat interface where you can:
- Ask questions about Git concepts
- Debug test failures interactively
- Get help writing Learning Contracts
- Brainstorm module ideas (teachers)
`,
  },
  community: {
    title: "Community Guidelines",
    content: `# Community Guidelines

> *In this classroom, we are all teachers and we are all students.*

## The Code of Review

Peer review is about sharing perspectives, not finding bugs.

| Do | Don't |
|---|-------|
| "This function could be simplified by..." | "You wrote this wrong." |
| "Consider using X because it handles edge case Y..." | "Just use X." |
| "I learned from your approach — have you considered..." | "Mine is better." |

## Collaboration vs. Plagiarism

| Collaboration | Plagiarism |
|--------------|------------|
| Discussing logic and approach | Copying another student's implementation |
| Sharing a helpful resource | Submitting AI-generated code without understanding |
| Helping a peer debug | Copying code from the internet without attribution |
| Using code snippets with a source comment | Removing someone else's authorship |

**If you use a snippet from a peer or website:** Add a comment citing the source.

## Communication Norms

- Treat Learning Contracts as living documents
- Respond to review requests within **48 hours**
- If you disagree, offer an alternative with reasoning

## Escalation

If a peer's review feels unfair:
1. Reply calmly with your reasoning
2. If it persists, open a private issue tagged to your teacher
`,
  },
};

export default async function DocPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const doc = DOCS[slug];

  if (!doc) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Page Not Found
        </h1>
        <Link
          href="/docs"
          className="mt-4 inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-700"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to Docs
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      <Link
        href="/docs"
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-indigo-600 dark:text-gray-400"
      >
        <ChevronLeft className="h-4 w-4" />
        All Docs
      </Link>
      <div className="mt-6">
        <MarkdownRenderer content={doc.content} />
      </div>
    </div>
  );
}
