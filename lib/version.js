// === VERSION ===
// Reads version from package.json - single source of truth
import pkg from '../package.json';

export const VERSION = pkg.version;
