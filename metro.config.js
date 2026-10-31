const { getDefaultConfig } = require('@expo/metro-config');

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
