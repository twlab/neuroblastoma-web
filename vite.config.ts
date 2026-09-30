import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

/**
 * BASE_PATH controls the public path of the built site (see DEPLOY.md).
 *   - custom domain / root:                            "" or "/"          -> "/"
 *   - project page https://twlab.github.io/<repo>/:    "/<repo>"          -> "/<repo>/"
 * The GitHub Actions workflow supplies it from actions/configure-pages, which
 * reports the value without a trailing slash; Vite wants both slashes.
 */
function normaliseBase(value: string | undefined): string {
  const trimmed = (value ?? "").trim().replace(/^\/+|\/+$/g, "");
  return trimmed ? `/${trimmed}/` : "/";
}

export default defineConfig({
  base: normaliseBase(process.env.BASE_PATH),
  plugins: [react()],
  define: {
    // Same shims the upstream WashU browser build uses; some transitive
    // dependencies of wuepgg reference Node globals at runtime.
    global: "globalThis",
    "process.env": "{}",
  },
  build: {
    // wuepgg ships a single very large chunk; the default warning is just noise.
    chunkSizeWarningLimit: 30000,
  },
});
