export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const { query, orientation = "landscape" } = req.query;
  const q = Array.isArray(query) ? query[0] : query;
  const key = process.env.UNSPLASH_ACCESS_KEY;
  if (!key) return res.status(500).json({ error: "No key" });
  if (!q || typeof q !== "string") return res.status(400).json({ error: "Missing query" });

  const orient = Array.isArray(orientation) ? orientation[0] : orientation;
  const url = `https://api.unsplash.com/photos/random?query=${encodeURIComponent(q)}&orientation=${orient || "landscape"}&client_id=${key}`;

  try {
    const r = await fetch(url);
    const data = await r.json();
    res.status(r.status).json(data);
  } catch (e) {
    res.status(502).json({ error: "Unsplash proxy failed", message: String(e?.message || e) });
  }
}
