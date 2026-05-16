import { auth } from "@/lib/auth";
import { createOctokit } from "@/lib/github";
import { createAppOctokit } from "@/lib/github-app";
import { env } from "@/lib/env";

/**
 * Returns an authenticated context for API route handlers.
 * Prefers GitHub App installation token; falls back to user OAuth token.
 * Returns null if the user is not authenticated.
 */
export async function getAuthenticatedContext() {
  const session = await auth();
  if (!session?.accessToken) {
    return null;
  }

  const appOctokit = await createAppOctokit();
  const octokit = appOctokit || createOctokit(session.accessToken);

  return {
    session,
    octokit,
    // Always expose the user's own token for operations that must act as the user
    userOctokit: createOctokit(session.accessToken),
    owner: env.githubOrg,
    repo: env.githubRepo,
  };
}

/**
 * Returns an app-only context for webhook handlers and background jobs.
 * Returns null if GitHub App credentials are not configured.
 */
export async function getAppContext() {
  const appOctokit = await createAppOctokit();
  if (!appOctokit) return null;

  return {
    octokit: appOctokit,
    owner: env.githubOrg,
    repo: env.githubRepo,
  };
}
