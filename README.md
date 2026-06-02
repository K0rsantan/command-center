# Command Center

Weather tracking dashboard with live radar, forecasts, severe weather alerts, disruption awareness, air quality, and camera feeds

## Stack

React, Vite, Tailwind CSS, Leaflet.

## What it includes

- Air Quality
- Alerts Panel
- Cameras
- Current Weather
- Daily Forecast
- Dashboard
- Disruptions View: live NWS state alerts, normalized event model, state/area drilldowns, source health, and power outage readiness
- Header
- Historical Weather
- Hourly Forecast
- Lightning Map
- Loading Spinner
- Meteograms

## Vetted outage sources

`src/services/vettedPowerOutageSources.js` tracks verified public utility outage feed candidates. Initial verified sources include DTE Energy, PECO, LG&E/KU, Austin Energy, and Tampa Electric. Kubra-backed summary feeds can be enabled through `getProductionPowerOutageSources()`; other candidates remain disabled until connector-specific ingestion is validated, so the app does not silently treat candidate feeds as production data.

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Run the local development server: `vite` |
| `npm run build` | Create a production build: `vite build` |
| `npm run lint` | Run lint checks: `eslint .` |
| `npm test` | Run service/model regression tests with Node's built-in test runner |
| `npm run preview` | Preview the production build locally: `vite preview` |

## Local setup

```bash
npm install
npm run dev
```

## Repository layout

```text
.github/
public/
  favicon.png
  logo.png
src/
  components/
  hooks/
  services/
  utils/
  App.jsx
  index.css
  main.jsx
.gitignore
eslint.config.js
index.html
package-lock.json
package.json
vite.config.js
```

## Notes

This README is generated from the current repository structure and package metadata so the GitHub front page reflects the actual project rather than a starter template.
