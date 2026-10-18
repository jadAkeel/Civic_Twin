import { existsSync } from "node:fs";
import { join } from "node:path";

const requiredRoutes = [
  "dashboard",
  "map",
  "reports",
  "green-score",
  "mobility",
  "simulator",
  "predictions",
  "ask-city",
  "admin",
  "digital-twin",
];

const requiredFeatureDirs = [
  "map",
  "reports",
  "green-score",
  "mobility",
  "scenarios",
  "predictions",
  "assistant",
  "admin",
  "digital-twin",
];

const root = process.cwd();
const missing = [
  ...requiredRoutes
    .map((route) => join(root, "apps", "web", "app", route, "page.tsx"))
    .filter((path) => !existsSync(path)),
  ...requiredFeatureDirs
    .map((dir) => join(root, "apps", "web", "features", dir))
    .filter((path) => !existsSync(path)),
];

if (missing.length) {
  console.error("Frontend smoke check failed. Missing:");
  for (const item of missing) console.error(`- ${item}`);
  process.exit(1);
}

console.log("Frontend smoke check passed.");
