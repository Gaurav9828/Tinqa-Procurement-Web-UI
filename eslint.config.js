import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import sonarjs from 'eslint-plugin-sonarjs'
import security from 'eslint-plugin-security'
import noUnsanitized from 'eslint-plugin-no-unsanitized'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist', 'coverage', 'reports']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
      // Sonar's own open-source JS/TS rules (bugs, code smells, security hotspots) + XSS/injection checks
      sonarjs.configs.recommended,
      security.configs.recommended,
      noUnsanitized.configs.recommended,
    ],
    languageOptions: {
      globals: globals.browser,
    },
    rules: {
      // Object[key] lookups are everywhere in typed TS code; this rule is almost all false positives
      'security/detect-object-injection': 'off',
      // Flags safe patterns like /^\d+(\.\d{1,2})?$/; sonarjs/super-linear-regex catches real ReDoS more precisely
      'security/detect-unsafe-regex': 'off',
      // Duplicates @typescript-eslint/no-unused-vars
      'sonarjs/no-unused-vars': 'off',
      'sonarjs/todo-tag': 'warn',
    },
  },
  {
    // Tests may use fixtures that look like secrets, pseudo-random data and nested describe callbacks
    files: ['**/*.test.{ts,tsx}', 'src/test/**'],
    rules: {
      'sonarjs/no-hardcoded-passwords': 'off',
      'sonarjs/pseudo-random': 'off',
      'sonarjs/no-nested-functions': 'off',
      'sonarjs/no-duplicate-string': 'off',
    },
  },
])
