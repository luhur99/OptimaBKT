import { defineConfig } from "vite";
import dyadComponentTagger from "@dyad-sh/react-vite-component-tagger";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig(({ mode }) => ({
  server: {
    host: "0.0.0.0", // Allow access from both localhost and network
    port: 3000,
    allowedHosts: true,
  },
  plugins: [mode === "development" && dyadComponentTagger(), react()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return;
          if (id.includes("@supabase")) return "vendor-supabase";
          if (
            id.includes("/node_modules/react/") ||
            id.includes("/node_modules/react-dom/") ||
            id.includes("/node_modules/react-router")
          ) return "vendor-react";
          if (id.includes("@tanstack")) return "vendor-query";
          if (id.includes("recharts") || id.includes("/d3-")) return "vendor-charts";
          if (
            id.includes("react-hook-form") ||
            id.includes("/zod/") ||
            id.includes("@hookform")
          ) return "vendor-forms";
          if (
            id.includes("@radix-ui") ||
            id.includes("lucide-react") ||
            id.includes("class-variance-authority") ||
            id.includes("tailwind-merge") ||
            id.includes("/clsx/") ||
            id.includes("/cmdk/") ||
            id.includes("/vaul/") ||
            id.includes("/sonner/") ||
            id.includes("embla-carousel")
          ) return "vendor-ui";
          if (id.includes("date-fns")) return "vendor-utils";
          // No catch-all — let Rollup co-locate remaining packages with their importers
        },
      },
    },
  },
}));
