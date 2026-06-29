# workout-sheets

React + TypeScript app (Vite, run with Bun) that logs lifts straight into a Google Sheet.
No backend — auth happens in the browser via Google Identity Services, and writes go straight
to the Sheets API.

## One-time setup

1. Go to [Google Cloud Console > Credentials](https://console.cloud.google.com/apis/credentials).
2. Create an **OAuth client ID** of type **Web application**.
3. Under **Authorized JavaScript origins**, add `https://dharness.github.io` and `http://localhost:8000`.
4. Make sure the **Google Sheets API** is enabled for the project.
5. Copy the client ID into [`src/config.ts`](src/config.ts) as `CLIENT_ID`.
6. If the OAuth consent screen is in "Testing" mode, add your own Google account as a test user.

## Local dev

```
bun install
bun run dev
```

Runs at `http://localhost:8000` with hot module reload.

## Build / deploy

```
bun run build       # type-checks and builds to dist/
bun run deploy       # publishes dist/ to the gh-pages branch (requires gh-pages installed)
```

GitHub Pages serves the `gh-pages` branch at `https://dharness.github.io/workout-sheets/`.
