import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime"],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return;
          if (id.includes("@supabase")) return "supabase";
          if (id.includes("@radix-ui")) return "radix-ui";
          if (id.includes("lucide-react")) return "lucide";
          if (id.includes("react-router")) return "react-router";
          if (
            id.includes("jspdf") ||
            id.includes("html2canvas") ||
            id.includes("canvg") ||
            id.includes("dompurify") ||
            id.includes("/purify") ||
            id.includes("fflate")
          ) {
            return "pdf";
          }
        },
      },
    },
  },
});
