// Main exports
export { ServiceResponseGenerator } from './service-response-generator';
export type { ServiceResponseGeneratorOptions } from './service-response-generator';

// Legacy exports (deprecated)
// export { ... } from './nestjs-plugin';

// NestJS CLI Plugin (new)
export { default as nestjsCLIPlugin } from './nestjs-cli-index';
export type { PluginOptions as NestResponsesGeneratorPluginOptions } from './nestjs-cli-index';

// Decorators
export { AutoResponse, AutoArrayResponse } from './decorators';
export type { AutoResponseOptions } from './decorators';

// Infer Response Decorators
export { InferAPIResponse } from './infer-response.decorator';
export type { InferAPIResponseOptions } from './infer-response.decorator';

// CLI utility (for standalone usage)
export async function generateResponses(
  options: import('./service-response-generator').ServiceResponseGeneratorOptions = {}
) {
  const { ServiceResponseGenerator } = await import('./service-response-generator');
  const generator = new ServiceResponseGenerator(options);
  return generator.generate();
}

// Decorator Generator utility
export { DecoratorGenerator } from './decorator-generator';
export type { DecoratorGeneratorOptions } from './decorator-generator';

// Combined utility: generate responses and smart decorators
export async function generateAll(
  generateOptions: import('./service-response-generator').ServiceResponseGeneratorOptions = {},
  decoratorOptions: import('./decorator-generator').DecoratorGeneratorOptions = {}
) {
  // First generate the response types
  await generateResponses(generateOptions);

  // Then generate the smart decorators
  const { DecoratorGenerator } = await import('./decorator-generator');
  const decoratorGenerator = new DecoratorGenerator(decoratorOptions);
  await decoratorGenerator.generate();
}
