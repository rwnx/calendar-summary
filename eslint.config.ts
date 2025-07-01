import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import pluginJest from "eslint-plugin-jest";
import tsParser from "@typescript-eslint/parser";
import tsPlugin from "@typescript-eslint/eslint-plugin"

/** @type {import('eslint').Linter.FlatConfig[]} */
export default [
  { ignores: ["dist"] },
  // TypeScript config
  {
    files: ["src/**/*.{ts,tsx}", 'src/*.{spec,test}.{ts,tsx,js,jsx}'],
    languageOptions: {
      parser: tsParser,
      ecmaVersion: "latest",
      globals: {
        ...globals.browser,
        ...globals.node,
        ...pluginJest.environments.globals.globals
      },
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
      "@typescript-eslint": tsPlugin,
      jest: pluginJest
    },
    rules: {
      ...js.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      'jest/no-disabled-tests': 'warn',
      'jest/no-focused-tests': 'error',
      'jest/no-identical-title': 'error',
      'jest/prefer-to-have-length': 'warn',
      'jest/valid-expect': 'error',
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": ["error", { varsIgnorePattern: "^[A-Z_]" }],
      "no-restricted-imports": "off",
      "@typescript-eslint/no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "dayjs",
              message: "Use local '@/dayjs' wrapper instead of direct dayjs import",
            }
          ],
          patterns: [
            {
              group: ["dayjs/*"],
              message: "Use local '@/dayjs' wrapper instead of direct dayjs import",
            },
            {
              group: ["./*"],
              message: "use path alias @/ instead of relative imports."
            }
          ],
        }
      ]
    },
  },

  // Vite config
  {
    files: ["vite.config.js"],
    env: {
      node: true,
    },
  },
];
