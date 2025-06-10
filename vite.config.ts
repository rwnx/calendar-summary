/// <reference types="vite/client" />
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { z } from "zod";
import * as path from "path";

export const envSchema = z.object({
  VITE_GOOGLE_CLIENT_ID: z.string().min(1),
});
export type Env = z.infer<typeof envSchema>;

// modify the vite's ENV globals as we validate them in defineConfig
declare global {
  interface ImportMetaEnv extends z.infer<typeof envSchema> { }
  interface ViteTypeOptions {
    strictImportMetaEnv: unknown; // disallow unknown keys
  }
}

export default defineConfig(({ mode }) => {
  try {
    envSchema.parse(loadEnv(mode, process.cwd(), ""));
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors = error.errors.map((err) => ({
        path: err.path.join("."),
        message: err.message,
      }));
      console.error("❌ Problem with environment variables:");
      errors.forEach((err) => console.error(`  ${err.path}: ${err.message}`));
      process.exit(1);
    }
    throw error;
  }

  return {
    plugins: [react()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src")
      }
    },
    server: {
      port: 5173,
      open: true
    },
    build: {
      outDir: "dist",
      emptyOutDir: true,
      sourcemap: true
    },
    test: {
      globals: true,
      environment: "jsdom",
      setupFiles: "./src/setupTests.ts",
      coverage: {
        reporter: ["text", "json", "html"]
      }
    }
  };
});
