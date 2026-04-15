const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Map Node.js built-ins to their React Native-compatible polyfills.
// expo-notifications → @ide/backoff → uses 'assert', which Metro 0.81+
// blocks as a Node built-in.  Redirect it to the npm polyfill (v1.5.0).
config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  assert: require.resolve('assert'),
};

module.exports = config;
