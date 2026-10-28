const MEQR_BASE = "https://me-qr.com";

export function buildMeqrBody(link, opts = {}) {
  return {
    qrFieldsData: { link },
    title: opts.title || "Qr Code",
    format: opts.format || "json",
    designType: "base",
    qrFolderOptions: {
      folderName: "Arbitrum DevRel",
      subfolderName: null,
    },
    qrOptions: {
      size: opts.size || 2000,
      errorCorrectionLevel: "Q",
      pattern: "square",
      patternColor: "#000000",
      patternBackground: "#ffffff",
      cornetsOuter: "square",
      cornetsOuterColor: "#000000",
      cornetsInterior: "square",
      cornetsInteriorColor: "#000000",
      logotype: null,
      logotypeSize: 0.3,
      logotypeMargin: 0,
      logotypeHideBackground: true,
      gradientPattern: null,
      gradientCornetsOuter: null,
      gradientCornetsInterior: null,
      gradientBackground: null,
    },
    qrFrame: {
      name: "noFrame",
      color: "#000000",
      backgroundColor: "#ffffff",
      text: "",
      textSize: null,
      textColor: "#9C3AAF",
      textFont: "Roboto",
    },
  };
}

export async function createQr(link, apiKey, opts = {}) {
  const body = buildMeqrBody(link, opts);

  const res = await fetch(`${MEQR_BASE}/api/v2/qr/link/create`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "*/*",
      "X-AUTH-TOKEN": apiKey,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`ME-QR API error: ${text}`);
  }

  const contentType = res.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    return await res.json();
  }

  // Binary response (png/svg/etc) — return image URL from headers or raw data
  return { binary: true, data: Buffer.from(await res.arrayBuffer()) };
}
