# Todoist Chore Board Web UI

This package contains the React SPA that powers the Todoist chore board Home Assistant add-on. It is bundled with Vite for production and can connect directly to a running Home Assistant instance during development.

## Development Workflows

From this directory: `cd addon-todoist-chore-board/web-ui`.

### 1. Connecting to a Home Assistant instance

When you do want to target a live Home Assistant server, supply the base URL and an optional long-lived access token (LLAT):

```sh
VITE_HOME_ASSISTANT_URL="https://homeassistant.local:8123" \
VITE_HOME_ASSISTANT_TOKEN="<LLAT>" \
VITE_TODOIST_SENSORS="sensor.todoist_hari_chores,sensor.todoist_simona_chores" \
npm run dev
```

- If both values are supplied the UI skips the login redirect loop.
- If only `VITE_HOME_ASSISTANT_URL` is provided you will be prompted through the standard auth flow.
- Provide `VITE_TODOIST_SENSORS` as a comma-separated list matching the sensor IDs configured in Home Assistant. Without it, the dev server shows the “No sensors configured” placeholder.

## Building for the add-on bundle

```sh
npm run build
```

The compiled assets are emitted to `dist/` and copied into the add-on container during build.

## Project Structure Highlights

- `src/hass.js` – manages Home Assistant authentication/connection reuse for both ingress and local development.
- `src/main.jsx` – seeds `window.ADDON_CONFIG` during development using `VITE_TODOIST_SENSORS`.
- `run.sh` (root add-on dir) injects configured sensor IDs into the served `index.html`.
