import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  envPrefix: ["VITE_", "NEXT_PUBLIC_"],
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (!id.includes("node_modules")) return;

          const [, pkgPath] = id.split(/node_modules[\\/]/);
          if (!pkgPath) return;

          const parts = pkgPath.split(/[\\/]/);
          const packageName = parts[0]?.startsWith("@") ? `${parts[0]}/${parts[1]}` : parts[0];
          if (!packageName) return;

          return `vendor_${packageName.replace(/^@/, "").replace("/", "_")}`;
        },
      },
    },
  },
}));
