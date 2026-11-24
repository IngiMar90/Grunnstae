# Grunnstærðfræði · Lærum með myndum

**Play:** https://ingimar90.github.io/Grunnstae/

A small Icelandic mathematics PWA for visual, accessible classroom practice. This is the combined successor to `Grunnstae`, `Grunnstaerd`, and `Staegrunnur`.

## Practice

- Counting objects and matching a numeral to an illustrated quantity.
- Next/previous numbers, larger numbers, equal quantities, and repeating patterns.
- Mixed practice across the seven skills.
- Three difficulty levels, with quantities 1–5, 1–10, and 10–30.
- Sessions of 5, 10, 15, or 20 questions. Small question pools repeat as needed.
- Optional automatic advance; manual advance is the default.
- Anonymous practice or named students with local results.

All illustrations are inline SVG. No external fonts, analytics, accounts, or runtime dependencies are required. The app works offline after its first successful online load.

## Data and teacher view

Student names and results remain in the browser's local storage; they are never committed or sent to GitHub. The existing `grunnstaerdfraedi_v3_store` is retained. Data from `grunnstaerdfraedi_data_v1` and `leikskola_math_pwa_v1` are imported once on the same origin. Source records remain intact, imported sessions are deduplicated, and intentionally deleted imported records are not restored on reload.

Teacher reports retain the existing classroom access code, goals, chart, Excel-compatible export and print/PDF view. The classroom code is a convenience gate, not server-side authentication. New session accuracy counts questions answered correctly on the first try; older accuracy is labeled separately. A cancelled session is not saved.

Service-worker caches are scoped to this app. Updates must not clear caches belonging to other classroom apps on the same GitHub Pages origin.

## Validation for the combined version

Checked 2,100 generated questions for answer correctness and unique choices, all 24 exercise/level combinations with complete sessions, exact session sizes, wrong-answer retries, duplicate clicks, first-try scoring, cancelled automatic advance, teacher goals, HTML escaping, and both legacy storage formats. The implementation has no build step; serve this directory with any static web server.
