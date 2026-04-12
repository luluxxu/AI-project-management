import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // Open system default browser on dev start (terminal link clicks often open Cursor’s embedded Simple Browser instead)
    open: true,
    // Forward all /api/* requests to the Express backend during development
    proxy: {
      "/api": "http://localhost:3001",
    },
  },
});