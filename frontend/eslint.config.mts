import js from "@eslint/js";
import pluginQuery from '@tanstack/eslint-plugin-query';
import pluginReact from "eslint-plugin-react";
import reactCompiler from "eslint-plugin-react-compiler";
import reactHooks from 'eslint-plugin-react-hooks';
import { defineConfig } from "eslint/config";
import globals from "globals";
import tseslint from "typescript-eslint";

export default defineConfig([
  {
    settings: {
      react: {
        version: "19.2.0"
      }
    },
    files: ["**/*.{js,mjs,cjs,ts,mts,cts,jsx,tsx}"],
    plugins: { js },
    extends: ["js/recommended", "plugin:react/jsx-runtime"],
    languageOptions: { globals: globals.browser },
    rules: {
      "react/react-in-jsx-scope": "off"
    }
  },
  tseslint.configs.recommended,
  pluginReact.configs.flat.recommended,
  reactCompiler.configs.recommended,
  reactHooks.configs["recommended-latest"],
  ...pluginQuery.configs['flat/recommended']
]);
