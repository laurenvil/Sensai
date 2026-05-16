import { NextRequest } from "next/server";
import { getAuthenticatedContext } from "@/lib/api-auth";
import { getModuleContent } from "@/lib/github";

export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get("slug");
  if (!slug) {
    return Response.json({ error: "Missing slug parameter" }, { status: 400 });
  }

  const ctx = await getAuthenticatedContext();
  if (!ctx) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const content = await getModuleContent(ctx.octokit, ctx.owner, ctx.repo, slug);
  if (!content) {
    return Response.json({ error: "Module not found" }, { status: 404 });
  }

  return Response.json(content);
}
