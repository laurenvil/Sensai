import { NextRequest } from "next/server";
import { getAuthenticatedContext } from "@/lib/api-auth";
import { triggerWorkflow } from "@/lib/github";

export async function POST(request: NextRequest) {
  const ctx = await getAuthenticatedContext();
  if (!ctx) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { workflowFile, ref = "main", inputs } = body;

  if (!workflowFile) {
    return Response.json(
      { error: "Missing workflowFile parameter" },
      { status: 400 }
    );
  }

  try {
    await triggerWorkflow(ctx.octokit, ctx.owner, ctx.repo, workflowFile, ref, inputs);
    return Response.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return Response.json({ error: message }, { status: 500 });
  }
}
