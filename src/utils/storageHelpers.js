// ── Trip Type Icons ───────────────────────────────────────────
export const TI = {
  Dive:"🤿", Surf:"🏄", Culture:"🏛️", Exploration:"🔭",
  Nature:"🦎", Moto:"🏍️", Trek:"🥾", Relax:"🌴", Transit:"✈️"
};

// ── Storage Keys ──────────────────────────────────────────────
export const SEG_KEY     = "1bn_seg_v2";
export const COACH_KEY   = "1bn_coach_v1";
export const ONBOARD_KEY = "1bn_onboard_v1";
export const RETURN_KEY  = "1bn_return_v1";

// ── Segment Storage ───────────────────────────────────────────
export const loadSeg     = () => { try { const s=localStorage.getItem(SEG_KEY); return s?JSON.parse(s):{}; } catch(e) { return {}; } };
export const saveSeg     = d  => { try { localStorage.setItem(SEG_KEY,JSON.stringify(d)); } catch(e) {} };

// ── Coach Storage ─────────────────────────────────────────────
export const loadCoach   = () => { try { const s=localStorage.getItem(COACH_KEY); return s?JSON.parse(s):{}; } catch(e) { return {}; } };
export const saveCoach   = d  => { try { localStorage.setItem(COACH_KEY,JSON.stringify(d)); } catch(e) {} };

// ── Onboard Storage ───────────────────────────────────────────
export const loadOnboard = () => { try { const s=localStorage.getItem(ONBOARD_KEY); return s?JSON.parse(s):{}; } catch(e) { return {}; } };
export const saveOnboard = d  => { try { localStorage.setItem(ONBOARD_KEY,JSON.stringify(d)); } catch(e) {} };

// ── Return Storage ────────────────────────────────────────────
export const BLANK_RETURN = {flight:{date:"",from:"",to:"",cost:"",status:"planning"}};
export const loadReturn  = () => { try { const s=localStorage.getItem(RETURN_KEY); return s?JSON.parse(s):BLANK_RETURN; } catch(e) { return BLANK_RETURN; } };
export const saveReturn  = d  => { try { localStorage.setItem(RETURN_KEY,JSON.stringify(d)); } catch(e) {} };
