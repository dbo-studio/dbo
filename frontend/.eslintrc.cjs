module.exports = {
  settings: {
    react: {
      version: 'detect'
    }
  },
  parser: '@typescript-eslint/parser',
  env: {
    browser: true,
    es2021: true,
    node: true
  },
  extends: [
    'plugin:react/recommended',
    'eslint:recommended',
    'plugin:@typescript-eslint/eslint-recommended',
    'plugin:@typescript-eslint/recommended',
    'prettier',
    'plugin:react/jsx-runtime',
    'plugin:prettier/recommended'
  ],
  root: true,
  rules: {
    'consistent-return': ['error', { treatUndefinedAsUnspecified: false }],
    indent: 0,
    'no-else-return': 1,
    semi: [1, 'always'],
    'space-unary-ops': 2,
    'react/prop-types': 0,
    'react/display-name': 'off',
    'prettier/prettier': 'error',
    'arrow-body-style': 'off',
    'prefer-arrow-callback': 'off',
    '@typescript-eslint/no-explicit-any': 0,
    'no-restricted-imports': [
      'error',
      {
        patterns: ['@mui/*/*/*']
      }
    ]
  },
  plugins: ['react', 'prettier', '@typescript-eslint'],

  parserOptions: {
    ecmaFeatures: {
      jsx: true
    },
    ecmaVersion: 12,
    sourceType: 'module'
  }
};
