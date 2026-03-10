const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const config = getDefaultConfig(__dirname);

config.watchFolders = [__dirname];

config.resolver.blockList = [
  /\.cache\/dotslash\/.*/,
  /\.cache\/replit\/.*/,
];

module.exports = config;
