import { requireSession } from "../lib/session.js";
import { createQr } from "../lib/meqr.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!requireSession(req)) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { url, title } = req.body || {};
  if (!url) {
    return res.status(400).json({ error: "url is required" });
  }

  try {
    const data = await createQr(url, process.env.MEQR_API_KEY, {
      title,
      format: "json",
    });

    const qrUrl = data.qrUrl;
    if (!qrUrl) {
      return res
        .status(502)
        .json({ error: "No qrUrl in ME-QR response", data });
    }

    return res.status(200).json({ success: true, qrUrl });
  } catch (err) {
    console.error("generate-qr-url error:", err);
    return res.status(502).json({ error: err.message });
  }
}
