import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return undefined;

          if (id.includes("react-router-dom") || id.includes("/react-router/")) {
            return "vendor-react";
          }
          if (
            id.match(/node_modules\/(react|react-dom|scheduler|use-sync-external-store)\//)
          ) {
            return "vendor-react";
          }
          if (id.includes("@radix-ui/")) return "vendor-radix";
          if (id.includes("recharts") || id.includes("/d3-") || id.includes("victory-vendor")) {
            return "vendor-charts";
          }
          if (id.includes("date-fns")) return "vendor-utils";
          if (id.includes("lucide-react")) return "vendor-icons";
          if (id.includes("@supabase/")) return "vendor-supabase";
          if (id.includes("@tanstack/")) return "vendor-tanstack";

          return undefined;
        },
      },
    },
  },
}));
