import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
<<<<<<< HEAD
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
=======

export default defineConfig({
  plugins: [react()],
>>>>>>> f230ff4d41077ea9e3a32311e6cbac8c8bb22f66
  server: {
    // Forward all /api/* requests to the Express backend during development
    proxy: {
      "/api": "http://localhost:3001",
    },
  },
});