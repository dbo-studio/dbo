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
    // Design-system guardrail: colors and type sizes come from the theme (palette, typography variants), not literals.
    files: ['src/**/*.{ts,tsx}'],
    ignores: ['src/core/theme/**', 'src/**/editorConfig.ts'], // Monaco takes numeric px font sizes
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: 'Literal[value=/#[0-9a-fA-F]{3,8}\\b|\\brgba?\\(|\\bhsla?\\(/]',
          message: 'Use a theme palette token (theme.palette.*, alpha()) instead of a hardcoded color.'
        },
        {
          selector: 'TemplateElement[value.raw=/#[0-9a-fA-F]{3,8}\\b|\\brgba?\\(|\\bhsla?\\(/]',
          message: 'Use a theme palette token (theme.palette.*, alpha()) instead of a hardcoded color.'
        },
        {
          selector: "Property[key.name='fontSize'][value.type='Literal'][value.raw=/^['\"]?[\\d.]+(px|rem)?['\"]?$/]",
          message: 'Use a typography variant or theme.typography.* instead of a literal fontSize.'
        }
      ]
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
