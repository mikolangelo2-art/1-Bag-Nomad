/** In-memory cache: normalized query + orientation → minimal payload + expiry */
const cache = new Map();
const CACHE_TTL = 1000 * 60 * 60 * 6; // 6 hours

function normalizeCacheKey(q) {
  return String(q || "")
    .trim()
    .toLowerCase()
    .replace(/,/g, " ")
    .replace(/\s+/g, " ");
}

function toMinimal(data) {
  if (!data || typeof data !== "object") return null;
  return {
    thumb: data.urls?.thumb ?? null,
    small: data.urls?.small ?? null,
    regular: data.urls?.regular ?? null,
    blur_hash: data.blur_hash ?? null,
    alt: data.alt_description || "",
    credit: data.user?.name || "Unsplash",
    alt_description: data.alt_description,
    description: data.description,
    tags: data.tags,
    location: data.location,
    links: data.links ? { html: data.links.html } : undefined,
  };
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const { query, orientation = "landscape" } = req.query;
  const q = Array.isArray(query) ? query[0] : query;
  const orient = Array.isArray(orientation) ? orientation[0] : orientation;
  const key = process.env.UNSPLASH_ACCESS_KEY;

  if (!key) return res.status(500).json({ error: "No key" });
  if (!q || typeof q !== "string") return res.status(400).json({ error: "Missing query" });

  const cacheKey = `${normalizeCacheKey(q)}__${orient || "landscape"}`;
  const cached = cache.get(cacheKey);

  if (cached && Date.now() < cached.expires) {
    res.setHeader("X-Cache", "HIT");
    return res.status(200).json(cached.data);
  }

  const url = `https://api.unsplash.com/photos/random?query=${encodeURIComponent(q)}&orientation=${orient || "landscape"}&client_id=${key}`;

  try {
    const r = await fetch(url);
    const data = await r.json();

    if (!r.ok) {
      res.setHeader("X-Cache", "MISS");
      return res.status(r.status).json(data);
    }

    const minimal = toMinimal(data);
    if (!minimal?.regular) {
      res.setHeader("X-Cache", "MISS");
      return res.status(502).json({ error: "Unsplash returned no image" });
    }

    cache.set(cacheKey, {
      data: minimal,
      expires: Date.now() + CACHE_TTL,
    });

    res.setHeader("X-Cache", "MISS");
    return res.status(200).json(minimal);
  } catch (e) {
    res.status(502).json({ error: "Unsplash proxy failed", message: String(e?.message || e) });
  }
}
