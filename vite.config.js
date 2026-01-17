import { defineConfig } from "vite";
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))

export default defineConfig(
    ({ command, mode, isSsrBuild, isPreview }) => {
        const commonConfig = defineConfig({
            build: {
                rollupOptions: {
                    input: {
                        main: resolve(__dirname, 'index.html'),
                        help: resolve(__dirname, 'help.html'),
                    },
                },
            }
        });
        if (command === 'build') {
            return {
                ...commonConfig,
                base: "/algoboard/",
            }
        } else {
            return commonConfig
        }
    }
)