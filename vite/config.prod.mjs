import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
    base: './',
    plugins: [
        react()
    ],
    logLevel: 'warning',
    build: {
        rollupOptions: {
            output: {
                manualChunks: (id) => (id.includes('/node_modules/phaser/') ? 'phaser' : undefined)
            }
        },
        minify: 'terser',
        terserOptions: {
            compress: {
                passes: 2
            },
            mangle: true,
            format: {
                comments: false
            }
        }
    }
});
