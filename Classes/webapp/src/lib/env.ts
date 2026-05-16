export const env = {
  githubOrg: process.env.NEXT_PUBLIC_GITHUB_ORG || "",
  githubRepo: process.env.NEXT_PUBLIC_GITHUB_REPO || "gitClasses",
  modelsEndpoint:
    process.env.GITHUB_MODELS_ENDPOINT ||
    "https://models.github.ai/inference",
  modelsModel: process.env.GITHUB_MODELS_MODEL || "openai/gpt-4o-mini",
  /** Comma-separated GitHub usernames that have teacher/admin access */
  teacherUsernames: (process.env.TEACHER_USERNAMES || "")
    .split(",")
    .map((u) => u.trim().toLowerCase())
    .filter(Boolean),
  // GitHub App credentials (production SaaS tier)
  githubAppId: process.env.GITHUB_APP_ID || "",
  githubAppPrivateKey: process.env.GITHUB_APP_PRIVATE_KEY
    ? Buffer.from(process.env.GITHUB_APP_PRIVATE_KEY, "base64").toString(
        "utf-8"
      )
    : "",
  githubAppInstallationId: process.env.GITHUB_APP_INSTALLATION_ID || "",
  githubWebhookSecret: process.env.GITHUB_WEBHOOK_SECRET || "",
  get hasGitHubApp(): boolean {
    return !!(
      this.githubAppId &&
      this.githubAppPrivateKey &&
      this.githubAppInstallationId
    );
  },
};

/** Check if a GitHub username has teacher privileges */
export function isTeacher(username: string): boolean {
  return env.teacherUsernames.includes(username.toLowerCase());
}
