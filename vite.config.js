import { defineConfig } from "vite";

export default defineConfig(
    ({ command, mode, isSsrBuild, isPreview }) => {
        if (command === 'build') {
            return {
                base: "/algoboard/",
            }
        } else {
            return {}
        }
    }
)