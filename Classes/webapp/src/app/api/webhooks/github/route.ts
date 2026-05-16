import { NextRequest, NextResponse } from "next/server";
import { verifyWebhookSignature } from "@/lib/webhook-verify";
import { db } from "@/lib/db";

/**
 * Detects module slug from a workflow run name or branch name.
 * e.g. "AutoGrader - module-01-basics" → "module-01-basics"
 * e.g. branch "module-02-branching/feature" → "module-02-branching"
 */
function detectModuleSlug(name: string, branch: string): string | null {
  const nameMatch = name.match(/module-\d+-[\w-]+/i);
  if (nameMatch) return nameMatch[0].toLowerCase();

  const branchMatch = branch.match(/module-\d+-[\w-]+/i);
  if (branchMatch) return branchMatch[0].toLowerCase();

  return null;
}

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get("x-hub-signature-256");
  const eventType = request.headers.get("x-github-event") || "unknown";
  const deliveryId = request.headers.get("x-github-delivery") || undefined;

  // Verify signature
  if (!verifyWebhookSignature(body, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const payload = JSON.parse(body);

  // Store raw event for audit
  db.insertWebhookEvent({ eventType, deliveryId, payload: body });

  // Handle workflow_run completed events (grading results)
  if (eventType === "workflow_run" && payload.action === "completed") {
    const run = payload.workflow_run;
    const actor = run.actor?.login;
    const branch = run.head_branch || "";
    const runName = run.name || "";
    const conclusion = run.conclusion; // success, failure, etc.

    if (actor) {
      const moduleSlug = detectModuleSlug(runName, branch);

      if (moduleSlug) {
        // Ensure student exists
        db.upsertStudent({
          username: actor,
          avatarUrl: run.actor?.avatar_url,
        });

        // Determine score — success = 100, failure = 0 (refined scoring via artifact parsing can be added later)
        const passed = conclusion === "success";
        const score = passed ? 100 : 0;

        db.insertGradingResult({
          username: actor,
          moduleSlug,
          score,
          passed,
          workflowRunId: run.id,
          workflowUrl: run.html_url,
        });
      }
    }

    return NextResponse.json({ processed: "workflow_run", actor, conclusion });
  }

  // Handle issues events (contract status tracking)
  if (eventType === "issues" && payload.action === "labeled") {
    const issue = payload.issue;
    const label = payload.label?.name;
    const username = issue.user?.login;

    if (username && label) {
      if (label === "contract-approved" || label === "contract-pending") {
        const status = label === "contract-approved" ? "approved" : "pending";

        // Parse learning path from body
        let learningPath: string | null = null;
        const body = issue.body || "";
        if (body.includes("[x] **Path A")) learningPath = "A";
        else if (body.includes("[x] **Path B")) learningPath = "B";
        else if (body.includes("[x] **Path C")) learningPath = "C";

        db.upsertStudent({ username, avatarUrl: issue.user?.avatar_url });
        db.upsertContract({
          username,
          issueNumber: issue.number,
          moduleSlug: "module-01-basics",
          learningPath,
          status,
        });
      }
    }

    return NextResponse.json({ processed: "issues", label });
  }

  return NextResponse.json({ processed: false, event: eventType });
}
