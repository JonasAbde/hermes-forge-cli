import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: ['dist/**', 'node_modules/**'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['src/**/*.ts', 'tests/**/*.ts'],
    languageOptions: {
      parserOptions: {
        project: false,
      },
    },
    rules: {
      'no-unused-vars': 'off',
      'no-useless-escape': 'error',
      'prefer-const': 'error',
      'preserve-caught-error': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-require-imports': 'error',
      '@typescript-eslint/no-unused-vars': 'off',
    },
  },
  {
    files: [
      'src/lib/configManager.ts',
      'src/lib/envManager.ts',
      'src/lib/processTracker.ts',
      'src/lib/lockManager.ts',
      'src/lib/healthCheck.ts',
      'src/lib/ciMode.ts',
      'src/commands/env.ts',
      'src/commands/config.ts',
      'src/commands/open.ts',
      'src/commands/docs.ts',
    ],
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
    },
  },
  // Override for completion.ts which contains shell scripts with escaped $ signs
  {
    files: ['src/commands/completion.ts'],
    rules: {
      'no-useless-escape': 'off',
    },
  }
);
