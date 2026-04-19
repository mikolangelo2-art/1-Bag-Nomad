// src/hooks/usePlace.js — Google Places venue photo + intel hook
// Session 45 · L2 venue imagery layer
// Mirrors useDestinationPhoto caching pattern (server + client + blur placeholder)

import { useState, useEffect, useRef } from 'react';

const LS_PREFIX = '1bn_places_intel_v1_';
const CACHE_TTL = 6 * 60 * 60 * 1000; // 6 hours client-side
const inflight = new Map(); // dedupe concurrent requests

function readCache(key) {
  try {
    const raw = localStorage.getItem(LS_PREFIX + key);
    if (!raw) return null;
    const { data, timestamp } = JSON.parse(raw);
    if (Date.now() - timestamp > CACHE_TTL) return null;
    return data;
  } catch { return null; }
}

function writeCache(key, data) {
  try {
    localStorage.setItem(LS_PREFIX + key, JSON.stringify({ data, timestamp: Date.now() }));
  } catch {}
}

/**
 * Build a search query for Google Places based on destination, category, and item name.
 * Strips filler words from item names for better match accuracy.
 * Appends a category qualifier (hotel/restaurant/attraction) so Google returns the right TYPE.
 */
export function buildPlaceQuery(destination, category, itemName = '') {
  const d = String(destination || '').trim();
  if (!d) return '';

  // Category qualifier — tells Google what KIND of place we want
  const qualifier =
    category === 'stay'       ? 'hotel'
    : category === 'food'       ? 'restaurant'
    : category === 'activities' ? 'attraction'
    : '';

  if (itemName) {
    const clean = String(itemName)
      .replace(/\b(tour|trip|day|with|and|the|a|an|of|to|at|in|for|full|private|guided|admission|ticket|experience)\b/gi, '')
      .replace(/\s+/g, ' ').trim()
      .split(' ').slice(0, 4).join(' ');
    if (clean) {
      return qualifier ? `${clean} ${qualifier} ${d}` : `${clean} ${d}`;
    }
    return d;
  }

  if (category === 'food')       return `${d} restaurant`;
  if (category === 'stay')       return `${d} boutique hotel`;
  if (category === 'activities') return `${d} landmark`;
  return d;
}

/**
 * Unified hook — one fetch returns both photo and intel.
 * No flash of "photo loaded, rating loading" mismatches.
 */
export function usePlace(query) {
  const [data, setData] = useState(() => query ? readCache(query) : null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const lastQuery = useRef('');

  useEffect(() => {
    if (!query || query === lastQuery.current) return;
    lastQuery.current = query;

    const cached = readCache(query);
    if (cached) {
      setData(cached);
      return;
    }

    // Dedupe concurrent requests
    if (inflight.has(query)) {
      inflight.get(query).then(setData).catch(setError);
      return;
    }

    setLoading(true);
    const promise = fetch(`/api/places?query=${encodeURIComponent(query)}`)
      .then(res => res.ok ? res.json() : null)
      .then(payload => {
        if (payload && !payload.error) {
          writeCache(query, payload);
          setData(payload);
          return payload;
        }
        return null;
      })
      .catch(err => {
        setError(err);
        return null;
      })
      .finally(() => {
        setLoading(false);
        inflight.delete(query);
      });

    inflight.set(query, promise);
  }, [query]);

  return { data, loading, error };
}
