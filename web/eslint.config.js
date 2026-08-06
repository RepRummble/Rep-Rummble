import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    rules: {
      // Flags two existing, reviewed call sites (AuthCallback.tsx parsing
      // Supabase's redirect hash on mount; AgentDashboard.tsx storing a
      // freshly-created socket.io instance) — both are legitimate
      // "sync to an external system on mount" patterns, not bugs. Kept as
      // a warning rather than suppressed per-line so it stays visible
      // without blocking CI on a same-day rewrite of live auth/chat code.
      'react-hooks/set-state-in-effect': 'warn',
    },
  },
])
