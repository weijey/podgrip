import { createRequire } from "module";
const require = createRequire(import.meta.url);
let id3 = null;
try {
  id3 = require("node-id3");
} catch (e) {
  /* optional */
}

export { id3 };
