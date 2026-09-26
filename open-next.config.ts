import { defineCloudflareConfig } from "@opennextjs/cloudflare";

// Sin incrementalCache: no usamos ISR (las rutas son dinámicas).
export default defineCloudflareConfig({});
