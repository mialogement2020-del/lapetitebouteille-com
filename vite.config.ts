import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

const securityHeaders = {
  "Content-Security-Policy":
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: blob: https:; font-src 'self' https://fonts.gstatic.com data:; connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.lovable.dev; media-src 'self' https: blob:; frame-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'; upgrade-insecure-requests",
  "Permissions-Policy": "camera=(self), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Cross-Origin-Opener-Policy": "same-origin-allow-popups",
  "Cross-Origin-Resource-Policy": "cross-origin",
};

// https://vitejs.dev/config/
export default defineConfig(async ({ mode }) => {
  const plugins = [react()];

  if (mode === "development") {
    try {
      const { mcpPlugin } = await import("@lovable.dev/mcp-js/stacks/supabase/vite");
      plugins.push(mcpPlugin());
    } catch {
      // Lovable MCP is only a local development aid. Production builds must not fail without it.
    }
    plugins.push(componentTagger());
  }

  return {
    server: {
      host: "::",
      port: 8080,
      headers: securityHeaders,
      hmr: {
        overlay: false,
      },
    },
    preview: {
      headers: securityHeaders,
    },
    plugins,
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
      dedupe: ["react", "react-dom", "react/jsx-runtime"],
    },
    build: {
      modulePreload: false,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes("vite/preload-helper")) return "preload-helper";
            if (id.includes("commonjsHelpers")) return "commonjs-helpers";
            if (!id.includes("node_modules")) return undefined;

            if (/[\\/]node_modules[\\/](react|react-dom|react-router-dom|@tanstack[\\/]react-query)[\\/]/.test(id)) {
              return "vendor-react";
            }
            if (/[\\/]node_modules[\\/](react-helmet-async|react-fast-compare|react-is|invariant|shallowequal)[\\/]/.test(id)) {
              return "vendor-seo";
            }
            if (/[\\/]node_modules[\\/](clsx|tailwind-merge|class-variance-authority)[\\/]/.test(id)) {
              return "vendor-ui-utils";
            }
            if (/[\\/]node_modules[\\/](i18next|react-i18next|i18next-browser-languagedetector)[\\/]/.test(id)) {
              return "vendor-i18n";
            }
            if (/[\\/]node_modules[\\/]@supabase[\\/]supabase-js[\\/]/.test(id)) {
              return "vendor-supabase";
            }
            if (/[\\/]node_modules[\\/]recharts[\\/]/.test(id)) {
              return "vendor-charts";
            }
            if (/[\\/]node_modules[\\/](jspdf|jspdf-autotable|html2canvas)[\\/]/.test(id)) {
              return "vendor-pdf";
            }
            if (/[\\/]node_modules[\\/]xlsx[\\/]/.test(id)) {
              return "vendor-excel";
            }

            return undefined;
          },
        },
      },
    },
  };
});
