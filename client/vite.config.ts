import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import tailwindcss from "@tailwindcss/vite";
import { execSync } from "child_process";

// Get build info
const getBuildInfo = () => {
  try {
    const gitHash = execSync("git rev-parse --short=8 HEAD", {
      encoding: "utf8",
    }).trim();
    const buildDate = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
    return { gitHash, buildDate };
  } catch {
    // Fallback for environments without git
    return {
      gitHash: "unknown",
      buildDate: new Date().toISOString().split("T")[0],
    };
  }
};

const { gitHash, buildDate } = getBuildInfo();

const __dirname = path.dirname(new URL(import.meta.url).pathname);

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:8000",
        changeOrigin: true,
      },
    },
  },
  define: {
    "import.meta.env.VITE_BUILD_DATE": JSON.stringify(buildDate),
    "import.meta.env.VITE_GIT_HASH": JSON.stringify(gitHash),
  },
});
