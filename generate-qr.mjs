#!/usr/bin/env node

import { program } from "commander";
import { config } from "dotenv";
import { writeFile, mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { readFile } from "node:fs/promises";
import { Client } from "@notionhq/client";

config();

const API_BASE = "https://me-qr.com";

function getApiKey() {
  const key = process.env.MEQR_API_KEY;
  if (!key) {
    console.error("Error: MEQR_API_KEY not set. Add it to .env file.");
    process.exit(1);
  }
  return key;
}

async function apiRequest(endpoint, body) {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-AUTH-TOKEN": getApiKey(),
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API error ${res.status}: ${text}`);
  }

  const contentType = res.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    return { type: "json", data: await res.json() };
  }
  return { type: "binary", data: Buffer.from(await res.arrayBuffer()) };
}

function addCommonOptions(cmd) {
  return cmd
    .option("-t, --title <title>", "QR code title in ME-QR dashboard")
    .option(
      "-f, --format <format>",
      "output format: png, svg, jpg, jpeg, json",
      "png"
    )
    .option("-o, --output <file>", "output file path")
    .option("--size <px>", "QR image size in pixels", (v) => parseInt(v, 10), 2000)
    .option("--pattern <style>", "dot pattern style")
    .option("--pattern-color <hex>", "dot color, e.g. #000000")
    .option("--bg-color <hex>", "background color, e.g. #ffffff")
    .option("--logo <name-or-url>", "center logo (preset name, URL, or base64)");
}

function buildRequestBody(qrFieldsData, opts) {
  const body = { qrFieldsData, format: opts.format };
  if (opts.title) body.title = opts.title;

  const qrOptions = {};
  if (opts.size) qrOptions.size = opts.size;
  if (opts.pattern) qrOptions.pattern = opts.pattern;
  if (opts.patternColor) qrOptions.patternColor = opts.patternColor;
  if (opts.bgColor) {
    qrOptions.patternBackground = opts.bgColor;
  }
  if (opts.logo) qrOptions.logotype = opts.logo;

  if (Object.keys(qrOptions).length > 0) {
    body.designType = "base";
    body.qrOptions = qrOptions;
  }

  return body;
}

async function handleResponse(result, opts, defaultName) {
  if (result.type === "json") {
    console.log(JSON.stringify(result.data, null, 2));
    if (opts.output) {
      await writeFile(
        resolve(opts.output),
        JSON.stringify(result.data, null, 2)
      );
      console.log(`Saved to ${opts.output}`);
    }
  } else {
    const ext = opts.format || "png";
    const outPath = opts.output || `${defaultName}.${ext}`;
    await writeFile(resolve(outPath), result.data);
    console.log(`Saved QR code to ${outPath}`);
  }
}

program
  .name("generate-qr")
  .description("Generate QR codes via the ME-QR API")
  .version("1.0.0");

// link command
addCommonOptions(
  program
    .command("link")
    .description("Create a QR code for a URL")
    .argument("<url>", "the URL to encode")
).action(async (url, opts) => {
  const body = buildRequestBody({ link: url }, opts);
  const result = await apiRequest("/api/v2/qr/link/create", body);
  await handleResponse(result, opts, "qr-link");
});

// text command
addCommonOptions(
  program
    .command("text")
    .description("Create a QR code for plain text")
    .argument("<text>", "the text to encode")
).action(async (text, opts) => {
  const body = buildRequestBody({ text }, opts);
  const result = await apiRequest("/api/v2/qr/text/create", body);
  await handleResponse(result, opts, "qr-text");
});

// email command
addCommonOptions(
  program
    .command("email")
    .description("Create a QR code that opens an email compose window")
    .requiredOption("--to <address>", "recipient email address")
    .requiredOption("--subject <subject>", "email subject")
    .requiredOption("--body <body>", "email body text (max 500 chars)")
).action(async (opts) => {
  const body = buildRequestBody(
    { emailTo: opts.to, subject: opts.subject, body: opts.body },
    opts
  );
  const result = await apiRequest("/api/v2/qr/email/create", body);
  await handleResponse(result, opts, "qr-email");
});

// phone command
addCommonOptions(
  program
    .command("phone")
    .description("Create a QR code for a phone number")
    .argument("<number>", "phone number to dial")
).action(async (number, opts) => {
  const body = buildRequestBody({ phoneTo: number }, opts);
  const result = await apiRequest("/api/v2/qr/phone/create", body);
  await handleResponse(result, opts, "qr-phone");
});

// whatsapp command
addCommonOptions(
  program
    .command("whatsapp")
    .description("Create a QR code that opens a WhatsApp chat")
    .requiredOption("--phone <number>", "WhatsApp phone number")
    .requiredOption("--message <text>", "pre-filled message")
).action(async (opts) => {
  const body = buildRequestBody(
    { phone: opts.phone, message: opts.message },
    opts
  );
  const result = await apiRequest("/api/v2/qr/whatsapp/create", body);
  await handleResponse(result, opts, "qr-whatsapp");
});

// wifi command
addCommonOptions(
  program
    .command("wifi")
    .description("Create a QR code for WiFi network credentials")
    .requiredOption("--ssid <name>", "WiFi network name")
    .requiredOption(
      "--encryption <type>",
      "encryption: wpa/wpa2, wpa3, wep, none, raw"
    )
    .option("--password <pass>", "WiFi password")
).action(async (opts) => {
  const fields = { ssid: opts.ssid, encryption: opts.encryption };
  if (opts.password) fields.password = opts.password;
  const body = buildRequestBody(fields, opts);
  const result = await apiRequest("/api/v2/qr/wifi/create", body);
  await handleResponse(result, opts, "qr-wifi");
});

// vcard command
addCommonOptions(
  program
    .command("vcard")
    .description("Create a QR code for a contact card")
    .requiredOption("--name <first>", "first name")
    .option("--last-name <last>", "last name")
    .option("--org <company>", "organization")
    .option("--position <title>", "job title")
    .option("--vcard-phone <number>", "phone number")
    .option("--vcard-email <address>", "email address")
    .option("--website <url>", "website URL")
    .option("--address <addr>", "physical address")
).action(async (opts) => {
  const fields = { name: opts.name };
  if (opts.lastName) fields.lastName = opts.lastName;
  if (opts.org) fields.organization = opts.org;
  if (opts.position) fields.position = opts.position;
  if (opts.address) fields.address = opts.address;
  if (opts.vcardPhone) fields.phones = [{ phone: opts.vcardPhone }];
  if (opts.vcardEmail) fields.emails = [{ email: opts.vcardEmail }];
  if (opts.website) fields.websites = [{ website: opts.website }];
  const body = buildRequestBody(fields, opts);
  const result = await apiRequest("/api/v2/qr/vcard/create", body);
  await handleResponse(result, opts, "qr-vcard");
});

// map command
addCommonOptions(
  program
    .command("map")
    .description("Create a QR code for a map location")
    .option("--link <url>", "Google Maps link")
    .option("--lat <latitude>", "latitude coordinate")
    .option("--lng <longitude>", "longitude coordinate")
).action(async (opts) => {
  const fields = {};
  if (opts.link) fields.link = opts.link;
  if (opts.lat) fields.latitude = opts.lat;
  if (opts.lng) fields.longitude = opts.lng;
  if (!opts.link && !opts.lat) {
    console.error("Provide either --link or --lat/--lng");
    process.exit(1);
  }
  const body = buildRequestBody(fields, opts);
  const result = await apiRequest("/api/v2/qr/map/create", body);
  await handleResponse(result, opts, "qr-map");
});

// pdf command
addCommonOptions(
  program
    .command("pdf")
    .description("Create a QR code for a PDF file")
    .argument("<file-or-url>", "local file path or URL to the PDF")
    .option("--file-name <name>", "display name for the file")
).action(async (fileOrUrl, opts) => {
  let file = fileOrUrl;
  let fileName = opts.fileName || "document";
  if (!fileOrUrl.startsWith("http")) {
    const buf = await readFile(resolve(fileOrUrl));
    file = buf.toString("base64");
    if (!opts.fileName) fileName = fileOrUrl.split("/").pop().replace(/\.[^.]+$/, "");
  }
  const body = buildRequestBody({ file, fileName }, opts);
  const result = await apiRequest("/api/v2/qr/pdf/create", body);
  await handleResponse(result, opts, "qr-pdf");
});

// file command
addCommonOptions(
  program
    .command("file")
    .description("Create a QR code for a generic file")
    .argument("<file-or-url>", "local file path or URL to the file")
    .option("--file-name <name>", "display name for the file")
).action(async (fileOrUrl, opts) => {
  let file = fileOrUrl;
  let fileName = opts.fileName || "file";
  if (!fileOrUrl.startsWith("http")) {
    const buf = await readFile(resolve(fileOrUrl));
    file = buf.toString("base64");
    if (!opts.fileName) fileName = fileOrUrl.split("/").pop().replace(/\.[^.]+$/, "");
  }
  const body = buildRequestBody({ file, fileName }, opts);
  const result = await apiRequest("/api/v2/qr/file/create", body);
  await handleResponse(result, opts, "qr-file");
});

// store command
addCommonOptions(
  program
    .command("store")
    .description("Create a QR code for app store links")
    .option("--ios <url>", "iOS App Store link")
    .option("--android <url>", "Google Play Store link")
    .option("--other <url>", "fallback link for other platforms")
).action(async (opts) => {
  const fields = {};
  if (opts.ios) fields.iosLink = opts.ios;
  if (opts.android) fields.androidLink = opts.android;
  if (opts.other) fields.additionalLink = opts.other;
  if (!opts.ios && !opts.android && !opts.other) {
    console.error("Provide at least one store link (--ios, --android, or --other)");
    process.exit(1);
  }
  const body = buildRequestBody(fields, opts);
  const result = await apiRequest("/api/v2/qr/store/create", body);
  await handleResponse(result, opts, "qr-store");
});

// list existing qr codes
program
  .command("list")
  .description("List your existing QR codes")
  .option("--page <n>", "page number", parseInt, 1)
  .option("--limit <n>", "items per page", parseInt, 10)
  .action(async (opts) => {
    const params = new URLSearchParams({
      page: opts.page,
      limit: opts.limit,
    });
    const res = await fetch(`${API_BASE}/api/qr/list/?${params}`, {
      headers: { "X-AUTH-TOKEN": getApiKey() },
    });
    if (!res.ok) {
      console.error(`API error ${res.status}: ${await res.text()}`);
      process.exit(1);
    }
    console.log(JSON.stringify(await res.json(), null, 2));
  });

// notion utm builder integration

function getUtmDbId() {
  const dbId = process.env.UTM_DB_ID;
  if (!dbId) {
    console.error("Error: UTM_DB_ID not set. Add it to .env file.");
    process.exit(1);
  }
  return dbId;
}

function getNotionClient() {
  const token = process.env.NOTION_TOKEN;
  if (!token) {
    console.error(
      "Error: NOTION_TOKEN not set. Add it to .env file.\n" +
        "Create an internal integration at https://www.notion.so/my-integrations\n" +
        "then share the UTM Builder database with it."
    );
    process.exit(1);
  }
  return new Client({ auth: token });
}

function extractFormulaValue(prop) {
  if (!prop || prop.type !== "formula") return null;
  const f = prop.formula;
  if (f.type === "string") return f.string;
  if (f.type === "number") return String(f.number);
  if (f.type === "boolean") return String(f.boolean);
  if (f.type === "date") return f.date?.start || null;
  return null;
}

function extractProperty(prop) {
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
    case "formula":
      return extractFormulaValue(prop) || "";
    default:
      return "";
  }
}

async function queryUtmEntries(notion, filter) {
  const query = { database_id: getUtmDbId(), page_size: 100 };

  if (filter) {
    query.filter = {
      or: [
        { property: "Link Name", title: { contains: filter } },
        { property: "Source", select: { equals: filter } },
        { property: "Medium", select: { equals: filter } },
      ],
    };
  }

  const res = await notion.databases.query(query);
  return res.results.map((page) => {
    const p = page.properties;
    return {
      id: page.id,
      linkName: extractProperty(p["Link Name"]),
      baseUrl: extractProperty(p["Base URL"]),
      source: extractProperty(p["Source"]),
      medium: extractProperty(p["Medium"]),
      content: extractProperty(p["Content"]),
      eventName: extractProperty(p["Event Name"]),
      finalUrl: extractProperty(p["Final URL"]),
    };
  });
}

function slugify(str) {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

// notion-list
program
  .command("utm-list")
  .description("List UTM links from the Notion UTM Builder database")
  .option("--filter <text>", "filter by link name, source, or medium")
  .action(async (opts) => {
    const notion = getNotionClient();
    const entries = await queryUtmEntries(notion, opts.filter);

    if (entries.length === 0) {
      console.log("No UTM entries found.");
      return;
    }

    console.log(`Found ${entries.length} UTM entries:\n`);
    for (const e of entries) {
      const url = e.finalUrl || "(no Final URL)";
      console.log(`  [${e.source}/${e.medium}] ${e.linkName}`);
      console.log(`    ${url}\n`);
    }
  });

// notion-qr
addCommonOptions(
  program
    .command("utm-qr")
    .description(
      "Generate QR codes for UTM links from the Notion UTM Builder database"
    )
    .option("--filter <text>", "filter by link name, source, or medium")
    .option("--all", "generate QR codes for all matching entries")
    .option("--index <n>", "generate QR for the Nth entry (1-based)", parseInt)
    .option("--outdir <dir>", "output directory for batch QR codes", "./qr-codes")
).action(async (opts) => {
  const notion = getNotionClient();
  const entries = await queryUtmEntries(notion, opts.filter);

  if (entries.length === 0) {
    console.log("No UTM entries found.");
    return;
  }

  // if neither --all nor --index, show the list and ask which one
  if (!opts.all && !opts.index) {
    console.log(`Found ${entries.length} UTM entries:\n`);
    entries.forEach((e, i) => {
      const url = e.finalUrl || "(no Final URL)";
      console.log(`  ${i + 1}. [${e.source}/${e.medium}] ${e.linkName}`);
      console.log(`     ${url}\n`);
    });
    console.log("Re-run with --index <n> to generate a QR for one entry,");
    console.log("or --all to generate QR codes for all entries.");
    return;
  }

  const targets = opts.all
    ? entries
    : [entries[(opts.index || 1) - 1]];

  if (!targets[0]) {
    console.error(`Index ${opts.index} out of range (1-${entries.length})`);
    process.exit(1);
  }

  // Filter out entries without a Final URL
  const valid = targets.filter((e) => e.finalUrl);
  if (valid.length === 0) {
    console.error("No entries have a computed Final URL.");
    process.exit(1);
  }

  if (opts.all) {
    await mkdir(resolve(opts.outdir), { recursive: true });
  }

  for (const entry of valid) {
    const body = buildRequestBody({ link: entry.finalUrl }, opts);
    if (!opts.title) body.title = entry.linkName;

    const result = await apiRequest("/api/v2/qr/link/create", body);

    const ext = opts.format || "png";
    let outPath;
    if (opts.output && !opts.all) {
      outPath = opts.output;
    } else if (opts.all) {
      outPath = `${opts.outdir}/${slugify(entry.linkName)}.${ext}`;
    } else {
      outPath = `qr-utm-${slugify(entry.linkName)}.${ext}`;
    }

    if (result.type === "json") {
      await writeFile(resolve(outPath.replace(/\.\w+$/, ".json")), JSON.stringify(result.data, null, 2));
      console.log(`[json] ${entry.linkName} -> ${outPath.replace(/\.\w+$/, ".json")}`);
    } else {
      await writeFile(resolve(outPath), result.data);
      console.log(`${entry.linkName} -> ${outPath}`);
    }
  }

  console.log(`\nGenerated ${valid.length} QR code(s).`);
});

program.parse();
