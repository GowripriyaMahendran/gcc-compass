# GCC Compass (prototype)

Setup Advisor for companies opening a Global Capability Centre in India. Single-page app, plain HTML/CSS/JS, no framework, no server, no API keys.

## Run it
Double-click `index.html`. It works offline except for Google Fonts, which fall back to system fonts.

## Folder
- `index.html`  the finished app (everything inlined, ~360 KB)
- `src/shell.html`  page structure and inputs
- `src/app.css`  styles (light and dark themes)
- `src/engine.js`  rule-based requirement parser, cost model, state-incentive rules, city scoring, provider ranking
- `src/ui.js`  the five screens and event handling
- `data/csv/`  the 7 source CSVs
- `data/prep.py`  CSVs -> `data/data.json`
- `build.py`  `src/` + `data/data.json` -> `index.html`

## Change something
1. Edit a CSV in `data/csv/`, then run `python3 data/prep.py`
2. Run `python3 build.py`
3. Open `index.html`

Cost assumptions (fit-out, recruitment, set-up, hiring ramp, pay load): `DEFAULT_A` in `src/engine.js`.
Score weights: `WEIGHTS` in `src/engine.js`.
State incentive rules: `RULES` in `src/engine.js` (hand-encoded from `state_policies.csv`).

## Host it
Any static host works (GitHub Pages, Netlify, Vercel, S3): upload `index.html`.

## Known limits
- Requirement reader is keyword rules, not AI.
- Cost range is an estimate; salaries and rents come from the data, other lines are assumptions marked in the app.
- 8 Tier-2 cities have no rent data; 6 states have no quantifiable incentives.
