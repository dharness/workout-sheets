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
    tokenClientRef.current = window.google.accounts.oauth2.initTokenClient({
      client_id: CONFIG.CLIENT_ID,
      scope: CONFIG.SCOPES,
      callback: (response) => {
        if (response.error) {
          console.error("Sign-in error:", response.error);
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
