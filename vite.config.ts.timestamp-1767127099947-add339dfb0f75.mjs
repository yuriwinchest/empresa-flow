// vite.config.ts
import { defineConfig } from "file:///D:/TATITA/empresa-flow/node_modules/vite/dist/node/index.js";
import react from "file:///D:/TATITA/empresa-flow/node_modules/@vitejs/plugin-react-swc/index.js";
import path from "path";
import { componentTagger } from "file:///D:/TATITA/empresa-flow/node_modules/lovable-tagger/dist/index.js";
var __vite_injected_original_dirname = "D:\\TATITA\\empresa-flow";
var vite_config_default = defineConfig(({ mode }) => ({
  envPrefix: ["VITE_", "NEXT_PUBLIC_"],
  server: {
    host: "::",
    port: 8080
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__vite_injected_original_dirname, "./src")
    }
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
        }
      }
    }
  }
}));
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJEOlxcXFxUQVRJVEFcXFxcZW1wcmVzYS1mbG93XCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCJEOlxcXFxUQVRJVEFcXFxcZW1wcmVzYS1mbG93XFxcXHZpdGUuY29uZmlnLnRzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9EOi9UQVRJVEEvZW1wcmVzYS1mbG93L3ZpdGUuY29uZmlnLnRzXCI7aW1wb3J0IHsgZGVmaW5lQ29uZmlnIH0gZnJvbSBcInZpdGVcIjtcclxuaW1wb3J0IHJlYWN0IGZyb20gXCJAdml0ZWpzL3BsdWdpbi1yZWFjdC1zd2NcIjtcclxuaW1wb3J0IHBhdGggZnJvbSBcInBhdGhcIjtcclxuaW1wb3J0IHsgY29tcG9uZW50VGFnZ2VyIH0gZnJvbSBcImxvdmFibGUtdGFnZ2VyXCI7XHJcblxyXG4vLyBodHRwczovL3ZpdGVqcy5kZXYvY29uZmlnL1xyXG5leHBvcnQgZGVmYXVsdCBkZWZpbmVDb25maWcoKHsgbW9kZSB9KSA9PiAoe1xyXG4gIGVudlByZWZpeDogW1wiVklURV9cIiwgXCJORVhUX1BVQkxJQ19cIl0sXHJcbiAgc2VydmVyOiB7XHJcbiAgICBob3N0OiBcIjo6XCIsXHJcbiAgICBwb3J0OiA4MDgwLFxyXG4gIH0sXHJcbiAgcGx1Z2luczogW3JlYWN0KCksIG1vZGUgPT09IFwiZGV2ZWxvcG1lbnRcIiAmJiBjb21wb25lbnRUYWdnZXIoKV0uZmlsdGVyKEJvb2xlYW4pLFxyXG4gIHJlc29sdmU6IHtcclxuICAgIGFsaWFzOiB7XHJcbiAgICAgIFwiQFwiOiBwYXRoLnJlc29sdmUoX19kaXJuYW1lLCBcIi4vc3JjXCIpLFxyXG4gICAgfSxcclxuICB9LFxyXG4gIGJ1aWxkOiB7XHJcbiAgICByb2xsdXBPcHRpb25zOiB7XHJcbiAgICAgIG91dHB1dDoge1xyXG4gICAgICAgIG1hbnVhbENodW5rczogKGlkKSA9PiB7XHJcbiAgICAgICAgICBpZiAoIWlkLmluY2x1ZGVzKFwibm9kZV9tb2R1bGVzXCIpKSByZXR1cm47XHJcblxyXG4gICAgICAgICAgY29uc3QgWywgcGtnUGF0aF0gPSBpZC5zcGxpdCgvbm9kZV9tb2R1bGVzW1xcXFwvXS8pO1xyXG4gICAgICAgICAgaWYgKCFwa2dQYXRoKSByZXR1cm47XHJcblxyXG4gICAgICAgICAgY29uc3QgcGFydHMgPSBwa2dQYXRoLnNwbGl0KC9bXFxcXC9dLyk7XHJcbiAgICAgICAgICBjb25zdCBwYWNrYWdlTmFtZSA9IHBhcnRzWzBdPy5zdGFydHNXaXRoKFwiQFwiKSA/IGAke3BhcnRzWzBdfS8ke3BhcnRzWzFdfWAgOiBwYXJ0c1swXTtcclxuICAgICAgICAgIGlmICghcGFja2FnZU5hbWUpIHJldHVybjtcclxuXHJcbiAgICAgICAgICByZXR1cm4gYHZlbmRvcl8ke3BhY2thZ2VOYW1lLnJlcGxhY2UoL15ALywgXCJcIikucmVwbGFjZShcIi9cIiwgXCJfXCIpfWA7XHJcbiAgICAgICAgfSxcclxuICAgICAgfSxcclxuICAgIH0sXHJcbiAgfSxcclxufSkpO1xyXG4iXSwKICAibWFwcGluZ3MiOiAiO0FBQTBQLFNBQVMsb0JBQW9CO0FBQ3ZSLE9BQU8sV0FBVztBQUNsQixPQUFPLFVBQVU7QUFDakIsU0FBUyx1QkFBdUI7QUFIaEMsSUFBTSxtQ0FBbUM7QUFNekMsSUFBTyxzQkFBUSxhQUFhLENBQUMsRUFBRSxLQUFLLE9BQU87QUFBQSxFQUN6QyxXQUFXLENBQUMsU0FBUyxjQUFjO0FBQUEsRUFDbkMsUUFBUTtBQUFBLElBQ04sTUFBTTtBQUFBLElBQ04sTUFBTTtBQUFBLEVBQ1I7QUFBQSxFQUNBLFNBQVMsQ0FBQyxNQUFNLEdBQUcsU0FBUyxpQkFBaUIsZ0JBQWdCLENBQUMsRUFBRSxPQUFPLE9BQU87QUFBQSxFQUM5RSxTQUFTO0FBQUEsSUFDUCxPQUFPO0FBQUEsTUFDTCxLQUFLLEtBQUssUUFBUSxrQ0FBVyxPQUFPO0FBQUEsSUFDdEM7QUFBQSxFQUNGO0FBQUEsRUFDQSxPQUFPO0FBQUEsSUFDTCxlQUFlO0FBQUEsTUFDYixRQUFRO0FBQUEsUUFDTixjQUFjLENBQUMsT0FBTztBQUNwQixjQUFJLENBQUMsR0FBRyxTQUFTLGNBQWMsRUFBRztBQUVsQyxnQkFBTSxDQUFDLEVBQUUsT0FBTyxJQUFJLEdBQUcsTUFBTSxtQkFBbUI7QUFDaEQsY0FBSSxDQUFDLFFBQVM7QUFFZCxnQkFBTSxRQUFRLFFBQVEsTUFBTSxPQUFPO0FBQ25DLGdCQUFNLGNBQWMsTUFBTSxDQUFDLEdBQUcsV0FBVyxHQUFHLElBQUksR0FBRyxNQUFNLENBQUMsQ0FBQyxJQUFJLE1BQU0sQ0FBQyxDQUFDLEtBQUssTUFBTSxDQUFDO0FBQ25GLGNBQUksQ0FBQyxZQUFhO0FBRWxCLGlCQUFPLFVBQVUsWUFBWSxRQUFRLE1BQU0sRUFBRSxFQUFFLFFBQVEsS0FBSyxHQUFHLENBQUM7QUFBQSxRQUNsRTtBQUFBLE1BQ0Y7QUFBQSxJQUNGO0FBQUEsRUFDRjtBQUNGLEVBQUU7IiwKICAibmFtZXMiOiBbXQp9Cg==
