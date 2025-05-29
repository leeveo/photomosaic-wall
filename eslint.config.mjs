// eslint.config.mjs
import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

export default [
  ...compat.extends(
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:react/recommended",
    "plugin:react-hooks/recommended",
    "plugin:jsx-a11y/recommended",
    "next/core-web-vitals",
    "next"
  ),
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      parser: "@typescript-eslint/parser",
      parserOptions: {
        project: "./tsconfig.json",
        tsconfigRootDir: __dirname,
      },
    },
    rules: {
      // Supprimer les variables inutilisées
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],

      // Sécurité useEffect
      "react-hooks/exhaustive-deps": "warn",

      // Préférer l’auto import de React (si applicable)
      "react/react-in-jsx-scope": "off",

      // Interdire `any`
      "@typescript-eslint/no-explicit-any": "warn",

      // Propreté du JSX
      "react/jsx-key": "warn",

      // Prévenir les effets SSR dangereux
      "no-restricted-globals": ["warn", "window"],

      // Adapté au style Tailwind / Next.js
      "jsx-a11y/alt-text": "warn",
      "jsx-a11y/anchor-is-valid": "warn"
    },
  },
];
