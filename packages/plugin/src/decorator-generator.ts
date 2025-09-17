import * as fs from 'fs';
import * as path from 'path';
import * as ts from 'typescript';
import { glob } from 'glob';

export interface DecoratorGeneratorOptions {
  /**
   * Source directory to scan for controller files
   * @default 'src'
   */
  srcDir?: string;

  /**
   * Output directory for generated decorators
   * @default 'src/generated'
   */
  outputDir?: string;

  /**
   * Whether to clean the output directory before generation
   * @default true
   */
  clean?: boolean;
}

interface ControllerAnalysis {
  controllerName: string;
  serviceName: string;
  filePath: string;
  methods: ControllerMethodAnalysis[];
}

interface ControllerMethodAnalysis {
  name: string;
  httpMethod: string | null;
  isArray: boolean;
  responseType: string;
}

export class DecoratorGenerator {
  private options: Required<DecoratorGeneratorOptions>;

  constructor(options: DecoratorGeneratorOptions = {}) {
    this.options = {
      srcDir: 'src',
      outputDir: 'src/generated',
      clean: true,
      ...options,
    };
  }

  async generate(): Promise<void> {
    console.log('🔄 Generating smart decorators...');

    // Clean only the index.ts file if requested, not the entire directory
    if (this.options.clean) {
      const indexPath = path.join(this.options.outputDir, 'index.ts');
      if (fs.existsSync(indexPath)) {
        fs.unlinkSync(indexPath);
      }
    }

    // Ensure output directory exists
    if (!fs.existsSync(this.options.outputDir)) {
      fs.mkdirSync(this.options.outputDir, { recursive: true });
    }

    // Find all controller files
    const controllerFiles = await glob('**/*.controller.ts', {
      cwd: this.options.srcDir,
      absolute: true,
    });

    console.log(`📁 Found ${controllerFiles.length} controller files`);

    // Analyze each controller file
    const analyses: ControllerAnalysis[] = [];
    for (const filePath of controllerFiles) {
      try {
        const analysis = this.analyzeControllerFile(filePath);
        if (analysis && analysis.methods.length > 0) {
          analyses.push(analysis);
        }
      } catch (error) {
        console.warn(
          `⚠️  Failed to analyze ${filePath}: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }

    // Generate the main index file with all decorators and mappings
    this.generateIndexFile(analyses);

    console.log(`✅ Generated smart decorators for ${analyses.length} controllers`);
  }

  private analyzeControllerFile(filePath: string): ControllerAnalysis | null {
    const sourceText = fs.readFileSync(filePath, 'utf8');
    const sourceFile = ts.createSourceFile(filePath, sourceText, ts.ScriptTarget.Latest, true);

    let controllerName: string | null = null;
    let serviceName: string | null = null;
    const methods: ControllerMethodAnalysis[] = [];

    // Find the controller class
    ts.forEachChild(sourceFile, node => {
      if (ts.isClassDeclaration(node) && node.name) {
        const className = node.name.text;
        if (className.endsWith('Controller')) {
          controllerName = className;
          serviceName = className.replace('Controller', '') + 'Service';

          // Analyze methods in the controller class
          node.members.forEach(member => {
            if (ts.isMethodDeclaration(member) && member.name && ts.isIdentifier(member.name)) {
              const methodName = member.name.text;

              // Skip constructor and private methods
              if (methodName === 'constructor' || this.isPrivateMethod(member)) {
                return;
              }

              const httpMethod = this.detectHttpMethod(member);
              if (httpMethod) {
                const isArray = this.isArrayMethod(methodName);
                const responseType = `${serviceName}${this.capitalize(methodName)}Response`;

                methods.push({
                  name: methodName,
                  httpMethod,
                  isArray,
                  responseType,
                });
              }
            }
          });
        }
      }
    });

    if (!controllerName || !serviceName || methods.length === 0) {
      return null;
    }

    return {
      controllerName,
      serviceName,
      filePath,
      methods,
    };
  }

  private generateIndexFile(analyses: ControllerAnalysis[]): void {
    const outputPath = path.join(this.options.outputDir, 'index.ts');

    const imports = this.generateImports(analyses);
    const responseMapping = this.generateResponseMapping(analyses);
    const decorator = this.generateDecorator();

    const content = `${imports}\n\n${responseMapping}\n\n${decorator}`;

    fs.writeFileSync(outputPath, content, 'utf8');
    console.log(`📝 Generated: ${outputPath}`);
  }

  private generateImports(analyses: ControllerAnalysis[]): string {
    const imports = [
      "import { applyDecorators, SetMetadata } from '@nestjs/common';",
      "import { ApiOkResponse, ApiCreatedResponse, ApiResponseOptions } from '@nestjs/swagger';",
    ];

    // Import all response types
    const responseImports = analyses.map(analysis => {
      const responseName = `${analysis.serviceName.replace('Service', '')}ServiceResponse`;
      // Use relative path from src/generated to src/generated/responses
      const relativePath = `./responses/${analysis.serviceName.toLowerCase()}.response`;
      return `import { ${responseName} } from '${relativePath}';`;
    });

    return [...imports, ...responseImports].join('\n');
  }

  private generateResponseMapping(analyses: ControllerAnalysis[]): string {
    const mappings: string[] = [];

    analyses.forEach(analysis => {
      const controllerKey = analysis.controllerName.replace('Controller', '');
      const responseObjectName = `${analysis.serviceName.replace('Service', '')}ServiceResponse`;

      const methodMappings = analysis.methods
        .map(method => {
          return `    ${method.name}: { 
      type: ${responseObjectName}.${method.name}, 
      isArray: ${method.isArray},
      status: '${method.httpMethod === 'Post' ? 'created' : 'ok'}'
    }`;
        })
        .join(',\n');

      mappings.push(`  ${controllerKey}: {\n${methodMappings}\n  }`);
    });

    return `// Auto-generated response mapping configuration
export const RESPONSE_CONFIG = {
${mappings.join(',\n')}
} as const;

export type ResponseConfig = typeof RESPONSE_CONFIG;`;
  }

  private generateDecorator(): string {
    return `// Inferred API Response decorator that automatically applies correct Swagger decorators
export interface InferredAPIResponseOptions extends Omit<ApiResponseOptions, 'type' | 'status'> {
  /**
   * Override the automatically detected array setting
   */
  isArray?: boolean;
  
  /**
   * Override the automatically detected status
   */
  status?: 'ok' | 'created';
}

/**
 * Inferred API Response decorator that automatically detects and applies the correct Swagger response
 * based on the controller and method name
 */
export function InferredAPIResponse(options: InferredAPIResponseOptions = {}) {
  return function (target: any, propertyKey: string | symbol, descriptor: PropertyDescriptor) {
    // Get the controller class name
    const controllerName = target.constructor.name.replace('Controller', '');
    const methodName = String(propertyKey);
    
    // Get configuration for this controller and method
    const controllerConfig = (RESPONSE_CONFIG as any)[controllerName];
    if (!controllerConfig) {
      console.warn(\`⚠️  No response config found for controller: \${controllerName}\`);
      return descriptor;
    }
    
    const methodConfig = controllerConfig[methodName];
    if (!methodConfig) {
      console.warn(\`⚠️  No response config found for method: \${controllerName}.\${methodName}\`);
      return descriptor;
    }
    
    // Determine final configuration (options can override auto-detected values)
    const finalConfig = {
      type: methodConfig.type,
      isArray: options.isArray ?? methodConfig.isArray,
      status: options.status ?? methodConfig.status,
      description: options.description || 'Success response',
      ...options
    };
    
    // Apply the appropriate decorator
    const decoratorName = finalConfig.status === 'created' ? 'ApiCreatedResponse' : 'ApiOkResponse';
    const decoratorOptions: any = {
      type: finalConfig.type,
      description: finalConfig.description,
      ...options
    };
    
    if (finalConfig.isArray) {
      decoratorOptions.isArray = true;
    }
    
    // Apply the decorator
    const swaggerDecorator = finalConfig.status === 'created' 
      ? ApiCreatedResponse(decoratorOptions)
      : ApiOkResponse(decoratorOptions);
    
    return swaggerDecorator(target, propertyKey, descriptor);
  };
}

// Export convenience decorators
export const InferredOkResponse = (options: InferredAPIResponseOptions = {}) => 
  InferredAPIResponse({ ...options, status: 'ok' });

export const InferredCreatedResponse = (options: InferredAPIResponseOptions = {}) => 
  InferredAPIResponse({ ...options, status: 'created' });`;
  }

  private detectHttpMethod(method: ts.MethodDeclaration): string | null {
    const httpDecorators = ['Get', 'Post', 'Put', 'Patch', 'Delete', 'Options', 'Head'];

    for (const modifier of method.modifiers || []) {
      if (ts.isDecorator(modifier)) {
        const decoratorName = this.getDecoratorName(modifier);
        if (decoratorName && httpDecorators.includes(decoratorName)) {
          return decoratorName;
        }
      }
    }

    return null;
  }

  private getDecoratorName(decorator: ts.Decorator): string | undefined {
    if (ts.isCallExpression(decorator.expression)) {
      if (ts.isIdentifier(decorator.expression.expression)) {
        return decorator.expression.expression.text;
      }
    } else if (ts.isIdentifier(decorator.expression)) {
      return decorator.expression.text;
    }
    return undefined;
  }

  private isArrayMethod(methodName: string): boolean {
    // Methods that return direct arrays (not paginated objects)
    const directArrayPatterns = ['findAll', 'getAll', 'listAll'];

    // Exclude paginated methods as they return objects with data + meta
    const paginatedPatterns = ['paginated', 'paged'];
    const isPaginated = paginatedPatterns.some(pattern =>
      methodName.toLowerCase().includes(pattern.toLowerCase())
    );

    if (isPaginated) {
      return false; // Paginated responses are objects, not arrays
    }

    return directArrayPatterns.some(
      pattern =>
        methodName.toLowerCase() === pattern.toLowerCase() ||
        methodName.toLowerCase().startsWith(pattern.toLowerCase())
    );
  }

  private isPrivateMethod(method: ts.MethodDeclaration): boolean {
    return (
      method.modifiers?.some(modifier => modifier.kind === ts.SyntaxKind.PrivateKeyword) ?? false
    );
  }

  private capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
}
