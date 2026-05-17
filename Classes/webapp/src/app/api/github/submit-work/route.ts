import { NextRequest } from "next/server";
import { getAuthenticatedContext } from "@/lib/api-auth";

export async function POST(request: NextRequest) {
  const ctx = await getAuthenticatedContext();
  if (!ctx) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { slug, filename, content } = body;

  if (!slug || !filename || !content) {
    return Response.json({ error: "Missing parameters" }, { status: 400 });
  }

  try {
    const timestamp = Date.now();
    const username = ctx.session?.user?.name || "student";
    const cleanUsername = username.replace(/\s+/g, '-').toLowerCase();
    const branchName = `submission/${cleanUsername}/${slug}-${timestamp}`;
    
    // Get the sha of the Curriculum branch
    const { data: refData } = await ctx.userOctokit.git.getRef({
      owner: ctx.owner,
      repo: ctx.repo,
      ref: "heads/Curriculum",
    });

    // Create the new branch
    await ctx.userOctokit.git.createRef({
      owner: ctx.owner,
      repo: ctx.repo,
      ref: `refs/heads/${branchName}`,
      sha: refData.object.sha,
    });

    const path = `Classes/curriculum-master/modules/${slug}/starter-code/${filename}`;

    // Get the file SHA to update it
    let fileSha: string | undefined;
    try {
      const { data: fileData } = await ctx.userOctokit.repos.getContent({
        owner: ctx.owner,
        repo: ctx.repo,
        path,
        ref: branchName,
      });
      if (!Array.isArray(fileData) && fileData.type === "file") {
        fileSha = fileData.sha;
      }
    } catch {
      // File might not exist yet if they added a new file
    }

    // Commit the file
    await ctx.userOctokit.repos.createOrUpdateFileContents({
      owner: ctx.owner,
      repo: ctx.repo,
      path,
      message: `Submit ${filename} for ${slug}`,
      content: Buffer.from(content).toString("base64"),
      sha: fileSha,
      branch: branchName,
    });

    // Create a Pull Request
    const { data: pr } = await ctx.userOctokit.pulls.create({
      owner: ctx.owner,
      repo: ctx.repo,
      title: `Submission: ${slug} by ${username}`,
      head: branchName,
      base: "Curriculum",
      body: `## Student Submission\n\nThis is a student submission for **${slug}**.\n\nCode was submitted directly from the Sensai Classes interactive editor.`,
    });

    return Response.json({ success: true, prUrl: pr.html_url });
  } catch (error: unknown) {
    console.error("Failed to submit work:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return Response.json({ error: message }, { status: 500 });
  }
}
