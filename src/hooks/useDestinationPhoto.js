import { useState, useEffect, useMemo } from "react";

const LS_PREFIX = "1bn_unsplash_v1_";

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

export function buildUnsplashQuery(destination, category) {
  const d = String(destination || "").trim();
  if (!d) return "";
  if (category === "food") return `${d} food`;
  if (category === "stay") return `${d} accommodation`;
  const extra = String(category || "").trim();
  return extra ? `${d} ${extra}` : d;
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
 * Fetches one landscape photo per (destination, category); caches in localStorage.
 * category: "food" | "stay" | or activity-specific string for "{destination} {category}".
 */
export function useDestinationPhoto(destination, category) {
  const query = useMemo(
    () => buildUnsplashQuery(destination, category),
    [destination, category]
  );
  const cacheKey = useMemo(
    () => unsplashCacheKey(destination, category),
    [destination, category]
  );
  const cached = useMemo(() => readCache(cacheKey), [cacheKey]);
  const accessKey = import.meta.env.VITE_UNSPLASH_ACCESS_KEY;

  const [net, setNet] = useState({
    forKey: null,
    done: false,
    url: null,
    htmlLink: null,
  });

  useEffect(() => {
    if (!query || cached || !accessKey) return undefined;

    let cancelled = false;
    const k = cacheKey;
    const apiUrl = `https://api.unsplash.com/photos/random?query=${encodeURIComponent(
      query
    )}&orientation=landscape&client_id=${encodeURIComponent(accessKey)}`;

    fetch(apiUrl)
      .then((res) => {
        if (!res.ok) throw new Error(String(res.status));
        return res.json();
      })
      .then((data) => {
        if (cancelled) return;
        const imgUrl = data?.urls?.regular || data?.urls?.small || null;
        const htmlLink =
          data?.links?.html ||
          "https://unsplash.com/?utm_source=1bag_nomad&utm_medium=referral";
        if (imgUrl && k) {
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
      })
      .catch(() => {
        if (!cancelled) {
          setNet({
            forKey: k,
            done: true,
            url: null,
            htmlLink: null,
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [query, cacheKey, cached, accessKey]);

  const netMatches = net.forKey === cacheKey && net.done;
  const url = cached?.url ?? (netMatches ? net.url : null);
  const htmlLink = cached?.htmlLink ?? (netMatches ? net.htmlLink : null);
  const ready = !query || !!cached || !accessKey || netMatches;

  return { url, htmlLink, ready };
}
