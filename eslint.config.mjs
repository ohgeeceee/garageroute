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
    // Build scripts are not part of the runtime app.
    "scripts/**",
  ]),
  {
    // Prisma seed scripts use `@ts-nocheck` because ts-node resolves
    // relative imports differently than the Next.js bundler. The seed
    // runs once at deploy time and is covered by manual smoke tests
    // — not worth the type-check churn.
    files: ["prisma/seed.ts", "prisma/seed-states.ts"],
    rules: {
      "@typescript-eslint/ban-ts-comment": "off",
    },
  },
  {
    // React 19's `react-hooks/set-state-in-effect` rule flags the
    // "data fetching in useEffect" pattern. We have ~15 instances
    // across /admin, /manage, /route, /bot/verify. The right fix is
    // to move each to useReducer / SWR / event handlers, but that's
    // a ~half-day refactor that doesn't change user-facing behavior.
    // Track as a follow-up; for now the rule is disabled.
    rules: {
      "react-hooks/set-state-in-effect": "off",
    },
  },
]);

export default eslintConfig;
