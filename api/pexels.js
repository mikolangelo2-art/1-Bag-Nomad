const cache = new Map();
const CACHE_TTL = 1000 * 60 * 60 * 6; // 6 hours

function normalizeCacheKey(q) {
  return String(q || "")
    .trim()
    .toLowerCase()
    .replace(/,/g, " ")
    .replace(/\s+/g, " ");
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
  const apiKey = process.env.PEXELS_API_KEY;

  if (!apiKey) return res.status(500).json({ error: "No Pexels key" });
  if (!q || typeof q !== "string") return res.status(400).json({ error: "Missing query" });

  const cacheKey = `pexels__${normalizeCacheKey(q)}__${orient || "landscape"}__p${pageNum}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() < cached.expires) {
    res.setHeader("X-Cache", "HIT");
    return res.status(200).json(cached.data);
  }

  const pexelsOrient = orient === "portrait" ? "portrait" : "landscape";
  const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(q)}&orientation=${pexelsOrient}&per_page=5&page=${pageNum}`;

  try {
    const r = await fetch(url, {
      headers: { Authorization: apiKey },
    });
    const data = await r.json();

    if (!r.ok || !data?.photos?.length) {
      res.setHeader("X-Cache", "MISS");
      return res.status(r.ok ? 404 : r.status).json(data?.error ? data : { error: "No Pexels results" });
    }

    const photo = data.photos[0];
    const minimal = {
      thumb: photo.src?.tiny ?? null,
      small: photo.src?.medium ?? null,
      regular: photo.src?.large ?? photo.src?.original ?? null,
      blur_hash: null,
      alt: photo.alt || "",
      alt_description: photo.alt || "",
      credit: photo.photographer || "Pexels",
      source: "pexels",
      links: { html: photo.url },
    };

    if (!minimal.regular) {
      return res.status(502).json({ error: "No image URL in Pexels result" });
    }

    cache.set(cacheKey, { data: minimal, expires: Date.now() + CACHE_TTL });
    res.setHeader("X-Cache", "MISS");
    return res.status(200).json(minimal);
  } catch (e) {
    res.status(502).json({ error: "Pexels proxy failed", message: String(e?.message || e) });
  }
}
