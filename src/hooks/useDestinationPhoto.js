import { useState, useEffect, useMemo } from "react";

/**
 * Mirror vision-sequence logic: specific, then cultural, then regional.
 * Never default to category-generic macros; bias queries toward scene, street, exterior, plaza.
 */
const LS_PREFIX = "1bn_unsplash_v3_";

function slugPart(s) {
  return String(s || "")
    .trim()
    .toLowerCase()
    .replace(/[^\w\u00C0-\u024F]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 96);
}

export function unsplashCacheKey(destination, category) {
  const d = slugPart(destination);
  const c = slugPart(category);
  if (!d || !c) return null;
  return `${LS_PREFIX}${d}__${c}`;
}

function normalizeCountry(country) {
  return String(country || "").trim();
}

function localeHints(destination, country) {
  return `${String(destination || "")} ${normalizeCountry(country)}`.toLowerCase();
}

function isIberian(destination, country) {
  return /\b(spain|espa\u00f1a|portugal|spanish|portuguese|andalus|seville|sevilla|lisbon|lisboa|madrid|barcelona|valencia|granada|c[o\u00f3]rdoba|oporto|porto|gibraltar)\b/i.test(
    localeHints(destination, country)
  );
}

function isCaribbeanOrAndes(destination, country) {
  return /\b(jamaica|kingston|caribbean|belize|cuba|dominican|haiti|barbados|trinidad|medell[i\u00ed]n|colombia|cartagena|bogot[a\u00e1]|quito|peru|ecuador)\b/i.test(
    localeHints(destination, country)
  );
}

/** Session 43+ activity cleaner: strip filler; keep up to 3 words. */
export function cleanActivityCategory(category) {
  return String(category || "")
    .trim()
    .replace(/\b(tour|trip|day|with|and|the|a|an|of|to|at|in|for|full|private|guided)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .slice(0, 3)
    .join(" ");
}

function dedupeQueries(queries) {
  const seen = new Set();
  const out = [];
  for (const q of queries) {
    const n = String(q).trim().toLowerCase();
    if (!n || seen.has(n)) continue;
    seen.add(n);
    out.push(String(q).trim());
  }
  return out;
}

/**
 * Ordered list: try each until Unsplash returns an image (handled in the hook).
 * Tier 1 = place-specific experience; tier 2 = cultural / old town; tier 3 = country.
 */
export function buildUnsplashQueryTiers(destination, category, country) {
  const d = String(destination || "").trim();
  if (!d) return [];
  const co = normalizeCountry(country);
  const tiers = [];

  if (category === "food") {
    if (isIberian(d, co)) {
      tiers.push(`${d} tapas bar market street scene`);
    } else if (isCaribbeanOrAndes(d, co)) {
      tiers.push(`${d} street food market outdoor scene`);
    } else {
      tiers.push(`${d} restaurant terrace dining street scene`);
    }
    tiers.push(`${d} old town plaza street`, `${d} skyline golden hour city`);
    if (co) tiers.push(`${co} architecture travel`);
    return dedupeQueries(tiers);
  }

  if (category === "stay") {
    tiers.push(
      `${d} boutique hotel courtyard rooftop exterior`,
      `${d} hotel lobby interior courtyard`,
      `${d} old town street evening`
    );
    if (co) tiers.push(`${co} historic city architecture`);
    return dedupeQueries(tiers);
  }

  const activityClean = cleanActivityCategory(category);
  if (activityClean) tiers.push(`${d} ${activityClean}`);
  tiers.push(`${d} old town street scene`, `${d} plaza skyline golden hour`);
  if (co) tiers.push(`${co} landscape travel`);
  return dedupeQueries(tiers);
}

/** Primary query only (compat / debugging). */
export function buildUnsplashQuery(destination, category, country) {
  const tiers = buildUnsplashQueryTiers(destination, category, country);
  return tiers[0] || "";
}

function readCache(cacheKey) {
  if (!cacheKey) return null;
  try {
    const raw = localStorage.getItem(cacheKey);
    if (!raw) return null;
    const p = JSON.parse(raw);
    return p?.url ? { url: p.url, htmlLink: p.htmlLink || null } : null;
  } catch {
    return null;
  }
}

/**
 * Fetches via /api/unsplash; tries query tiers until one returns a photo.
 * @param {string} [country] optional; improves tier-3 regional fallback.
 */
export function useDestinationPhoto(destination, category, country) {
  const queryTiers = useMemo(
    () => buildUnsplashQueryTiers(destination, category, country),
    [destination, category, country]
  );
  const cacheKey = useMemo(
    () => unsplashCacheKey(destination, category),
    [destination, category]
  );
  const cached = useMemo(() => readCache(cacheKey), [cacheKey]);

  const [net, setNet] = useState({
    forKey: null,
    done: false,
    url: null,
    htmlLink: null,
  });

  useEffect(() => {
    if (!queryTiers.length || cached) return undefined;

    let cancelled = false;
    const k = cacheKey;

    (async () => {
      for (const q of queryTiers) {
        if (cancelled) return;
        try {
          const res = await fetch(
            `/api/unsplash?query=${encodeURIComponent(q)}&orientation=landscape`
          );
          if (!res.ok) continue;
          const data = await res.json();
          if (cancelled) return;
          const imgUrl = data?.urls?.regular || data?.urls?.small || null;
          const htmlLink =
            data?.links?.html ||
            "https://unsplash.com/?utm_source=1bag_nomad&utm_medium=referral";
          if (imgUrl) {
            if (k) {
              try {
                localStorage.setItem(k, JSON.stringify({ url: imgUrl, htmlLink }));
              } catch {
                /* quota */
              }
            }
            setNet({
              forKey: k,
              done: true,
              url: imgUrl,
              htmlLink,
            });
            return;
          }
        } catch (err) {
          console.error("[1BN] Unsplash fetch error:", err);
        }
      }
      if (!cancelled) {
        setNet({
          forKey: k,
          done: true,
          url: null,
          htmlLink: null,
        });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [queryTiers, cacheKey, cached]);

  const netMatches = net.forKey === cacheKey && net.done;
  const url = cached?.url ?? (netMatches ? net.url : null);
  const htmlLink = cached?.htmlLink ?? (netMatches ? net.htmlLink : null);
  const ready = !queryTiers.length || !!cached || netMatches;

  return { url, htmlLink, ready };
}
