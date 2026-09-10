import eslintReact from '@eslint-react/eslint-plugin';
import js from '@eslint/js';
import pluginQuery from '@tanstack/eslint-plugin-query';
import reactCompiler from 'eslint-plugin-react-compiler';
import reactHooks from 'eslint-plugin-react-hooks';
import { defineConfig } from 'eslint/config';
import globals from 'globals';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import tseslint from 'typescript-eslint';

const tsconfigRootDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig([
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/.next/**',
      '**/coverage/**',
      '**/*.min.js',
      '**/*.bundle.js'
    ]
  },
  {
    files: ['**/*.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    extends: [
      js.configs.recommended,
      ...tseslint.configs.recommendedTypeChecked,
      eslintReact.configs['recommended-typescript'],
      ...pluginQuery.configs['flat/recommended']
    ],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        projectService: true,
        tsconfigRootDir
      },
      globals: globals.browser
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-compiler': reactCompiler
    },
    rules: {
      'no-console': ['error', { allow: ['error'] }],
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      'react-compiler/react-compiler': 'warn'
    }
  },
  {
    files: ['src/components/base/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/components/common/**', '@/components/common'],
              message: 'base must not import common — move shared UI to base or import from hooks/store/api/core.'
            }
          ]
        }
      ]
    }
  },
  {
    files: ['src/routes/**/*.{ts,tsx}'],
    ignores: ['src/routes/index.tsx'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/routes/**'],
              message: 'routes must not import other routes — extract shared logic to hooks, store, or common.'
            },
            {
              group: ['@/components/layout/**'],
              message: 'routes should compose layout at the router level, not import layout internals.'
            }
          ]
        }
      ]
    }
  }
]);
