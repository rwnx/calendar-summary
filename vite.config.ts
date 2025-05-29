/// <reference types="vite/client" />
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { z } from "zod";

// !! Add your .env validation here
export const envSchema = z.object({
  VITE_TITLE: z.string().min(1),
});
export type Env = z.infer<typeof envSchema>;

// modify the vite's ENV globals as we validate them in defineConfig
declare global {
  interface ImportMetaEnv extends Env {}
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
    throw error; // Re-throw unknown errors
  }

  return {
    plugins: [react()],
    // ... other configurations
  };
});
