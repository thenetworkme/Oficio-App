import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Designer's reference mockups/screenshots, not part of the app bundle.
    "design-reference/**",
    // Hand-written service worker, plain JS running outside the TS project.
    "public/sw.js",
  ]),
]);

export default eslintConfig;
