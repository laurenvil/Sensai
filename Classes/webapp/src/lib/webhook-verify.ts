import { createHmac, timingSafeEqual } from "crypto";
import { env } from "@/lib/env";

/**
 * Verifies a GitHub webhook signature using HMAC SHA-256.
 * Uses timing-safe comparison to prevent timing attacks.
 */
export function verifyWebhookSignature(
  payload: string,
  signature: string | null
): boolean {
  if (!env.githubWebhookSecret || !signature) return false;

  const expected = `sha256=${createHmac("sha256", env.githubWebhookSecret)
    .update(payload)
    .digest("hex")}`;

  if (expected.length !== signature.length) return false;

  return timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}
