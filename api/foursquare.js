/**
 * Foursquare Places API v3 proxy - venue search + embedded photo URLs only.
 * Env: FOURSQUARE_API_KEY (raw key in Authorization header, no "Bearer" prefix).
 */
export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const key = process.env.FOURSQUARE_API_KEY;
  if (!key) return res.status(500).json({ error: "FOURSQUARE_API_KEY not configured" });

  const { query, near, limit = "3" } = req.query;
  const q = Array.isArray(query) ? query[0] : query;
  if (!q || typeof q !== "string" || !q.trim()) {
    return res.status(400).json({ error: "Query required" });
  }

  const nearStr = Array.isArray(near) ? near[0] : near;
  const lim = Math.min(50, Math.max(1, parseInt(String(Array.isArray(limit) ? limit[0] : limit), 10) || 3));

  const params = new URLSearchParams();
  params.set("query", q.trim());
  params.set("limit", String(lim));
  params.set("fields", "fsq_id,name,location,rating,price,photos,description,tips");
  if (nearStr && typeof nearStr === "string" && nearStr.trim()) {
    params.set("near", nearStr.trim());
  }

  try {
    const searchUrl = `https://api.foursquare.com/v3/places/search?${params.toString()}`;
    const searchRes = await fetch(searchUrl, {
      headers: {
        Authorization: key,
        Accept: "application/json",
        "X-Places-Api-Version": "2025-01-01",
      },
    });

    const data = await searchRes.json();

    if (!searchRes.ok) {
      return res.status(searchRes.status).json({
        error: data?.message || data?.error || "Foursquare search failed",
        status: searchRes.status,
        details: data,
      });
    }

    // Map results - embedded photos only (no per-venue fetch; avoids serverless timeout)
    const results = (data?.results || []).map((venue) => {
      // Build photo URL from embedded photos array
      let photoUrl = null;
      const photo = venue?.photos?.[0];
      if (photo?.prefix && photo?.suffix) {
        photoUrl = `${photo.prefix}800x500${photo.suffix}`;
      }

      // Fallback description from tips
      let description = venue.description;
      if (!description && Array.isArray(venue.tips) && venue.tips.length > 0) {
        const t0 = venue.tips[0];
        description = typeof t0 === "string" ? t0 : t0?.text || t0?.message || null;
      }

      return {
        fsq_id: venue.fsq_id,
        name: venue.name,
        location: venue.location,
        rating: venue.rating,
        price: venue.price,
        description: description || null,
        photoUrl,
      };
    });

    res.status(200).json({ results });
  } catch (err) {
    res.status(500).json({ error: String(err?.message || err) });
  }
}
