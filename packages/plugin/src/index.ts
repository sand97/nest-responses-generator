// Main exports
export { ServiceResponseGenerator } from './service-response-generator';
export type { ServiceResponseGeneratorOptions } from './service-response-generator';

// NestJS Plugin
export {
  default as nestjsResponseGeneratorPlugin,
  createNestJSResponseGeneratorPlugin,
} from './nestjs-plugin';
export type { NestJSResponseGeneratorPluginOptions } from './nestjs-plugin';

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
