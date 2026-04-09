import { useState, useEffect, useMemo } from "react";

/**
 * Mirror vision-sequence logic: specific, then cultural, then regional.
 * Never default to category-generic macros; bias queries toward scene, street, exterior, plaza.
 */
const LS_PREFIX = "1bn_unsplash_v4_";

function slugPart(s) {
  return String(s || "")
    .trim()
    .toLowerCase()
    .replace(/[^\w\u00C0-\u024F]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 96);
}

export function unsplashCacheKey(destination, category, instanceId) {
  const d = slugPart(destination);
  const c = slugPart(category);
  if (!d || !c) return null;
  const base = `${LS_PREFIX}${d}__${c}`;
  const inst = instanceId != null && String(instanceId).trim() ? slugPart(String(instanceId).trim()) : "";
  return inst ? `${base}__${inst}` : base;
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

/** Max N whitespace-separated tokens (country-first queries stay tight for Unsplash relevance). */
function takeFirstTokens(phrase, maxTokens = 4) {
  const w = String(phrase || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  return w.slice(0, maxTokens).join(" ");
}

/**
 * Country leads when available; max 4 tokens per query; Iberian/Caribbean/Andes food hints
 * sit under the country prefix.
 */
export function buildUnsplashQueryTiers(destination, category, country) {
  const d = String(destination || "").trim();
  if (!d) return [];
  const co = normalizeCountry(country);
  const tiers = [];

  if (category === "food") {
    if (co) {
      if (isIberian(d, co)) {
        tiers.push(takeFirstTokens(`${co} ${d} tapas market`, 4));
        tiers.push(takeFirstTokens(`${co} ${d} old town`, 4));
        tiers.push(takeFirstTokens(`${co} culture street`, 4));
      } else if (isCaribbeanOrAndes(d, co)) {
        tiers.push(takeFirstTokens(`${co} ${d} street food`, 4));
        tiers.push(takeFirstTokens(`${co} ${d} food market`, 4));
        tiers.push(takeFirstTokens(`${co} culture street`, 4));
      } else {
        tiers.push(takeFirstTokens(`${co} ${d} food market`, 4));
        tiers.push(takeFirstTokens(`${co} ${d} old town`, 4));
        tiers.push(takeFirstTokens(`${co} culture street`, 4));
      }
    } else if (isIberian(d, co)) {
      tiers.push(takeFirstTokens(`${d} tapas market`, 4));
      tiers.push(takeFirstTokens(`${d} old town`, 4));
    } else if (isCaribbeanOrAndes(d, co)) {
      tiers.push(takeFirstTokens(`${d} street food`, 4));
      tiers.push(takeFirstTokens(`${d} food market`, 4));
    } else {
      tiers.push(takeFirstTokens(`${d} food market`, 4));
      tiers.push(takeFirstTokens(`${d} old town`, 4));
    }
    return dedupeQueries(tiers);
  }

  if (category === "stay") {
    if (co) {
      tiers.push(takeFirstTokens(`${co} ${d} hotel courtyard`, 4));
      tiers.push(takeFirstTokens(`${co} ${d} azulejo exterior`, 4));
      tiers.push(takeFirstTokens(`${co} historic architecture`, 4));
    } else {
      tiers.push(takeFirstTokens(`${d} hotel courtyard`, 4));
      tiers.push(takeFirstTokens(`${d} hotel rooftop`, 4));
      tiers.push(takeFirstTokens(`${d} old town`, 4));
    }
    return dedupeQueries(tiers);
  }

  const activityClean = cleanActivityCategory(category);
  if (co) {
    if (activityClean) {
      tiers.push(takeFirstTokens(`${co} ${activityClean} plantation`, 4));
      tiers.push(takeFirstTokens(`${co} ${activityClean} mountains`, 4));
      tiers.push(takeFirstTokens(`${co} ${activityClean} outdoor`, 4));
    } else {
      tiers.push(takeFirstTokens(`${co} ${d} mountains`, 4));
      tiers.push(takeFirstTokens(`${co} landscape travel`, 4));
      tiers.push(takeFirstTokens(`${co} ${d} culture`, 4));
    }
  } else if (activityClean) {
    tiers.push(takeFirstTokens(`${d} ${activityClean} street`, 4));
    tiers.push(takeFirstTokens(`${d} ${activityClean} outdoor`, 4));
    tiers.push(takeFirstTokens(`${d} ${activityClean} plaza`, 4));
  } else {
    tiers.push(takeFirstTokens(`${d} old town`, 4));
    tiers.push(takeFirstTokens(`${d} plaza skyline`, 4));
  }
  return dedupeQueries(tiers);
}

/** Primary query only (compat / debugging). */
export function buildUnsplashQuery(destination, category, country) {
  const tiers = buildUnsplashQueryTiers(destination, category, country);
  return tiers[0] || "";
}

/**
 * True if Unsplash metadata plausibly matches this stop. When `country` is set,
 * require it to appear in metadata (avoids Kingston UK vs Kingston Jamaica).
 */
export function photoMatchesDestination(photo, destination, country) {
  const tags = Array.isArray(photo?.tags)
    ? photo.tags.map((t) => (typeof t === "string" ? t : t?.title)).filter(Boolean)
    : [];
  const haystack = [
    photo?.alt_description,
    photo?.description,
    photo?.location?.country,
    photo?.location?.city,
    photo?.location?.name,
    ...tags,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  const destLower = String(destination || "").trim().toLowerCase();
  const countryLower = String(country || "").trim().toLowerCase();

  if (!haystack.trim()) return false;

  if (countryLower) {
    if (haystack.includes(countryLower)) return true;
    return false;
  }
  if (destLower && haystack.includes(destLower)) return true;
  return false;
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
 * @param {{ instanceId?: string }} [options] per-card cache slot (e.g. activity list index) so parallel activities do not share one cached URL.
 */
export function useDestinationPhoto(destination, category, country, options = {}) {
  const instanceId = options?.instanceId;
  const queryTiers = useMemo(
    () => buildUnsplashQueryTiers(destination, category, country),
    [destination, category, country]
  );
  const cacheKey = useMemo(
    () => unsplashCacheKey(destination, category, instanceId),
    [destination, category, instanceId]
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
      const destTrim = String(destination || "").trim();
      const coTrim = normalizeCountry(country);
      let fallback = null;

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
          if (!imgUrl) continue;

          fallback = { imgUrl, htmlLink, data, query: q };

          if (photoMatchesDestination(data, destTrim, coTrim)) {
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

          if (import.meta.env.DEV) {
            console.warn("[1BN] Unsplash photo rejected (metadata mismatch)", {
              query: q,
              destination: destTrim,
              country: coTrim,
              alt_description: data?.alt_description,
            });
          }
        } catch (err) {
          console.error("[1BN] Unsplash fetch error:", err);
        }
      }

      if (!cancelled && fallback) {
        console.warn("[1BN] Unsplash: all tiers failed metadata validation; using last image", {
          destination: destTrim,
          country: coTrim,
          query: fallback.query,
          alt_description: fallback.data?.alt_description,
        });
        const { imgUrl, htmlLink } = fallback;
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
  }, [queryTiers, cacheKey, cached, destination, country]);

  const netMatches = net.forKey === cacheKey && net.done;
  const url = cached?.url ?? (netMatches ? net.url : null);
  const htmlLink = cached?.htmlLink ?? (netMatches ? net.htmlLink : null);
  const ready = !queryTiers.length || !!cached || netMatches;

  return { url, htmlLink, ready };
}
