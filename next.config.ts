import type { NextConfig } from "next";

/**
 * The existing agent sources use explicit ESM `.js` import suffixes
 * (e.g. `../intents/classify.js` for `classify.ts`). Map them so webpack
 * resolves to the TypeScript sources. No agent code is changed.
 */
const nextConfig: NextConfig = {
  // Native/large server-only deps: require at runtime, never bundle.
  // The route only exercises the lexical path unless a LanceDB index exists,
  // but the import chain references these modules, so keep them external.
  serverExternalPackages: ["@lancedb/lancedb", "@xenova/transformers"],
  webpack: (config) => {
    config.resolve.extensionAlias = {
      ".js": [".ts", ".tsx", ".js"],
      ".jsx": [".tsx", ".jsx"],
    };
    return config;
  },
};

export default nextConfig;
