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
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return undefined;

          // NOTE: Avoid splitting libraries that have circular intra-package
          // imports (recharts, d3-*, victory-vendor) into their own chunk —
          // doing so reorders module init and triggers a TDZ
          // "Cannot access 'X' before initialization" at runtime. Let Rollup
          // place them in the chunk that imports them.
          if (id.includes("react-router-dom") || id.includes("/react-router/")) {
            return "vendor-react";
          }
          if (
            id.match(/node_modules\/(react|react-dom|scheduler|use-sync-external-store)\//)
          ) {
            return "vendor-react";
          }
          if (id.includes("@radix-ui/")) return "vendor-radix";
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
