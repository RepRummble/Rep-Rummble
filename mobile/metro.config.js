const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// socket.io-client and engine.io-client use private class fields (#field)
// which Hermes can't handle unless Metro transpiles them through Babel.
const defaultBlockList = config.transformer?.transformIgnorePatterns?.[0] ||
  'node_modules/(?!(expo|@expo|react-native|@react-native|@react-navigation|expo-modules-core).*)';

config.transformer = {
  ...config.transformer,
  transformIgnorePatterns: [
    'node_modules/(?!(expo|@expo|react-native|@react-native|@react-navigation|expo-modules-core|socket\\.io-client|engine\\.io-client|@socket\\.io).*/)',
  ],
};

module.exports = config;
