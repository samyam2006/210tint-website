import path from "path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    watch: {
      // Prevent Vite from watching config files that cause crash loops
      ignored: ['**/package.json', '**/vite.config.ts'],
    },
  },
});
