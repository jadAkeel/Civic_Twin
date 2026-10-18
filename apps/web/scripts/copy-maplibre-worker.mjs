// Copies MapLibre's ES-module web worker into public/ so it is served from our own
// origin. MapLibre 6 locates its worker through import.meta.url, which the Next.js
// bundle rewrites, so without this the map fails with "Worker failed to load".
// The folder is stamped with the installed version, which the map reads at runtime
// through maplibregl.getVersion(), so a dependency upgrade can never serve a stale
// worker.
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const webRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const entry = fileURLToPath(import.meta.resolve("maplibre-gl"));
const distDir = dirname(entry);
const { version } = JSON.parse(readFileSync(join(distDir, "..", "package.json"), "utf8"));

const vendorRoot = join(webRoot, "public", "vendor", "maplibre");
const target = join(vendorRoot, version);

if (existsSync(vendorRoot)) {
  for (const stale of readdirSync(vendorRoot)) {
    if (stale !== version) rmSync(join(vendorRoot, stale), { recursive: true, force: true });
  }
}
mkdirSync(target, { recursive: true });

// The worker imports ./maplibre-gl-shared.mjs relative to its own URL.
for (const file of ["maplibre-gl-worker.mjs", "maplibre-gl-shared.mjs"]) {
  copyFileSync(join(distDir, file), join(target, file));
}

console.log(`MapLibre ${version} worker copied to public/vendor/maplibre/${version}/`);
