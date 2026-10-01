import { useEffect, useRef, useState } from "react";
import { CONFIG } from "./config";

const TOKEN_STORAGE_KEY = "workout-sheets:token";

interface StoredToken {
  accessToken: string;
  expiresAt: number;
}

function loadStoredToken(): string | null {
  const raw = localStorage.getItem(TOKEN_STORAGE_KEY);
  if (!raw) return null;

  try {
    const saved: StoredToken = JSON.parse(raw);
    if (!saved.accessToken || Date.now() >= saved.expiresAt) {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
      return null;
    }
    return saved.accessToken;
  } catch {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    return null;
  }
}

export function useGoogleAuth() {
  const [accessToken, setAccessToken] = useState<string | null>(loadStoredToken);
  const tokenClientRef = useRef<google.accounts.oauth2.TokenClient | null>(null);

  useEffect(() => {
    const initClient = () => {
      tokenClientRef.current = window.google.accounts.oauth2.initTokenClient({
        client_id: CONFIG.CLIENT_ID,
        scope: CONFIG.SCOPES,
        callback: (response) => {
          if (response.error) {
            // 'user_cancel' and similar non-fatal errors just mean silent refresh
            // failed — user will see the sign-in button and can click it manually.
            return;
          }
          localStorage.setItem(
            TOKEN_STORAGE_KEY,
            JSON.stringify({
              accessToken: response.access_token,
              expiresAt: Date.now() + response.expires_in * 1000,
            } satisfies StoredToken),
          );
          setAccessToken(response.access_token);
        },
      });

      // If no valid stored token, try a silent refresh. If the user's Google
      // session is still alive this returns a new token with no popup — they
      // won't even know their old token expired. prompt:'none' means fail
      // silently (callback gets response.error) rather than showing any UI.
      if (!loadStoredToken()) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (tokenClientRef.current as any).requestAccessToken({ prompt: "none" });
      }
    };

    if (window.google?.accounts?.oauth2) {
      initClient();
      return;
    }

    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.onload = initClient;
    document.head.appendChild(script);
    return () => {
      document.head.removeChild(script);
    };
  }, []);

  const signIn = () => {
    tokenClientRef.current?.requestAccessToken();
  };

  const signOut = () => {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    setAccessToken(null);
  };

  return { accessToken, signIn, signOut };
}
