import React, { useState, useEffect, useTransition, Suspense, PropsWithChildren } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import App from "./App";
import { Spotify } from "./api"; // your auth/api utility
import { Music } from "lucide-react";

const api = new Spotify(
  import.meta.env.VITE_CLIENT_ID,
  import.meta.env.VITE_REDIRECT_URI
);

function useSpotifyConnect(onCodeReceived: (code: string) => void) {
  const handleConnect = () => {
    const href = api.getAuthUrl([
      "playlist-modify-public",
      "playlist-modify-private",
    ]);

    const width = 500;
    const height = 600;
    const left = window.screenX + (window.innerWidth - width) / 2;
    const top = window.screenY + (window.innerHeight - height) / 2;

    window.open(
      href,
      "SpotifyAuth",
      `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`
    );
  };
  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (
        event.data?.type === "OAUTH_CODE" &&
        typeof event.data.code === "string"
      ) {
        onCodeReceived(event.data.code);
      }
    }
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [onCodeReceived]);

  return { handleConnect };
}

const AuthProvider: React.FC<PropsWithChildren>({children}) => {
  const [authStatus, setAuthStatus] = useState<
    "loading" | "authenticated" | "unauthenticated"
  >("loading");
  const [isPending, startTransition] = useTransition();

  useSpotifyConnect(async (code) => {
    // Exchange code for token, then update auth state
    const token = await api.getAccessToken(code);
    startTransition(async () => {
      api.setToken(token.access_token)
      setAuthStatus("authenticated");
    });
  });

  useEffect(() => {
    if (api.isAuthenticated) {
      setAuthStatus("authenticated");
    } else {
      setAuthStatus("unauthenticated");
    }
  }, []);

  if (authStatus === "loading") {
    // You can replace this with a spinner or skeleton UI
    return <div>Loading authentication...</div>;
  }

  if (authStatus === "unauthenticated") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-400 via-green-500 to-gray-900 flex items-center justify-center p-6">
        <div className="bg-white rounded-xl shadow-2xl p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <Music className="w-8 h-8 text-white" />
          </div>
          <p className="text-gray-600 mb-6">
            Connect your Spotify account to create playlists
          </p>
          <button
            onClick={handle}
            className="w-full bg-green-500 hover:bg-green-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
          >
            Connect to Spotify
          </button>
        </div>
      </div>
    );
  }

  // Authenticated — render the full app
  return { children };
}

export default function Root() {
  return (
    <React.StrictMode>
      <Suspense fallback={<div>Loading app...</div>}>
        <AuthProvider />
      </Suspense>
    </React.StrictMode>
  );
}
