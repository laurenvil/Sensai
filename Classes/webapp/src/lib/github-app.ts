import { Octokit } from "@octokit/rest";
import { createAppAuth } from "@octokit/auth-app";
import { env } from "@/lib/env";

let cachedInstallationToken: { token: string; expiresAt: number } | null = null;

/**
 * Returns an Octokit instance authenticated as the GitHub App installation.
 * Returns null if GitHub App credentials are not configured.
 */
export async function createAppOctokit(): Promise<Octokit | null> {
  if (!env.hasGitHubApp) return null;

  const octokit = new Octokit({
    authStrategy: createAppAuth,
    auth: {
      appId: env.githubAppId,
      privateKey: env.githubAppPrivateKey,
      installationId: Number(env.githubAppInstallationId),
    },
  });

  return octokit;
}

/**
 * Returns a cached raw installation token (refreshes 10 min before expiry).
 * Returns null if GitHub App credentials are not configured.
 */
export async function getInstallationToken(): Promise<string | null> {
  if (!env.hasGitHubApp) return null;

  const now = Date.now();
  // Refresh if we're within 10 minutes of expiry (tokens last 60 min)
  if (cachedInstallationToken && cachedInstallationToken.expiresAt - now > 10 * 60 * 1000) {
    return cachedInstallationToken.token;
  }

  const auth = createAppAuth({
    appId: env.githubAppId,
    privateKey: env.githubAppPrivateKey,
    installationId: Number(env.githubAppInstallationId),
  });

  const { token } = await auth({ type: "installation" });

  // Cache for 50 minutes (GitHub tokens expire at 60 min)
  cachedInstallationToken = {
    token,
    expiresAt: now + 50 * 60 * 1000,
  };

  return token;
}
