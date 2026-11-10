
import { createHmac, timingSafeEqual } from "node:crypto";

function getSecret(): string {
  const secret = process.env.GMAIL_OAUTH_STATE_SECRET;

  if (!secret) {
    throw new Error("GMAIL_OAUTH_STATE_SECRET is not configured");
  }

  return secret;
}

export function signOAuthState(
  state: string,
  userId: string,
  issuedAt: string
): string {
  return createHmac("sha256", getSecret())
    .update(JSON.stringify([state, userId, issuedAt]))
    .digest("hex");
}

export function verifyOAuthState(
  state: string,
  userId: string,
  issuedAt: string,
  signature: string
): boolean {
  const timestamp = Number(issuedAt);

  if (
    !Number.isSafeInteger(timestamp) ||
    timestamp > Date.now() ||
    Date.now() - timestamp > 10 * 60 * 1000
  ) {
    return false;
  }

  if (!/^[a-f0-9]{64}$/i.test(signature)) {
    return false;
  }

  const expected = signOAuthState(state, userId, issuedAt);

  return timingSafeEqual(
    Buffer.from(expected, "hex"),
    Buffer.from(signature, "hex")
  );
}
