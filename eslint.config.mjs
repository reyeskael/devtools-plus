import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import eslintConfigPrettier from 'eslint-config-prettier';

export default tseslint.config(
	{
		ignores: ['dist/**', 'node_modules/**', '.yarn/**'],
	},
	js.configs.recommended,
	...tseslint.configs.recommended,
	react.configs.flat.recommended,
	react.configs.flat['jsx-runtime'],
	reactHooks.configs.flat['recommended-latest'],
	{
		languageOptions: {
			globals: {
				chrome: 'readonly',
			},
		},
		settings: {
			react: {
				version: 'detect',
			},
		},
	},
	{
		files: ['**/*.test.{ts,tsx}', 'jest.setup.ts'],
		languageOptions: {
			globals: {
				describe: 'readonly',
				it: 'readonly',
				test: 'readonly',
				expect: 'readonly',
				jest: 'readonly',
			},
		},
	},
	{
		files: ['*.cjs'],
		languageOptions: {
			globals: {
				module: 'readonly',
				require: 'readonly',
			},
		},
	},
	eslintConfigPrettier,
);
