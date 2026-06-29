// Minimal type declarations for the Google Identity Services script
// (https://accounts.google.com/gsi/client), loaded via a <script> tag in
// index.html. Only covers the token-client surface this app uses.
declare namespace google.accounts.oauth2 {
  interface TokenResponse {
    access_token: string;
    expires_in: number;
    error?: string;
  }

  interface TokenClientConfig {
    client_id: string;
    scope: string;
    callback: (response: TokenResponse) => void;
  }

  interface TokenClient {
    requestAccessToken(): void;
  }

  function initTokenClient(config: TokenClientConfig): TokenClient;
}

interface Window {
  google: typeof google;
}
