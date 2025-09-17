import * as ts from 'typescript';
import * as path from 'path';
import * as fs from 'fs';

export interface ResponseTransformerOptions {
  /**
   * Directory where generated responses are located
   * @default 'src/generated/responses'
   */
  responsesDir?: string;
}

/**
 * TypeScript transformer that replaces @InferAPIResponse decorators
 * with actual @ApiOkResponse/@ApiCreatedResponse decorators
 */
export function createResponseTransformer(
  options: ResponseTransformerOptions = {}
): ts.TransformerFactory<ts.SourceFile> {
  const responsesDir = options.responsesDir || 'src/generated/responses';

  return (context: ts.TransformationContext) => {
    return (sourceFile: ts.SourceFile) => {
      // Only transform controller files
      if (!sourceFile.fileName.includes('.controller.ts')) {
        return sourceFile;
      }

      let hasInferDecorator = false;
      let serviceName = '';
      let responseImportAdded = false;

      // First pass: check if we need to transform this file
      const visitor = (node: ts.Node): ts.Node => {
        if (ts.isDecorator(node)) {
          const decoratorName = getDecoratorName(node);
          if (decoratorName === 'InferAPIResponse' || 
              decoratorName === 'InferAPIArrayResponse' || 
              decoratorName === 'InferAPICreatedResponse') {
            hasInferDecorator = true;
          }
        }
        
        if (ts.isClassDeclaration(node) && node.name) {
          const className = node.name.text;
          if (className.endsWith('Controller')) {
            serviceName = className.replace('Controller', '') + 'Service';
          }
        }

        return ts.visitEachChild(node, visitor, context);
      };

      // Visit once to detect if transformation is needed
      ts.visitNode(sourceFile, visitor);

      if (!hasInferDecorator) {
        return sourceFile;
      }

      // Generate the response import path
      const responseFileName = `${serviceName.toLowerCase()}.response.ts`;
      const responseFilePath = path.join(responsesDir, responseFileName);
      const relativeResponsePath = path.relative(
        path.dirname(sourceFile.fileName),
        responseFilePath
      ).replace(/\\/g, '/').replace('.ts', '');

      // Transform the source file
      const transformer = (node: ts.Node): ts.Node => {
        // Add import for response types at the top
        if (ts.isSourceFile(node) && !responseImportAdded) {
          const responseObjectName = `${serviceName.replace('Service', '')}ServiceResponse`;
          
          // Check if import already exists
          const hasResponseImport = node.statements.some(stmt => {
            if (ts.isImportDeclaration(stmt) && ts.isStringLiteral(stmt.moduleSpecifier)) {
              return stmt.moduleSpecifier.text.includes('.response');
            }
            return false;
          });

          if (!hasResponseImport) {
            const importDecl = ts.factory.createImportDeclaration(
              undefined,
              ts.factory.createImportClause(
                false,
                undefined,
                ts.factory.createNamedImports([
                  ts.factory.createImportSpecifier(
                    false,
                    undefined,
                    ts.factory.createIdentifier(responseObjectName)
                  )
                ])
              ),
              ts.factory.createStringLiteral(relativeResponsePath),
              undefined
            );

            responseImportAdded = true;
            return ts.factory.updateSourceFile(node, [
              importDecl,
              ...node.statements
            ]);
          }
        }

        // Transform class decorators
        if (ts.isClassDeclaration(node)) {
          const classLevelOptions = getInferResponseOptions(node);
          
          if (classLevelOptions) {
            // Apply to all methods in the class
            const updatedMembers = node.members.map(member => {
              if (ts.isMethodDeclaration(member) && !hasInferDecoratorMethod(member)) {
                return addInferredResponseDecorator(member, classLevelOptions, serviceName);
              }
              return member;
            });

            return ts.factory.updateClassDeclaration(
              node,
              node.modifiers,
              node.name,
              node.typeParameters,
              node.heritageClauses,
              updatedMembers
            );
          }
        }

        // Transform method decorators
        if (ts.isMethodDeclaration(node)) {
          const methodOptions = getInferResponseOptions(node);
          
          if (methodOptions) {
            return addInferredResponseDecorator(node, methodOptions, serviceName);
          }
        }

        return ts.visitEachChild(node, transformer, context);
      };

      return ts.visitNode(sourceFile, transformer) as ts.SourceFile;
    };
  };
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

function hasInferDecoratorMethod(node: ts.MethodDeclaration): boolean {
  return node.modifiers?.some(modifier => {
    if (ts.isDecorator(modifier)) {
      const decoratorName = getDecoratorName(modifier);
      return decoratorName === 'InferAPIResponse' || 
             decoratorName === 'InferAPIArrayResponse' || 
             decoratorName === 'InferAPICreatedResponse';
    }
    return false;
  }) ?? false;
}

function hasInferDecoratorClass(node: ts.ClassDeclaration): boolean {
  return node.modifiers?.some(modifier => {
    if (ts.isDecorator(modifier)) {
      const decoratorName = getDecoratorName(modifier);
      return decoratorName === 'InferAPIResponse' || 
             decoratorName === 'InferAPIArrayResponse' || 
             decoratorName === 'InferAPICreatedResponse';
    }
    return false;
  }) ?? false;
}

function getInferResponseOptions(node: ts.ClassDeclaration | ts.MethodDeclaration): any {
  const decorator = node.modifiers?.find(modifier => {
    if (ts.isDecorator(modifier)) {
      const decoratorName = getDecoratorName(modifier);
      return decoratorName === 'InferAPIResponse' || 
             decoratorName === 'InferAPIArrayResponse' || 
             decoratorName === 'InferAPICreatedResponse';
    }
    return false;
  });

  if (!decorator) return null;

  // Extract options from decorator arguments
  if (ts.isDecorator(decorator) && ts.isCallExpression(decorator.expression)) {
    const decoratorName = getDecoratorName(decorator);
    let baseOptions = {};

    // Set defaults based on decorator type
    if (decoratorName === 'InferAPIArrayResponse') {
      baseOptions = { isArray: true };
    } else if (decoratorName === 'InferAPICreatedResponse') {
      baseOptions = { status: 'created' };
    }

    // If there are arguments, try to extract them
    if (decorator.expression.arguments.length > 0) {
      const arg = decorator.expression.arguments[0];
      if (ts.isObjectLiteralExpression(arg)) {
        const options = extractObjectLiteralOptions(arg);
        return { ...baseOptions, ...options };
      }
    }

    return baseOptions;
  }

  return {};
}

function extractObjectLiteralOptions(objLiteral: ts.ObjectLiteralExpression): any {
  const options: any = {};
  
  objLiteral.properties.forEach(prop => {
    if (ts.isPropertyAssignment(prop) && ts.isIdentifier(prop.name)) {
      const key = prop.name.text;
      
      if (ts.isStringLiteral(prop.initializer)) {
        options[key] = prop.initializer.text;
      } else if (prop.initializer.kind === ts.SyntaxKind.TrueKeyword || prop.initializer.kind === ts.SyntaxKind.FalseKeyword) {
        options[key] = prop.initializer.kind === ts.SyntaxKind.TrueKeyword;
      }
    }
  });

  return options;
}

function addInferredResponseDecorator(
  method: ts.MethodDeclaration,
  options: any,
  serviceName: string
): ts.MethodDeclaration {
  const methodName = method.name && ts.isIdentifier(method.name) ? method.name.text : '';
  const responseClassName = `${serviceName}${capitalize(methodName)}Response`;
  const responseObjectName = `${serviceName.replace('Service', '')}ServiceResponse`;
  
  // Detect HTTP method from decorators
  const httpMethod = detectHttpMethod(method);
  
  // Auto-detect if return type is array by checking method name patterns
  const isArrayResponse = options.isArray || isArrayMethod(methodName);
  
  // Determine decorator type based on HTTP method or explicit status
  let decoratorName = 'ApiOkResponse';
  if (options.status === 'created' || httpMethod === 'Post') {
    decoratorName = 'ApiCreatedResponse';
  }
  
  // Build the decorator options
  const decoratorOptions: ts.ObjectLiteralElementLike[] = [];
  
  // Add type
  if (isArrayResponse) {
    decoratorOptions.push(
      ts.factory.createPropertyAssignment(
        'type',
        ts.factory.createPropertyAccessExpression(
          ts.factory.createIdentifier(responseObjectName),
          ts.factory.createIdentifier(methodName)
        )
      ),
      ts.factory.createPropertyAssignment(
        'isArray',
        ts.factory.createTrue()
      )
    );
  } else {
    decoratorOptions.push(
      ts.factory.createPropertyAssignment(
        'type',
        ts.factory.createPropertyAccessExpression(
          ts.factory.createIdentifier(responseObjectName),
          ts.factory.createIdentifier(methodName)
        )
      )
    );
  }

  // Add description if provided
  if (options.description) {
    decoratorOptions.push(
      ts.factory.createPropertyAssignment(
        'description',
        ts.factory.createStringLiteral(options.description)
      )
    );
  }

  const newDecorator = ts.factory.createDecorator(
    ts.factory.createCallExpression(
      ts.factory.createIdentifier(decoratorName),
      undefined,
      [ts.factory.createObjectLiteralExpression(decoratorOptions, true)]
    )
  );

  // Remove the old InferAPIResponse decorator and add the new one
  const filteredModifiers = method.modifiers?.filter(modifier => {
    if (ts.isDecorator(modifier)) {
      const decoratorName = getDecoratorName(modifier);
      return !(decoratorName === 'InferAPIResponse');
    }
    return true;
  }) || [];

  const newModifiers = [...filteredModifiers, newDecorator];

  return ts.factory.updateMethodDeclaration(
    method,
    newModifiers,
    method.asteriskToken,
    method.name,
    method.questionToken,
    method.typeParameters,
    method.parameters,
    method.type,
    method.body
  );
}

function detectHttpMethod(method: ts.MethodDeclaration): string | null {
  const httpDecorators = ['Get', 'Post', 'Put', 'Patch', 'Delete', 'Options', 'Head'];
  
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
  // Common patterns for methods that return arrays
  const arrayPatterns = [
    'findAll',
    'getAll',
    'listAll',
    'search',
    'filter',
    'query'
  ];
  
  return arrayPatterns.some(pattern => methodName.toLowerCase().includes(pattern.toLowerCase()));
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
