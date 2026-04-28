import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

// dist/loaders/paths.js → repo/packages/ds-read-mcp/dist/loaders/paths.js
// design-system source: repo/packages/design-system/src
const here = dirname(fileURLToPath(import.meta.url));

export const designSystemRoot = resolve(here, "../../../design-system/src");
export const tokensDir = resolve(designSystemRoot, "tokens");
export const componentsDir = resolve(designSystemRoot, "components");
export const iconsDir = resolve(designSystemRoot, "icons");

// Phase 2+: Brief-derived artifacts produced by ds-author-mcp's
// propose_tokens / propose_component pipeline land under src/generated/<slug>/.
export const generatedRoot = resolve(designSystemRoot, "generated");
