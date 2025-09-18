/**
 * NestJS CLI Plugin - TypeScript implementation
 * This plugin integrates with NestJS build system without external file watchers
 */

import * as ts from 'typescript';
import { ServiceResponseGenerator } from './service-response-generator';
import { DecoratorGenerator } from './decorator-generator';

export interface PluginOptions {
  /** Output directory for generated response files (default: 'src/generated') */
  outputDir?: string;
  /** Whether to clean output directory before generation (default: false) */
  clean?: boolean;
  /** Custom response class prefix (default: '') */
  responsePrefix?: string;
  /** Custom response class suffix (default: 'Response') */
  responseSuffix?: string;
}

// Global plugin state to avoid multiple initializations
let pluginInitialized = false;

function generateAllResponses(_options: Required<PluginOptions>): void {
  try {
    console.log('🔄 NestResponsesGeneratorPlugin: Generating responses...');

    // Create generators with options
    const serviceGenerator = new ServiceResponseGenerator();
    const decoratorGenerator = new DecoratorGenerator();

    // Generate responses first
    serviceGenerator.generate();

    // Then generate decorators
    decoratorGenerator.generate();

    console.log('✅ NestResponsesGeneratorPlugin: Generation completed');
  } catch (error) {
    console.error('❌ NestResponsesGeneratorPlugin: Generation failed:', error);
  }
}

/**
 * Plugin initialization function
 */
function runPlugin(program: ts.Program, options: PluginOptions = {}) {
  // Initialize plugin only once per compilation
  if (!pluginInitialized) {
    console.log('🔧 NestResponsesGeneratorPlugin: Initializing...');

    const pluginOptions = {
      outputDir: 'src/generated',
      clean: false,
      responsePrefix: '',
      responseSuffix: 'Response',
      ...options,
    };

    // Generate responses and decorators during build
    generateAllResponses(pluginOptions);

    pluginInitialized = true;

    // Reset flag when compilation is done
    setTimeout(() => {
      pluginInitialized = false;
    }, 1000);
  }

  // Return the transformer factory
  const transformerFactory: ts.TransformerFactory<ts.SourceFile> = (
    _context: ts.TransformationContext
  ) => {
    return (sourceFile: ts.SourceFile) => {
      // Don't modify source files, just return them as-is
      // The generation happens during plugin initialization
      return sourceFile;
    };
  };

  return transformerFactory;
}

// Export the object structure that NestJS CLI expects directly
const plugin = {
  before: runPlugin,
};

export default plugin;
