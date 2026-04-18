// /api/places.js — Google Places (New) serverless proxy
// Returns venue photo + intel in a single response
// Session 45 · L2 venue imagery layer

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const { query, maxWidth = 800 } = req.query;

  if (!query) {
    return res.status(400).json({ error: 'query required' });
  }

  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'API key not configured' });
  }

  try {
    // Step 1 — Text Search with rich field mask
    const searchRes = await fetch(
      'https://places.googleapis.com/v1/places:searchText',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': apiKey,
          'X-Goog-FieldMask': [
            'places.id',
            'places.displayName',
            'places.formattedAddress',
            'places.rating',
            'places.userRatingCount',
            'places.priceLevel',
            'places.currentOpeningHours.openNow',
            'places.regularOpeningHours.weekdayDescriptions',
            'places.nationalPhoneNumber',
            'places.websiteUri',
            'places.photos',
            'places.types',
            'places.location'
          ].join(',')
        },
        body: JSON.stringify({ textQuery: query, maxResultCount: 1 })
      }
    );

    if (!searchRes.ok) {
      return res.status(searchRes.status).json({ error: 'places search failed' });
    }

    const searchData = await searchRes.json();
    const place = searchData?.places?.[0];

    if (!place) {
      return res.status(404).json({ error: 'no place found' });
    }

    // Step 2 — Photo URI (if photos exist)
    let photoUri = null;
    const photoName = place.photos?.[0]?.name;
    if (photoName) {
      const photoRes = await fetch(
        `https://places.googleapis.com/v1/${photoName}/media?maxWidthPx=${maxWidth}&skipHttpRedirect=true`,
        { headers: { 'X-Goog-Api-Key': apiKey } }
      );
      if (photoRes.ok) {
        const photoData = await photoRes.json();
        photoUri = photoData?.photoUri || null;
      }
    }

    // Normalize response shape
    const payload = {
      place_id: place.id,
      name: place.displayName?.text || '',
      address: place.formattedAddress || '',
      rating: place.rating || null,
      reviewCount: place.userRatingCount || 0,
      priceLevel: place.priceLevel || null,
      openNow: place.currentOpeningHours?.openNow ?? null,
      hours: place.regularOpeningHours?.weekdayDescriptions || [],
      phone: place.nationalPhoneNumber || null,
      website: place.websiteUri || null,
      types: place.types || [],
      location: place.location || null,
      photoUri
    };

    // Cache aggressively — 24hr CDN cache on unique queries
    res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate=172800');
    return res.status(200).json(payload);
  } catch (err) {
    console.error('places.js error:', err);
    return res.status(500).json({ error: 'places proxy failure' });
  }
}
