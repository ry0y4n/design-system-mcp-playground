import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

// dist/loaders/paths.js → repo/packages/mcp-server/dist/loaders/paths.js
// design-system source: repo/packages/design-system/src
const here = dirname(fileURLToPath(import.meta.url));

export const designSystemRoot = resolve(here, "../../../design-system/src");
export const tokensDir = resolve(designSystemRoot, "tokens");
export const componentsDir = resolve(designSystemRoot, "components");
export const iconsDir = resolve(designSystemRoot, "icons");
