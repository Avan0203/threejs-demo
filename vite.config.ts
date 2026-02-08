/*
 * @Date: 2024-02-01 16:01:31
 * @LastEditors: wuyifan0203 1208097313@qq.com
 * @LastEditTime: 2024-12-18 11:29:20
 * @FilePath: \threejs-demo\vite.config.ts
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
    root: './',
    base: '/',
    plugins: [],
    server: { port: 6500 },
    resolve: {
        alias: [
            { find: 'three/examples/jsm', replacement: path.resolve(__dirname, 'src/lib/three/examples/jsm') },
            { find: 'three', replacement: path.resolve(__dirname, 'src/lib/three/build/three.module.js') },
        ],
    },
});
