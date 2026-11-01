const path = require('path');

// Expo includes the SDK-matched Metro config, but some installs do not hoist
// it to the app root. Prefer a direct install and fall back to Expo's bundled
// copy so preview startup works with both npm and Bun installs.
let getDefaultConfig;
try {
  ({ getDefaultConfig } = require('@expo/metro-config'));
} catch (error) {
  const expoPackageRoot = path.dirname(require.resolve('expo/package.json'));
  ({ getDefaultConfig } = require(path.join(expoPackageRoot, 'node_modules/@expo/metro-config')));
}

const config = getDefaultConfig(__dirname);

// Allow any origins and provide robust middleware handling
const originalEnhanceMiddleware = config.server?.enhanceMiddleware;
config.server = config.server || {};
config.server.enhanceMiddleware = (middleware, server) => {
  const enhanced = originalEnhanceMiddleware
    ? originalEnhanceMiddleware(middleware, server)
    : middleware;

  return (req, res, next) => {
    // If incoming origin is from external dev domain, sanitize so Metro does not block it
    if (req.headers.origin && !req.headers.origin.includes('localhost') && !req.headers.origin.includes('127.0.0.1')) {
      req.headers['x-client-origin'] = req.headers.origin;
      delete req.headers.origin;
    }
    return enhanced(req, res, next);
  };
};

module.exports = config;
