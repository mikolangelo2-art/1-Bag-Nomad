# Deferred — Google Places + Foursquare
**Vaulted: April 12, 2026 · Sprint Day 16**

---

## Decision

Both Google Places and Foursquare are **deferred to post-beta**. Do not spend any more sprint time on these APIs until after beta launch.

**Unsplash** (already built and working) is the confirmed photo solution for beta. AI-generated suggestion data covers venue intel. This combination is fully sufficient for beta users.

---

## Why Deferred

**Google Places:**
- Billing account `01CF99-272135-8620EC` showing CLOSED despite $10 prepayment
- Likely cause: Google account billing address doesn't match SHAREGOOD Co. Wyoming legal registration address
- Multiple sessions burned trying to resolve — not worth continuing mid-sprint

**Foursquare:**
- Billing added but API still returning 401 unauthorized
- Likely cause: new Foursquare Places API (v3) billing validation is unreliable for new accounts
- Multiple attempts failed

---

## Post-Beta Fix Plan

### Google Places (do this first)
1. Go to myaccount.google.com → Personal info → Address
2. Update to SHAREGOOD Co. Wyoming registered address
3. Go to Google Cloud Console → Billing → Reopen billing account
4. Create API key → add to Vercel as `GOOGLE_PLACES_API_KEY`
5. Fire Session 45 brief (already written and vaulted)
Estimated time: 15-30 minutes once address is updated

### Foursquare
1. Revisit after Google Places is resolved — may not be needed if Google Places covers the use case
2. If still needed: contact Foursquare developer support directly with account details

---

## Current Stack (Beta)

| Need | Solution | Status |
|---|---|---|
| Destination imagery | Unsplash (`/api/unsplash.js`) | ✅ Live |
| Venue suggestions | AI-generated (Claude) | ✅ Live |
| Venue photos | Unsplash (destination-level) | ✅ Live |
| Venue ratings/data | AI-generated inline | ✅ Live |
| Real venue photos | Google Places / Foursquare | ⏳ Post-beta |

---

*Deferred April 12, 2026 · Dream Big. Travel Light. · SHAREGOOD Co.*
