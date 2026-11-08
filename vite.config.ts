import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
        },
    },
    build: {
        rollupOptions: {
            output: {
                // Only vendors that are genuinely needed on first paint are
                // named here. Naming a library that is used solely by lazy
                // routes (recharts, xlsx, @dnd-kit) pulls its chunk into the
                // entry's static graph, so Vite emits a modulepreload for it
                // and the deferral is undone. Rollup already gives those
                // libraries their own async chunks automatically.
                manualChunks: {
                    react: ['react', 'react-dom', 'react-router-dom'],
                    supabase: ['@supabase/supabase-js'],
                },
            },
        },
    },
})
