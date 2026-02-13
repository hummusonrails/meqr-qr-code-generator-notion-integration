import { Client } from "@notionhq/client";
import { requireSession } from "../lib/session.js";
import { createQr } from "../lib/meqr.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!requireSession(req)) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { pageId } = req.body || {};
  if (!pageId) {
    return res.status(400).json({ error: "pageId required" });
  }

  try {
    const notion = new Client({ auth: process.env.NOTION_TOKEN });
    const page = await notion.pages.retrieve({ page_id: pageId });

    const finalUrlProp = page.properties["Final URL"];
    let finalUrl = null;
    if (finalUrlProp?.type === "formula") {
      const f = finalUrlProp.formula;
      if (f.type === "string") finalUrl = f.string;
    }

    if (!finalUrl) {
      return res.status(422).json({ error: "No Final URL found on this page" });
    }

    const linkNameProp = page.properties["Link Name"];
    const linkName = linkNameProp?.title?.map((t) => t.plain_text).join("") || "";

    const data = await createQr(finalUrl, process.env.MEQR_API_KEY, {
      title: linkName || undefined,
      format: "json",
    });

    const qrUrl = data.qrUrl;
    if (!qrUrl) {
      return res
        .status(502)
        .json({ error: "No qrUrl in ME-QR response", data });
    }

    await notion.pages.update({
      page_id: pageId,
      properties: {
        "QR Code URL": { url: qrUrl },
      },
    });

    return res.status(200).json({ success: true, qrUrl });
  } catch (err) {
    console.error("generate-qr error:", err);
    return res.status(500).json({ error: err.message });
  }
}
