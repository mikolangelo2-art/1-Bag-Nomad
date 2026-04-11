/**
 * Foursquare Places API v3 proxy — venue search + photo URLs.
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

  const { query, near, limit = "3", fields } = req.query;
  const q = Array.isArray(query) ? query[0] : query;
  if (!q || typeof q !== "string" || !q.trim()) {
    return res.status(400).json({ error: "Query required" });
  }

  const nearStr = Array.isArray(near) ? near[0] : near;
  const lim = Math.min(50, Math.max(1, parseInt(String(Array.isArray(limit) ? limit[0] : limit), 10) || 3));
  const fieldsStr =
    (Array.isArray(fields) ? fields[0] : fields) ||
    "fsq_id,name,location,rating,price,photos,hours,description,tips";

  const params = new URLSearchParams();
  params.set("query", q.trim());
  params.set("limit", String(lim));
  params.set("fields", fieldsStr);
  if (nearStr && typeof nearStr === "string" && nearStr.trim()) {
    params.set("near", nearStr.trim());
  }

  const fsqHeaders = {
    Authorization: key,
    Accept: "application/json",
    "X-Places-Api-Version": "1970-01-01",
  };

  try {
    const searchUrl = `https://api.foursquare.com/v3/places/search?${params.toString()}`;
    const searchRes = await fetch(searchUrl, { headers: fsqHeaders });
    const data = await searchRes.json();

    if (!searchRes.ok) {
      return res.status(searchRes.status).json({
        error: data?.message || data?.error || "Foursquare search failed",
        details: data,
      });
    }

    const raw = data?.results || [];
    const venuesWithPhotos = await Promise.all(
      raw.map(async (venue) => {
        const id = venue?.fsq_id;
        let photoUrl = null;
        const embedded = venue?.photos?.[0];
        if (embedded?.prefix && embedded?.suffix) {
          photoUrl = `${embedded.prefix}800x500${embedded.suffix}`;
        } else if (id) {
          try {
            const photoRes = await fetch(
              `https://api.foursquare.com/v3/places/${id}/photos?limit=1`,
              { headers: fsqHeaders }
            );
            const photosJson = await photoRes.json();
            const list = Array.isArray(photosJson)
              ? photosJson
              : photosJson?.photos || photosJson?.results || [];
            const photo = list[0];
            if (photo?.prefix && photo?.suffix) {
              photoUrl = `${photo.prefix}800x500${photo.suffix}`;
            }
          } catch {
            /* keep photoUrl null */
          }
        }

        let description = venue.description;
        if (!description && Array.isArray(venue.tips) && venue.tips.length > 0) {
          const t0 = venue.tips[0];
          description = typeof t0 === "string" ? t0 : t0?.text || t0?.message || null;
        }

        return {
          ...venue,
          description: description || venue.description,
          photoUrl,
        };
      })
    );

    res.status(200).json({ results: venuesWithPhotos });
  } catch (err) {
    res.status(500).json({ error: String(err?.message || err) });
  }
}
