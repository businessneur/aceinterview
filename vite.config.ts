import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import tsconfigPaths from "vite-tsconfig-paths";

const config = {
  mode: "development",
  build: {
    outDir: "dist",
    emptyOutDir: true,
    sourcemap: true,
    minify: false,
    cssMinify: false,
    terserOptions: { compress: false, mangle: false },
    rollupOptions: {
      // Ensure external dependencies are properly handled
      external: [],
      output: {
        globals: {}
      }
    }
  },
  define: { "process.env.NODE_ENV": "'development'" },
  esbuild: { jsx: "automatic", jsxImportSource: "react" },
  plugins: [
    react(),
    tsconfigPaths()
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  // Handle static assets through Vite's built-in public directory
  publicDir: "public",
  // Ensure proper asset handling
  assetsInclude: ['**/*.png', '**/*.jpg', '**/*.jpeg', '**/*.gif', '**/*.svg', '**/*.ico'],
  // Optimize dependencies
  optimizeDeps: {
    include: ['axios', 'livekit-client', 'lucide-react']
  }
};

export default defineConfig(config);