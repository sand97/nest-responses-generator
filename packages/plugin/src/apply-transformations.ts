import * as fs from 'fs';
import * as path from 'path';
import * as ts from 'typescript';

export interface ApplyTransformationsOptions {
  /**
   * Source directory containing controller files
   * @default 'src'
   */
  srcDir?: string;

  /**
   * Generated responses directory
   * @default 'src/generated/responses'
   */
  responsesDir?: string;
}

/**
 * Apply transformations to controller files by replacing @InferAPIResponse
 * decorators with actual Swagger decorators
 */
export async function applyTransformations(options: ApplyTransformationsOptions = {}) {
  const { srcDir = 'src', responsesDir = 'src/generated/responses' } = options;

  console.log('🔄 Applying response type transformations...');

  // Find all controller files
  const controllerFiles = await findControllerFiles(srcDir);

  for (const filePath of controllerFiles) {
    try {
      await transformControllerFile(filePath, responsesDir);
      console.log(`✅ Transformed: ${filePath}`);
    } catch (error) {
      console.error(
        `❌ Failed to transform ${filePath}:`,
        error instanceof Error ? error.message : String(error)
      );
    }
  }

  console.log(`🎉 Transformation complete! Processed ${controllerFiles.length} controller files.`);
}

async function findControllerFiles(srcDir: string): Promise<string[]> {
  const { glob } = await import('glob');
  return glob('**/*.controller.ts', { cwd: srcDir, absolute: true });
}

async function transformControllerFile(filePath: string, responsesDir: string) {
  const sourceText = fs.readFileSync(filePath, 'utf8');

  // Check if file contains @InferAPIResponse
  if (!sourceText.includes('@InferAPIResponse')) {
    return; // Skip files without our decorator
  }

  const sourceFile = ts.createSourceFile(filePath, sourceText, ts.ScriptTarget.Latest, true);

  let transformed = sourceText;
  let hasChanges = false;

  // Extract service name from controller
  const serviceName = extractServiceName(sourceFile);
  if (!serviceName) {
    console.warn(`Could not determine service name for ${filePath}`);
    return;
  }

  // Check if response imports exist
  const responseObjectName = `${serviceName.replace('Service', '')}ServiceResponse`;
  const responseImportPath = path
    .relative(
      path.dirname(filePath),
      path.join(responsesDir, `${serviceName.toLowerCase()}.response.ts`)
    )
    .replace(/\\/g, '/')
    .replace('.ts', '');

  // Add import if not present
  if (!transformed.includes(responseObjectName)) {
    const importStatement = `import { ${responseObjectName} } from '${responseImportPath}';\n`;
    transformed = transformed.replace(
      /(import.*from '@nestjs\/swagger';)/,
      `$1\n${importStatement}`
    );
    hasChanges = true;
  }

  // Process each method with @InferAPIResponse
  ts.forEachChild(sourceFile, node => {
    if (ts.isClassDeclaration(node)) {
      node.members.forEach(member => {
        if (ts.isMethodDeclaration(member) && member.name && ts.isIdentifier(member.name)) {
          const methodName = member.name.text;

          // Check if method has @InferAPIResponse
          const hasInferDecorator = member.modifiers?.some(modifier => {
            if (ts.isDecorator(modifier)) {
              return getDecoratorName(modifier) === 'InferAPIResponse';
            }
            return false;
          });

          if (hasInferDecorator) {
            // Get HTTP method
            const httpMethod = getHttpMethod(member);

            // Determine if array response
            const isArrayResponse = isArrayMethod(methodName);

            // Build replacement decorator
            const decoratorName = httpMethod === 'Post' ? 'ApiCreatedResponse' : 'ApiOkResponse';
            const typeExpression = `${responseObjectName}.${methodName}`;

            let decoratorOptions = `{ type: ${typeExpression}`;
            if (isArrayResponse) {
              decoratorOptions += ', isArray: true';
            }

            // Extract description from original decorator
            const originalDecorator = getDecoratorText(
              transformed,
              methodName,
              '@InferAPIResponse'
            );
            const description = extractDescription(originalDecorator);
            if (description) {
              decoratorOptions += `, description: '${description}'`;
            }

            decoratorOptions += ' }';

            const newDecorator = `@${decoratorName}(${decoratorOptions})`;

            // Replace the decorator
            transformed = transformed.replace(
              new RegExp(`@InferAPIResponse\\([^)]*\\)`, 'g'),
              newDecorator
            );
            hasChanges = true;
          }
        }
      });
    }
  });

  // Write back if changes were made
  if (hasChanges) {
    fs.writeFileSync(filePath, transformed, 'utf8');
  }
}

function extractServiceName(sourceFile: ts.SourceFile): string | null {
  let serviceName: string | null = null;

  ts.forEachChild(sourceFile, node => {
    if (ts.isClassDeclaration(node) && node.name) {
      const className = node.name.text;
      if (className.endsWith('Controller')) {
        serviceName = className.replace('Controller', '') + 'Service';
      }
    }
  });

  return serviceName;
}

function getDecoratorName(decorator: ts.Decorator): string | undefined {
  if (ts.isCallExpression(decorator.expression)) {
    if (ts.isIdentifier(decorator.expression.expression)) {
      return decorator.expression.expression.text;
    }
  } else if (ts.isIdentifier(decorator.expression)) {
    return decorator.expression.text;
  }
  return undefined;
}

function getHttpMethod(method: ts.MethodDeclaration): string | null {
  const httpDecorators = ['Get', 'Post', 'Put', 'Patch', 'Delete'];

  for (const modifier of method.modifiers || []) {
    if (ts.isDecorator(modifier)) {
      const decoratorName = getDecoratorName(modifier);
      if (decoratorName && httpDecorators.includes(decoratorName)) {
        return decoratorName;
      }
    }
  }

  return null;
}

function isArrayMethod(methodName: string): boolean {
  const arrayPatterns = ['findAll', 'getAll', 'listAll', 'search', 'filter', 'query'];
  return arrayPatterns.some(pattern => methodName.toLowerCase().includes(pattern.toLowerCase()));
}

function getDecoratorText(sourceText: string, methodName: string, decoratorName: string): string {
  const methodRegex = new RegExp(`${decoratorName}\\([^)]*\\)[\\s\\S]*?${methodName}\\s*\\(`);
  const match = sourceText.match(methodRegex);
  return match ? match[0] : '';
}

function extractDescription(decoratorText: string): string | null {
  const descMatch = decoratorText.match(/description:\s*['"]([^'"]*)['"]/);
  return descMatch ? descMatch[1] : null;
}
