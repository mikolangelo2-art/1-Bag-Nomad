import { Reveal } from "./Reveal.jsx";

const STAR = String.fromCodePoint(0x2726);

export function DemoSection({ onPlay }) {
  return (
    <section className="lp-section lp-demo-section">
      <div className="lp-demo-inner lp-glass lp-demo-glass">
        <Reveal variant="subtle" rootMargin="0px 0px -6% 0px">
          <p className="lp-demo-eyebrow lp-sans">{`${STAR} SEE IT IN ACTION`}</p>
        </Reveal>

        <Reveal delay={90} variant="default" duration="slow" rootMargin="0px 0px -5% 0px">
          <div className="lp-demo-frame">
            <div className="lp-demo-frame__poster" aria-hidden />
            <div className="lp-demo-frame__wash" aria-hidden />
            <div className="lp-demo-frame__vignette" aria-hidden />
            <div className="lp-demo-frame__grain" aria-hidden />
            <button type="button" className="lp-demo-play-btn" onClick={onPlay} aria-label="Play demo video">
              <span className="lp-demo-play-btn__ring" aria-hidden />
              <svg className="lp-demo-play-btn__icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                <path d="M9 7.5v9l7.5-4.5L9 7.5z" fill="currentColor" />
              </svg>
            </button>
          </div>
        </Reveal>

        <Reveal delay={180} variant="whisper">
          <p className="lp-demo-tagline lp-serif">{"Demo coming soon \u2014 follow the journey"}</p>
          <p className="lp-demo-duration lp-sans">Approx. 60\u201390 sec overview</p>
        </Reveal>
      </div>
    </section>
  );
}
