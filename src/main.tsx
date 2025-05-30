// index.tsx (or index.js)
import React from "react";
import ReactDOM from "react-dom/client";
import "./dayjs-extensions";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import App from "./App";
import dayjs from "dayjs";
import "./main.css";
import queryString from "query-string";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: dayjs.duration({ minutes: 5 }).asMilliseconds(),
      refetchOnWindowFocus: false,
    },
  },
});

const root = document.getElementById("root");
if (!root) {
  throw new Error("missing #root");
}

// Check for OAuth authorization_code
const parsed = queryString.parse(window.location.search);
const code = parsed.authorization_code as string | undefined;

// Check if this window is a popup
const isPopup = window.opener && window.opener !== window;

// If this is a popup and has an authorization_code, send it to the opener and close
if (isPopup) {
  if (code) {
    window.opener.postMessage({ type: "OAUTH_CODE", code }, "*");
  } else {
    window.opener.postMessage(
      { type: "OAUTH_ERROR", error: "Missing authorization_code" },
      "*"
    );
  }
  window.close();
} else {
  // This is a regular window — render the app
  ReactDOM.createRoot(root).render(
    <React.StrictMode>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </React.StrictMode>
  );
}
