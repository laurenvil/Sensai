import { NextRequest } from "next/server";
import { getAuthenticatedContext } from "@/lib/api-auth";
import { createIssue } from "@/lib/github";

export async function POST(request: NextRequest) {
  const ctx = await getAuthenticatedContext();
  if (!ctx) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { title, content, labels = [] } = body;

  if (!title || !content) {
    return Response.json(
      { error: "Missing title or content" },
      { status: 400 }
    );
  }

  try {
    const issueNumber = await createIssue(
      ctx.octokit,
      ctx.owner,
      ctx.repo,
      title,
      content,
      labels
    );
    return Response.json({ issueNumber });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return Response.json({ error: message }, { status: 500 });
  }
}
