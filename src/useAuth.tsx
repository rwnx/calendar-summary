import { useState, useEffect } from "react";
import { useGoogleLogin } from "@react-oauth/google";
import { TOKEN_STORAGE_KEY } from "./constants";

interface TokenData {
  access_token: string;
  expires_at: number;
}

export function useAuth() {
  const [tokenData, setTokenData] = useState<TokenData | null>(() => {
    const storedToken = localStorage.getItem(TOKEN_STORAGE_KEY);
    if (!storedToken) return null;

    try {
      const parsed = JSON.parse(storedToken) as TokenData;
      if (parsed.expires_at < Date.now()) {
        localStorage.removeItem(TOKEN_STORAGE_KEY);
        return null;
      }
      return parsed;
    } catch {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
      return null;
    }
  });

  const [error, setError] = useState<string | null>(null);

  // Set up Google login
  const login = useGoogleLogin({
    onSuccess: (codeResponse) => {
      setTokenData({
        access_token: codeResponse.access_token,
        expires_at: Date.now() + codeResponse.expires_in * 1000,
      });
    },
    onError: (errorResponse) => {
      console.error("Login Failed:", errorResponse);
      setError("Login failed. Please try again.");
      localStorage.removeItem(TOKEN_STORAGE_KEY);
    },
    scope: "https://www.googleapis.com/auth/calendar.readonly",
  });

  const handleLogout = () => {
    setTokenData(null);
  };

  // Store token in localStorage when it changes
  useEffect(() => {
    if (tokenData) {
      localStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify(tokenData));
    } else {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
    }
  }, [tokenData]);

  return {
    tokenData,
    error,
    login,
    handleLogout,
  };
}
