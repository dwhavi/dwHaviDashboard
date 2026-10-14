import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['api/**/*.js', 'lib/**/*.js', 'test/**/*.js', 'scripts/**/*.js'],
    languageOptions: {
      globals: globals.node,
    },
  },
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    rules: {
      'no-unused-vars': ['error', { varsIgnorePattern: '^[A-Z_]' }],
    },
  },
  {
    // V1 잔재(미사용) + vite dev 미들웨어: 린트 면제 (마지막에 두어 override)
    files: ['lib/store.js', 'lib/init-db.js', 'lib/auth.js', 'vite.config.js'],
    languageOptions: {
      globals: globals.node,
    },
    rules: {
      'no-unused-vars': 'off',
      'no-undef': 'off',
    },
  },
])
