// === VERSION ===
// Single source of truth: package.json
// Only update the version in package.json — this file reads it automatically.
export const VERSION = require('../package.json').version;
