import { createHash, timingSafeEqual } from "node:crypto";
import {
  createSession,
  setSessionCookie,
  clearSessionCookie,
} from "../lib/session.js";

export default async function handler(req, res) {
  if (req.method === "DELETE") {
    res.setHeader("Set-Cookie", clearSessionCookie());
    return res.status(200).json({ success: true });
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { secret } = req.body || {};
  if (!secret) {
    return res.status(400).json({ error: "Secret required" });
  }

  const expected = process.env.WEBHOOK_SECRET;
  if (!expected) {
    return res.status(500).json({ error: "Server not configured" });
  }

  // Timing-safe comparison via SHA-256 to normalize length
  const a = createHash("sha256").update(String(secret)).digest();
  const b = createHash("sha256").update(expected).digest();

  if (!timingSafeEqual(a, b)) {
    return res.status(401).json({ error: "Invalid secret" });
  }

  const token = createSession(expected);
  res.setHeader("Set-Cookie", setSessionCookie(token));
  return res.status(200).json({ success: true });
}
