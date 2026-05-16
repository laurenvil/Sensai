import { getAuthenticatedContext } from "@/lib/api-auth";
import { listWorkflowRuns } from "@/lib/github";

export async function GET() {
  const ctx = await getAuthenticatedContext();
  if (!ctx) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const runs = await listWorkflowRuns(ctx.octokit, ctx.owner, ctx.repo);
  return Response.json({ runs });
}
