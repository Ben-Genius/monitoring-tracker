import { defineConfig, type Connect } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

/**
 * Two pages: index.html is the public landing page (plain HTML, no app code)
 * and app.html is the app shell. Vercel serves "/" from index.html and
 * rewrites every other route to app.html (vercel.json); this does the same
 * for `vite` and `vite preview`.
 */
/** Plain HTML pages served at clean URLs (vercel.json does the same). */
const STATIC_PAGES = new Set(['/privacy', '/terms']);

const appShellRoutes: Connect.NextHandleFunction = (req, _res, next) => {
    const url = req.url ?? '/';
    const path = url.split('?')[0];
    if (STATIC_PAGES.has(path)) { req.url = path + '.html' + url.slice(path.length); next(); return; }
    const isAppRoute = req.method === 'GET' && path !== '/' && !path.includes('.')
        && !/^\/(@|api\/|ingest\/|src\/|node_modules\/|assets\/)/.test(path);
    if (isAppRoute) req.url = '/app.html' + url.slice(path.length);
    next();
};

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [
        react(),
        {
            name: 'app-shell-routes',
            configureServer: server => { server.middlewares.use(appShellRoutes); },
            configurePreviewServer: server => { server.middlewares.use(appShellRoutes); },
        },
    ],
    define: {
        // Versions the service worker (see public/sw.js): each build gets a fresh cache.
        __BUILD_ID__: JSON.stringify(Date.now().toString(36)),
    },
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
        },
    },
    server: {
        // Same /ingest route as production (vercel.json), for PostHog in dev.
        proxy: {
            '/ingest/static': { target: 'https://eu-assets.i.posthog.com', changeOrigin: true, rewrite: p => p.replace(/^\/ingest/, '') },
            '/ingest': { target: 'https://eu.i.posthog.com', changeOrigin: true, rewrite: p => p.replace(/^\/ingest/, '') },
        },
    },
    build: {
        rollupOptions: {
            input: {
                index: path.resolve(__dirname, 'index.html'),
                app: path.resolve(__dirname, 'app.html'),
                privacy: path.resolve(__dirname, 'privacy.html'),
                terms: path.resolve(__dirname, 'terms.html'),
            },
            output: {
                // Only vendors that are genuinely needed on first paint are
                // named here. Naming a library that is used solely by lazy
                // routes (recharts, read-excel-file, @dnd-kit) pulls its chunk into the
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
