// VenueIntelBadges.jsx — Rating, open-now, price level badges
// Session 45 · L2 venue intel layer
// Sits below venue name, above description

import React from 'react';
import './VenueIntelBadges.css';

function priceLevelToNumber(level) {
  const map = {
    PRICE_LEVEL_FREE: 0,
    PRICE_LEVEL_INEXPENSIVE: 1,
    PRICE_LEVEL_MODERATE: 2,
    PRICE_LEVEL_EXPENSIVE: 3,
    PRICE_LEVEL_VERY_EXPENSIVE: 4
  };
  return map[level] || 0;
}

export function VenueIntelBadges({ intel }) {
  if (!intel) return null;

  const { rating, reviewCount, openNow, priceLevel } = intel;

  // Don't render if there's nothing to show
  if (!rating && openNow == null && !priceLevel) return null;

  return (
    <div className="venue-intel-badges">
      {rating && (
        <span className="venue-badge venue-badge-rating">
          <span className="venue-star">★</span>
          <span className="venue-rating-value">{rating.toFixed(1)}</span>
          {reviewCount > 0 && (
            <span className="venue-review-count">({reviewCount.toLocaleString()})</span>
          )}
        </span>
      )}

      {openNow === true && (
        <span className="venue-badge venue-badge-open">Open now</span>
      )}
      {openNow === false && (
        <span className="venue-badge venue-badge-closed">Closed</span>
      )}

      {priceLevel && priceLevelToNumber(priceLevel) > 0 && (
        <span className="venue-badge venue-badge-price">
          {'$'.repeat(Math.min(4, priceLevelToNumber(priceLevel)))}
        </span>
      )}
    </div>
  );
}

export default VenueIntelBadges;
