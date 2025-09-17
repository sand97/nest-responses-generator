import * as ts from 'typescript';
import { ServiceResponseGenerator } from './service-response-generator';
import { createResponseTransformer } from './response-transformer';

export interface NestJSResponseGeneratorPluginOptions {
  /**
   * Source directory to scan for service files
   * @default 'src'
   */
  srcDir?: string;

  /**
   * Output directory for generated response files
   * @default 'src/generated/responses'
   */
  outputDir?: string;

  /**
   * Glob pattern to match service files
   * @default "**\/*.service.ts"
   */
  servicePattern?: string;

  /**
   * Whether to clean the output directory before generation
   * @default true
   */
  clean?: boolean;

  /**
   * Whether to run generation in watch mode
   * @default false
   */
  watch?: boolean;
}

/**
 * TypeScript transformer plugin for NestJS that automatically generates
 * Swagger response types from service return types
 */
export default function nestjsResponseGeneratorPlugin(
  program: ts.Program,
  options: NestJSResponseGeneratorPluginOptions = {}
): ts.TransformerFactory<ts.SourceFile> {
  // Run the generator when the plugin is loaded
  const generator = new ServiceResponseGenerator(options);

  // Run generation asynchronously to avoid blocking compilation
  setImmediate(async () => {
    try {
      await generator.generate();
    } catch (error) {
      console.error(
        '❌ Failed to generate response types:',
        error instanceof Error ? error.message : String(error)
      );
    }
  });

  // Return the response transformer to handle @InferAPIResponse decorators
  return createResponseTransformer({
    responsesDir: options.outputDir || 'src/generated/responses'
  });
}

/**
 * Factory function for creating the plugin with options
 */
export function createNestJSResponseGeneratorPlugin(
  options: NestJSResponseGeneratorPluginOptions = {}
) {
  return (program: ts.Program) => nestjsResponseGeneratorPlugin(program, options);
}
