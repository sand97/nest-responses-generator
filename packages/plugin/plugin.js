/**
 * NestJS CLI Plugin Entry Point
 * This file must be at the root and export the plugin object directly
 */

const plugin = require('./dist/nestjs-cli-index');

// Export the plugin object directly
module.exports = plugin.default;
