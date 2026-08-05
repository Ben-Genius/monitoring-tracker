module.exports = {
    root: true,
    env: { browser: true, es2020: true, node: true },
    extends: [
        'eslint:recommended',
        'plugin:@typescript-eslint/recommended',
        'plugin:react-hooks/recommended',
    ],
    ignorePatterns: ['dist', 'node_modules', '.eslintrc.cjs', 'supabase', 'scripts'],
    parser: '@typescript-eslint/parser',
    parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
    },
    plugins: ['react-refresh'],
    rules: {
        'react-refresh/only-export-components': [
            'warn',
            { allowConstantExport: true },
        ],
        // Unused variables are the main signal we want here, but an underscore
        // prefix is the conventional opt-out for deliberately ignored args.
        '@typescript-eslint/no-unused-vars': [
            'warn',
            { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
        ],
        // 55 pre-existing occurrences, mostly untyped Supabase results and
        // `catch (err: any)`. Downgraded to a warning so that genuine errors
        // are not buried, and capped by --max-warnings in the lint script so
        // the count can only go down.
        '@typescript-eslint/no-explicit-any': 'warn',
    },
};
