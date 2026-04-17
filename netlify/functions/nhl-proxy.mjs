const NHLE_BASE = "https://api-web.nhle.com";
const STATS_BASE = "https://statsapi.web.nhl.com";

export const handler = async (event) => {
  const qs = event.queryStringParameters || {};
  let path = qs.path || "";
  const host = qs.host || "nhle";

  if (path && !path.startsWith("/")) path = `/${path}`;

  if (!path || path === "/") {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Missing or invalid path query" }),
      headers: { "Content-Type": "application/json" },
    };
  }

  const base = host === "statsapi" ? STATS_BASE : NHLE_BASE;
  const target = `${base}${path}`;

  const upstream = await fetch(target, {
    headers: {
      Accept: "application/json",
      "User-Agent": "linc-pool-netlify-proxy/1.0",
    },
  });

  const body = await upstream.text();
  return {
    statusCode: upstream.status,
    body,
    headers: {
      "Content-Type": upstream.headers.get("content-type") || "application/json",
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "public, max-age=60, s-maxage=120",
    },
  };
};
