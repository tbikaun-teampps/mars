// Version management for MARS application
import packageJson from "../../package.json";

export const APP_VERSION = packageJson.version;
export const APP_NAME = packageJson.name;

// Helper to get version info
export function getVersionInfo() {
  const [major, minor, patch] = APP_VERSION.split(".").map(Number);

  const buildDate =
    import.meta.env.VITE_BUILD_DATE || new Date().toISOString().split("T")[0];
  const gitHash = import.meta.env.VITE_GIT_HASH || "unknown";

  return {
    version: APP_VERSION,
    major,
    minor,
    patch,
    name: APP_NAME,
    displayVersion: `${buildDate}-${gitHash}`,
    buildDate,
    gitHash,
  };
}