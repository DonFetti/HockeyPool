const NHL_ORIGIN = "https://api-web.nhle.com";

/** @param {{ path?: string; rawUrl?: string; rawQuery?: string; headers: Record<string, string | undefined> }} event */
function tailFromEvent(event) {
  const p = event.path || "";
  if (p.startsWith("/api/nhl/")) {
    return p.slice("/api/nhl/".length).replace(/^\/+/, "");
  }
  try {
    const raw = event.rawUrl;
    if (raw) {
      const u = new URL(raw);
      if (u.pathname.startsWith("/api/nhl/")) {
        return u.pathname.slice("/api/nhl/".length).replace(/^\/+/, "");
      }
    }
  } catch {
    /* ignore */
  }
  return "";
}

export const handler = async (event) => {
  const tail = tailFromEvent(event);
  if (!tail) {
    return {
      statusCode: 400,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ error: "Missing /api/nhl path" }),
    };
  }

  const rawQ =
    event.rawQuery ||
    (event.queryStringParameters &&
      new URLSearchParams(
        /** @type {Record<string, string>} */ (event.queryStringParameters),
      ).toString());
  const q = rawQ ? `?${rawQ}` : "";
  const url = `${NHL_ORIGIN}/${tail}${q}`;

  const res = await fetch(url, {
    headers: {
      Accept: event.headers.accept || "application/json",
      "User-Agent": event.headers["user-agent"] || "Netlify-nhl-proxy",
    },
  });

  const body = await res.text();
  const ct = res.headers.get("content-type") || "application/json";
  const cc = res.headers.get("cache-control");

  /** @type {Record<string, string>} */
  const headers = { "content-type": ct };
  if (cc) headers["cache-control"] = cc;

  return {
    statusCode: res.status,
    headers,
    body,
  };
};
