import React from "react";
import ReactDOM from "react-dom/client";
import "./dayjs-extensions";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import App from "./App";
import dayjs from "dayjs";
import "./main.css"

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: dayjs.duration({minutes: 5}).asMilliseconds(),
      refetchOnWindowFocus: false,
    },
  },
});
const root = document.getElementById("root");

if (!root) {
  throw new Error("missing #root");
}

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
        <App />
    </QueryClientProvider>
  </React.StrictMode>
);
