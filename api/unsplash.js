/** In-memory cache: normalized query + orientation + page → minimal payload + expiry */
const cache = new Map();
const CACHE_TTL = 1000 * 60 * 60 * 6; // 6 hours

function normalizeCacheKey(q) {
  return String(q || "")
    .trim()
    .toLowerCase()
    .replace(/,/g, " ")
    .replace(/\s+/g, " ");
}

function toMinimal(photo) {
  if (!photo || typeof photo !== "object") return null;
  return {
    thumb: photo.urls?.thumb ?? null,
    small: photo.urls?.small ?? null,
    regular: photo.urls?.regular ?? null,
    blur_hash: photo.blur_hash ?? null,
    alt: photo.alt_description || "",
    credit: photo.user?.name || "Unsplash",
    alt_description: photo.alt_description,
    description: photo.description,
    tags: photo.tags,
    location: photo.location,
    links: photo.links ? { html: photo.links.html } : undefined,
    source: "unsplash",
  };
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const { query, orientation = "landscape", page = "1" } = req.query;
  const q = Array.isArray(query) ? query[0] : query;
  const orient = Array.isArray(orientation) ? orientation[0] : orientation;
  const pageNum = Math.min(100, Math.max(1, parseInt(Array.isArray(page) ? page[0] : page, 10) || 1));
  const key = process.env.UNSPLASH_ACCESS_KEY;

  if (!key) return res.status(500).json({ error: "No key" });
  if (!q || typeof q !== "string") return res.status(400).json({ error: "Missing query" });

  const cacheKey = `${normalizeCacheKey(q)}__${orient || "landscape"}__p${pageNum}`;
  const cached = cache.get(cacheKey);

  if (cached && Date.now() < cached.expires) {
    res.setHeader("X-Cache", "HIT");
    return res.status(200).json(cached.data);
  }

  const searchUrl = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(q)}&orientation=${orient || "landscape"}&per_page=5&page=${pageNum}&client_id=${key}`;
  const randomUrl = `https://api.unsplash.com/photos/random?query=${encodeURIComponent(q)}&orientation=${orient || "landscape"}&client_id=${key}`;

  try {
    const r = await fetch(searchUrl);
    const data = await r.json();

    if (r.ok && Array.isArray(data?.results) && data.results.length > 0) {
      const minimal = toMinimal(data.results[0]);
      if (!minimal?.regular) {
        res.setHeader("X-Cache", "MISS");
        return res.status(502).json({ error: "No image URL in search result" });
      }
      cache.set(cacheKey, { data: minimal, expires: Date.now() + CACHE_TTL });
      res.setHeader("X-Cache", "MISS");
      return res.status(200).json(minimal);
    }

    // Demo tier may block search — fall back to /photos/random (still query-biased)
    const r2 = await fetch(randomUrl);
    const data2 = await r2.json();
    res.setHeader("X-Cache", "MISS");
    if (!r2.ok) {
      return res.status(r2.status).json(data2);
    }
    const minimal = toMinimal(data2);
    if (!minimal?.regular) {
      return res.status(502).json({ error: "Unsplash returned no image" });
    }
    cache.set(cacheKey, { data: minimal, expires: Date.now() + CACHE_TTL });
    res.setHeader("X-Unsplash-Fallback", "random");
    return res.status(200).json(minimal);
  } catch (e) {
    res.status(502).json({ error: "Unsplash proxy failed", message: String(e?.message || e) });
  }
}
