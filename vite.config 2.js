import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    // Forward all /api/* requests to the Express backend during development
    proxy: {
      "/api": "http://localhost:3001",
    },
  },
});