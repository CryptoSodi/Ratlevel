const { getDefaultConfig } = require("expo/metro-config");

// Expo's default config auto-detects the npm workspace: it watches the
// monorepo root and resolves hoisted dependencies without manual overrides.
module.exports = getDefaultConfig(__dirname);
