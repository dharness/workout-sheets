// Public OAuth client ID for Google Identity Services (browser token flow).
// This is not a secret — it must be registered as a "Web application" OAuth
// client in Google Cloud Console with this site's origin allow-listed under
// "Authorized JavaScript origins" (e.g. https://dharness.github.io).
const CONFIG = {
  CLIENT_ID: "REPLACE_WITH_YOUR_CLIENT_ID.apps.googleusercontent.com",
  SPREADSHEET_ID: "1euI82wFBrz3iIM5rEoQvCu5ApvBcwzEXRFIsew2zqmc",
  SCOPES: "https://www.googleapis.com/auth/spreadsheets",
};
