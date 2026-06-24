# workout-sheets

Static, client-only app that adds a new (empty) tab to a Google Sheet. No backend — auth happens
in the browser via Google Identity Services, and writes go straight to the Sheets API.

## One-time setup

1. Go to [Google Cloud Console > Credentials](https://console.cloud.google.com/apis/credentials).
2. Create an **OAuth client ID** of type **Web application**.
3. Under **Authorized JavaScript origins**, add `https://dharness.github.io`.
4. Make sure the **Google Sheets API** is enabled for the project.
5. Copy the client ID into [`config.js`](config.js) as `CLIENT_ID`.
6. If the OAuth consent screen is in "Testing" mode, add your own Google account as a test user.

## Local dev

Serve the folder over HTTP (Google Identity Services won't run from `file://`):

```
python3 -m http.server 8000
```

Then add `http://localhost:8000` to the same OAuth client's Authorized JavaScript origins.

## Deploy

Pushes to `main` are served by GitHub Pages at `https://dharness.github.io/workout-sheets/`.
