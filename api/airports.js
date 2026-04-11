export default async function handler(req, res) {
  const q = (req.query.q || "").trim();
  if (!q || q.length < 2) {
    return res.status(200).json({ airports: [], cities: [] });
  }

  const key = process.env.AIRLABS_API_KEY;
  if (!key) {
    return res.status(200).json({
      airports: [],
      cities: [],
      error: "AirLabs key not configured",
    });
  }

  try {
    const url = `https://airlabs.co/api/v9/suggest?q=${encodeURIComponent(q)}&api_key=${key}`;
    const response = await fetch(url);
    const data = await response.json();

    const airports = (data.response?.airports || []).slice(0, 8).map(a => ({
      iata: a.iata_code || "",
      name: a.name || "",
      city: a.city || a.municipality || "",
      country: a.country_code || "",
    }));

    const cities = (data.response?.cities || []).slice(0, 4).map(c => ({
      name: c.name || "",
      country: c.country_code || "",
    }));

    return res.status(200).json({ airports, cities });
  } catch (e) {
    return res.status(500).json({ error: "Failed to fetch airports" });
  }
}
