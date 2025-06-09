import React from "react";
import ReactDOM from "react-dom/client";
import "./dayjs";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { GoogleOAuthProvider } from "@react-oauth/google";
import App from "./App";
import "./index.css";

const queryClient = new QueryClient();
const root = document.getElementById("root");

if (!root) {
  throw new Error("missing #root");
}

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}>
        <App />
      </GoogleOAuthProvider>
    </QueryClientProvider>
  </React.StrictMode>
);
