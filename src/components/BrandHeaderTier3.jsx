// src/components/BrandHeaderTier3.jsx
// 1 Bag Nomad — Tier 3 Brand Header (Emotional Variant)
// DS v2.1 §7b · Session 54H · April 18, 2026
//
// Centered lockup: 1 [no-dots Living Logo] Nomad
// Tagline row: DREAM BIG · travel light
//
// Used on: Welcome · Dream · Vision Reveal
// NOT used on Tier 2a console screens (those keep plain wordmark + CA orb)

import LogoMark from '../assets/logo-mark-no-dots.svg';
import './BrandHeaderTier3.css';

/**
 * Tier 3 Brand Header — Emotional Variant
 *
 * @param {boolean} sticky        — header sticks on scroll (Dream: true, others: false)
 * @param {boolean} grainOverlay  — film grain over backdrop at 3.5% (default: true)
 * @param {boolean} shimmer       — soft shimmer on "DREAM BIG" every 8s (Dream only: true)
 */
export default function BrandHeaderTier3({
  sticky = false,
  grainOverlay = true,
  shimmer = false,
}) {
  return (
    <header className={`bh3-root ${sticky ? 'bh3-sticky' : ''}`}>
      {grainOverlay && <div className="bh3-grain" aria-hidden />}

      {/* Row 1 · Centered Lockup */}
      <div className="bh3-row bh3-row-1">
        <div className="bh3-lockup" aria-label="1 Bag Nomad">
          <span className="bh3-wordmark-part">1</span>
          <span className="bh3-wordmark-part">Bag</span>
          <img src={LogoMark} alt="" className="bh3-logo-mark" aria-hidden />
          <span className="bh3-wordmark-part">Nomad</span>
        </div>
      </div>

      {/* Row 2 · Tagline */}
      <div className="bh3-row bh3-row-2">
        <span className={`bh3-tagline-big ${shimmer ? 'bh3-shimmer' : ''}`}>
          DREAM BIG
        </span>
        <span className="bh3-divider" aria-hidden />
        <span className="bh3-tagline-light">travel light</span>
      </div>
    </header>
  );
}
