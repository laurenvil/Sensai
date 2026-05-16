import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { env } from "@/lib/env";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.accessToken) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { messages, moduleContext } = await request.json();
  if (!messages || !Array.isArray(messages)) {
    return Response.json({ error: "Missing messages" }, { status: 400 });
  }

  const systemPrompt = buildSystemPrompt(moduleContext, session.user?.githubUsername);

  const allMessages = [
    { role: "system", content: systemPrompt },
    ...messages.map((m: { role: string; content: string }) => ({
      role: m.role,
      content: m.content,
    })),
  ];

  // Stream response from GitHub Models via OpenAI-compatible API
  const response = await fetch(`${env.modelsEndpoint}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${session.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: env.modelsModel,
      messages: allMessages,
      stream: true,
      max_tokens: 2048,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    return Response.json(
      { error: `AI inference failed: ${errorText}` },
      { status: response.status }
    );
  }

  // Forward SSE stream to the client
  return new Response(response.body, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}

function buildSystemPrompt(moduleContext?: string, username?: string): string {
  let prompt = `You are the gitClasses AI Assistant — a helpful, encouraging tutor for students and a curriculum helper for teachers in a GitHub-based learning platform.

You help with:
- Explaining Git and GitHub concepts (branches, PRs, merges, CI/CD)
- Debugging test failures from the AutoGrader (pytest)
- Explaining Python code in the starter code and tests
- Helping write Learning Contracts and set learning goals
- Suggesting resources and next steps
- For teachers: brainstorming module ideas, refining AI prompts, reviewing curriculum

Be concise, specific, and encouraging. Use code examples when helpful.
Reference actual gitClasses concepts (Learning Contracts, 2-for-1 peer review rule, three learning paths A/B/C).
If the student seems stuck, guide them toward the answer rather than giving it directly.`;

  if (moduleContext) {
    prompt += `\n\nThe user is currently working on: ${moduleContext}. Tailor your answers to this module's content.`;
  }

  if (username) {
    prompt += `\n\nThe user's GitHub username is: ${username}.`;
  }

  return prompt;
}
