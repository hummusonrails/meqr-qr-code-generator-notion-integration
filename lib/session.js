import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

const SESSION_MAX_AGE = 24 * 60 * 60 * 1000; // 24 hours

export function createSession(secret) {
  const payload = Buffer.from(
    JSON.stringify({
      iat: Date.now(),
      jti: randomBytes(16).toString("hex"),
    })
  ).toString("base64url");

  const sig = createHmac("sha256", secret).update(payload).digest("base64url");
  return `${payload}.${sig}`;
}

export function validateSession(token, secret) {
  if (!token || !secret || !token.includes(".")) return false;

  const [payload, sig] = token.split(".");
  if (!payload || !sig) return false;

  const expectedSig = createHmac("sha256", secret)
    .update(payload)
    .digest("base64url");

  if (sig.length !== expectedSig.length) return false;
  if (!timingSafeEqual(Buffer.from(sig), Buffer.from(expectedSig))) return false;

  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString());
    if (Date.now() - data.iat > SESSION_MAX_AGE) return false;
    return true;
  } catch {
    return false;
  }
}

export function setSessionCookie(token) {
  return `session=${token}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=86400`;
}

export function clearSessionCookie() {
  return `session=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0`;
}

export function parseSessionCookie(cookieHeader) {
  if (!cookieHeader) return null;
  const match = cookieHeader.match(/session=([^;]+)/);
  return match ? match[1] : null;
}

export function requireSession(req) {
  const token = parseSessionCookie(req.headers.cookie);
  return validateSession(token, process.env.WEBHOOK_SECRET);
}
