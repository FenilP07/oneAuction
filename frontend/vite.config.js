import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    allowedHosts: [
      "localhost",
      "4e8b4fafd5b6.ngrok-free.app", // Your ngrok frontend URL
    ],
    // Add this to handle client-side routing
    historyApiFallback: true,
  },
});