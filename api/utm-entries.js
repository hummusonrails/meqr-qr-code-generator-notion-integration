import { Client } from "@notionhq/client";
import { requireSession } from "../lib/session.js";

const UTM_DB_ID = process.env.UTM_DB_ID;

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!requireSession(req)) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const notion = new Client({ auth: process.env.NOTION_TOKEN });
    const response = await notion.databases.query({
      database_id: UTM_DB_ID,
      page_size: 100,
    });

    const entries = response.results.map((page) => {
      const p = page.properties;
      return {
        id: page.id,
        linkName: extract(p["Link Name"]),
        source: extract(p["Source"]),
        medium: extract(p["Medium"]),
        finalUrl: extract(p["Final URL"]),
        qrCodeUrl: extract(p["QR Code URL"]),
      };
    });

    return res.status(200).json(entries);
  } catch (err) {
    console.error("utm-entries error:", err);
    return res.status(500).json({ error: err.message });
  }
}

function extract(prop) {
  if (!prop) return "";
  switch (prop.type) {
    case "title":
      return prop.title?.map((t) => t.plain_text).join("") || "";
    case "rich_text":
      return prop.rich_text?.map((t) => t.plain_text).join("") || "";
    case "url":
      return prop.url || "";
    case "select":
      return prop.select?.name || "";
    case "formula": {
      const f = prop.formula;
      if (f.type === "string") return f.string || "";
      if (f.type === "number") return String(f.number);
      return "";
    }
    default:
      return "";
  }
}
