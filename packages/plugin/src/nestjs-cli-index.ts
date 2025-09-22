/**
 * NestJS CLI Plugin - TypeScript implementation
 * This plugin integrates with NestJS build system without external file watchers
 */

import * as ts from 'typescript';
import * as fs from 'fs';
import * as path from 'path';
import { glob } from 'glob';
import { ServiceResponseGenerator } from './service-response-generator';
import { DecoratorGenerator } from './decorator-generator';

export interface PluginOptions {
  /** Output directory for generated response files (default: 'src/generated') */
  outputDir?: string;
  /** Whether to clean output directory before generation (default: false) */
  clean?: boolean;
  /** Glob pattern to match service files (default: '**\/*.service.ts') */
  servicePattern?: string;
  /** Glob pattern to match controller files (default: '**\/*.controller.ts') */
  controllerPattern?: string;
}

// File-based lock mechanism to prevent multiple processes from generating simultaneously
const LOCK_FILE_PATH = path.join(process.cwd(), '.nest-responses-generator.lock');

function getGenerationMarkerPath(outputDir: string): string {
  return path.join(outputDir, 'responses', '.signature');
}

function shouldRegenerate(options: Required<PluginOptions>): boolean {
  const signatureFile = getGenerationMarkerPath(options.outputDir);

  // If signature file doesn't exist, we need to generate
  if (!fs.existsSync(signatureFile)) {
    return true;
  }

  try {
    // Get the timestamp of the last generation
    const lastGeneration = fs.statSync(signatureFile).mtime;

    // Check if any service files are newer than the last generation
    const serviceFiles = glob.sync(options.servicePattern, { cwd: 'src' });
    const controllerFiles = glob.sync(options.controllerPattern, { cwd: 'src' });

    const allSourceFiles = [...serviceFiles, ...controllerFiles].map(file =>
      path.join('src', file)
    );

    for (const sourceFile of allSourceFiles) {
      if (fs.existsSync(sourceFile)) {
        const sourceTime = fs.statSync(sourceFile).mtime;
        if (sourceTime > lastGeneration) {
          console.log(`🔄 Source file changed: ${sourceFile}, regenerating...`);
          return true;
        }
      }
    }

    return false;
  } catch (error) {
    console.warn('⚠️  Error checking file timestamps, regenerating...', error);
    return true;
  }
}

function acquireLock(): boolean {
  try {
    // Check if lock file exists and is recent (less than 30 seconds old)
    if (fs.existsSync(LOCK_FILE_PATH)) {
      const stats = fs.statSync(LOCK_FILE_PATH);
      const age = Date.now() - stats.mtime.getTime();

      // If lock is too old, remove it (stale lock)
      if (age > 30000) {
        fs.unlinkSync(LOCK_FILE_PATH);
      } else {
        return false; // Lock is active
      }
    }

    // Create lock file
    fs.writeFileSync(LOCK_FILE_PATH, process.pid.toString(), 'utf8');
    return true;
  } catch (error) {
    console.warn('⚠️  NestResponsesGeneratorPlugin: Could not acquire lock:', error);
    return false;
  }
}

function releaseLock(): void {
  try {
    if (fs.existsSync(LOCK_FILE_PATH)) {
      fs.unlinkSync(LOCK_FILE_PATH);
    }
  } catch (error) {
    console.warn('⚠️  NestResponsesGeneratorPlugin: Could not release lock:', error);
  }
}

function generateAllResponses(options: Required<PluginOptions>): void {
  // Check if regeneration is needed based on file changes
  if (!shouldRegenerate(options)) {
    console.log('⏭️  NestResponsesGeneratorPlugin: No changes detected, skipping generation...');
    return;
  }

  // Use file-based lock to prevent concurrent generation across processes
  if (!acquireLock()) {
    console.log(
      '⏭️  NestResponsesGeneratorPlugin: Generation already in progress in another process, skipping...'
    );
    return;
  }

  try {
    console.log('🔄 NestResponsesGeneratorPlugin: Generating responses...');

    // Ensure output directories exist
    const responsesDir = path.join(options.outputDir, 'responses');
    if (!fs.existsSync(responsesDir)) {
      fs.mkdirSync(responsesDir, { recursive: true });
    }

    // Create generators with options
    const serviceGenerator = new ServiceResponseGenerator();
    const decoratorGenerator = new DecoratorGenerator();

    // Generate responses first
    serviceGenerator.generate();

    // Then generate decorators
    decoratorGenerator.generate();

    // Mark generation as completed for this session (inside responses folder)
    const generationMarkerPath = getGenerationMarkerPath(options.outputDir);
    fs.writeFileSync(generationMarkerPath, Date.now().toString(), 'utf8');

    console.log('✅ NestResponsesGeneratorPlugin: Generation completed');
  } catch (error) {
    console.error('❌ NestResponsesGeneratorPlugin: Generation failed:', error);
  } finally {
    releaseLock();
  }
}

/**
 * Plugin initialization function
 */
function runPlugin(program: ts.Program, options: PluginOptions = {}) {
  console.log('🔧 NestResponsesGeneratorPlugin: Initializing...');

  const pluginOptions = {
    outputDir: 'src/generated',
    clean: false,
    servicePattern: '**/*.service.ts',
    controllerPattern: '**/*.controller.ts',
    ...options,
  };

  // Generate responses and decorators during build
  // File-based locking will prevent multiple processes from running simultaneously
  generateAllResponses(pluginOptions);

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
