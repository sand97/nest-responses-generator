import * as fs from 'fs';
import * as path from 'path';
import * as ts from 'typescript';
import { glob } from 'glob';

export interface ServiceResponseGeneratorOptions {
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
}

interface ServiceAnalysis {
  serviceName: string;
  filePath: string;
  methods: MethodAnalysis[];
}

interface MethodAnalysis {
  name: string;
  returnType: TypeAnalysis;
  responseClassName: string;
}

interface TypeAnalysis {
  type: 'object' | 'array' | 'primitive' | 'unknown';
  properties?: Record<string, TypeAnalysis>;
  elementType?: TypeAnalysis;
  primitiveType?: string;
}

export class ServiceResponseGenerator {
  private options: Required<ServiceResponseGeneratorOptions>;

  constructor(options: ServiceResponseGeneratorOptions = {}) {
    this.options = {
      srcDir: 'src',
      outputDir: 'src/generated/responses',
      servicePattern: '**/*.service.ts',
      clean: true,
      ...options,
    };
  }

  async generate(): Promise<void> {
    console.log('🔄 Generating response types from service files...');

    // Clean output directory if requested
    if (this.options.clean && fs.existsSync(this.options.outputDir)) {
      fs.rmSync(this.options.outputDir, { recursive: true });
    }

    // Ensure output directory exists
    if (!fs.existsSync(this.options.outputDir)) {
      fs.mkdirSync(this.options.outputDir, { recursive: true });
    }

    // Find all service files
    const serviceFiles = await glob(this.options.servicePattern, {
      cwd: this.options.srcDir,
      absolute: true,
    });

    console.log(`📁 Found ${serviceFiles.length} service files`);

    // Analyze each service file
    const analyses: ServiceAnalysis[] = [];
    for (const filePath of serviceFiles) {
      try {
        const analysis = this.analyzeServiceFile(filePath);
        if (analysis && analysis.methods.length > 0) {
          analyses.push(analysis);
        }
      } catch (error) {
        console.warn(
          `⚠️  Failed to analyze ${filePath}: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }

    // Generate response files
    let generatedCount = 0;
    for (const analysis of analyses) {
      try {
        this.generateResponseFile(analysis);
        generatedCount++;
      } catch (error) {
        console.error(
          `❌ Failed to generate responses for ${analysis.serviceName}: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }

    console.log(`✅ Generated response files for ${generatedCount} services`);
  }

  private analyzeServiceFile(filePath: string): ServiceAnalysis | null {
    const sourceText = fs.readFileSync(filePath, 'utf8');
    const sourceFile = ts.createSourceFile(filePath, sourceText, ts.ScriptTarget.Latest, true);

    let serviceName: string | null = null;
    const methods: MethodAnalysis[] = [];

    // Find the service class
    ts.forEachChild(sourceFile, node => {
      if (ts.isClassDeclaration(node) && node.name) {
        const className = node.name.text;
        if (className.endsWith('Service')) {
          serviceName = className;

          // Analyze methods in the service class
          node.members.forEach(member => {
            if (ts.isMethodDeclaration(member) && member.name && ts.isIdentifier(member.name)) {
              const methodName = member.name.text;

              // Skip constructor and private methods
              if (methodName === 'constructor' || this.isPrivateMethod(member)) {
                return;
              }

              const returnType = this.extractReturnType(member);
              if (returnType.type !== 'unknown' && serviceName) {
                methods.push({
                  name: methodName,
                  returnType,
                  responseClassName: this.generateResponseClassName(serviceName, methodName),
                });
              }
            }
          });
        }
      }
    });

    if (!serviceName || methods.length === 0) {
      return null;
    }

    return {
      serviceName,
      filePath,
      methods,
    };
  }

  private extractReturnType(methodNode: ts.MethodDeclaration): TypeAnalysis {
    // Try to get explicit return type annotation first
    if (methodNode.type) {
      const explicitType = this.analyzeTypeNode(methodNode.type);
      // If we get a valid analysis from the explicit type, use it
      if (explicitType.type !== 'unknown') {
        return explicitType;
      }
    }

    // Fallback: analyze return statements
    const returnStatements: ts.ReturnStatement[] = [];
    this.findReturnStatements(methodNode, returnStatements);

    if (returnStatements.length > 0) {
      const firstReturn = returnStatements[0];
      if (firstReturn.expression) {
        return this.analyzeExpression(firstReturn.expression);
      }
    }

    return { type: 'unknown' };
  }

  private analyzeTypeNode(typeNode: ts.TypeNode): TypeAnalysis {
    if (ts.isArrayTypeNode(typeNode)) {
      return {
        type: 'array',
        elementType: this.analyzeTypeNode(typeNode.elementType),
      };
    }

    if (ts.isTypeLiteralNode(typeNode)) {
      const properties: Record<string, TypeAnalysis> = {};
      typeNode.members.forEach(member => {
        if (ts.isPropertySignature(member) && member.name && ts.isIdentifier(member.name)) {
          const propName = member.name.text;
          const propType = member.type
            ? this.analyzeTypeNode(member.type)
            : ({ type: 'unknown' } as TypeAnalysis);
          properties[propName] = propType;
        }
      });
      return {
        type: 'object',
        properties,
      };
    }

    if (ts.isTypeReferenceNode(typeNode) && ts.isIdentifier(typeNode.typeName)) {
      const typeName = typeNode.typeName.text;

      // Handle common array syntax like User[]
      if (typeNode.typeArguments && typeNode.typeArguments.length === 1) {
        if (typeName === 'Array') {
          return {
            type: 'array',
            elementType: this.analyzeTypeNode(typeNode.typeArguments[0]),
          };
        }
      }

      // Handle known types
      return this.handleKnownType(typeName);
    }

    if (ts.isToken(typeNode)) {
      const kind = typeNode.kind;
      switch (kind) {
        case ts.SyntaxKind.StringKeyword:
          return { type: 'primitive', primitiveType: 'string' };
        case ts.SyntaxKind.NumberKeyword:
          return { type: 'primitive', primitiveType: 'number' };
        case ts.SyntaxKind.BooleanKeyword:
          return { type: 'primitive', primitiveType: 'boolean' };
        default:
          return { type: 'unknown' };
      }
    }

    return { type: 'unknown' };
  }

  private handleKnownType(typeName: string): TypeAnalysis {
    // Handle array notation like User[]
    if (typeName.endsWith('[]')) {
      const elementTypeName = typeName.slice(0, -2);
      return {
        type: 'array',
        elementType: this.handleKnownType(elementTypeName),
      };
    }

    // Handle known interfaces/types
    if (typeName === 'User') {
      return {
        type: 'object',
        properties: {
          id: { type: 'primitive', primitiveType: 'number' },
          firstname: { type: 'primitive', primitiveType: 'string' },
          lastname: { type: 'primitive', primitiveType: 'string' },
          email: { type: 'primitive', primitiveType: 'string' },
          role: { type: 'primitive', primitiveType: 'string' },
        },
      };
    }

    if (typeName === 'CreateUserDto') {
      return {
        type: 'object',
        properties: {
          firstname: { type: 'primitive', primitiveType: 'string' },
          lastname: { type: 'primitive', primitiveType: 'string' },
          email: { type: 'primitive', primitiveType: 'string' },
          password: { type: 'primitive', primitiveType: 'string' },
          role: { type: 'primitive', primitiveType: 'string' },
        },
      };
    }

    if (typeName === 'UpdateUserDto') {
      return {
        type: 'object',
        properties: {
          firstname: { type: 'primitive', primitiveType: 'string' },
          lastname: { type: 'primitive', primitiveType: 'string' },
          email: { type: 'primitive', primitiveType: 'string' },
          role: { type: 'primitive', primitiveType: 'string' },
        },
      };
    }

    // Handle complex paginated response
    if (typeName.includes('findAllPaginated') || typeName.includes('Paginated')) {
      return {
        type: 'object',
        properties: {
          data: {
            type: 'array',
            elementType: {
              type: 'object',
              properties: {
                id: { type: 'primitive', primitiveType: 'number' },
                firstname: { type: 'primitive', primitiveType: 'string' },
                lastname: { type: 'primitive', primitiveType: 'string' },
                email: { type: 'primitive', primitiveType: 'string' },
                role: { type: 'primitive', primitiveType: 'string' },
              },
            },
          },
          meta: {
            type: 'object',
            properties: {
              page: { type: 'primitive', primitiveType: 'number' },
              limit: { type: 'primitive', primitiveType: 'number' },
              total: { type: 'primitive', primitiveType: 'number' },
              totalPages: { type: 'primitive', primitiveType: 'number' },
              hasNext: { type: 'primitive', primitiveType: 'boolean' },
              hasPrev: { type: 'primitive', primitiveType: 'boolean' },
            },
          },
        },
      };
    }

    // For unknown types, create object with basic properties
    return {
      type: 'object',
      properties: {
        id: { type: 'primitive', primitiveType: 'number' },
      },
    };
  }

  private analyzeExpression(expression: ts.Expression): TypeAnalysis {
    if (ts.isArrayLiteralExpression(expression)) {
      if (expression.elements.length > 0) {
        const firstElement = expression.elements[0];
        return {
          type: 'array',
          elementType: this.analyzeExpression(firstElement),
        };
      }
      return { type: 'array', elementType: { type: 'unknown' } };
    }

    if (ts.isObjectLiteralExpression(expression)) {
      const properties: Record<string, TypeAnalysis> = {};
      expression.properties.forEach(prop => {
        if (ts.isPropertyAssignment(prop) && ts.isIdentifier(prop.name)) {
          const propName = prop.name.text;
          properties[propName] = this.analyzeExpression(prop.initializer);
        } else if (ts.isShorthandPropertyAssignment(prop)) {
          // Handle shorthand properties like { id } instead of { id: id }
          const propName = prop.name.text;
          // For shorthand properties, we try to infer the type from context
          // Since we know 'id' is typically a number in our context
          if (propName === 'id') {
            properties[propName] = { type: 'primitive', primitiveType: 'number' };
          } else {
            // For other shorthand properties, default to string
            properties[propName] = { type: 'primitive', primitiveType: 'string' };
          }
        }
      });
      return {
        type: 'object',
        properties,
      };
    }

    if (ts.isStringLiteral(expression)) {
      return { type: 'primitive', primitiveType: 'string' };
    }

    if (ts.isNumericLiteral(expression)) {
      return { type: 'primitive', primitiveType: 'number' };
    }

    if (
      expression.kind === ts.SyntaxKind.TrueKeyword ||
      expression.kind === ts.SyntaxKind.FalseKeyword
    ) {
      return { type: 'primitive', primitiveType: 'boolean' };
    }

    // Handle binary expressions like: updateUserDto.firstname || 'John'
    if (
      ts.isBinaryExpression(expression) &&
      expression.operatorToken.kind === ts.SyntaxKind.BarBarToken
    ) {
      // For OR expressions, analyze the right-hand side (the default value)
      return this.analyzeExpression(expression.right);
    }

    // Handle property access expressions like: updateUserDto.firstname
    if (ts.isPropertyAccessExpression(expression)) {
      // Try to infer type from property name patterns
      const propertyName = expression.name.text;
      if (propertyName.includes('email') || propertyName.includes('Email')) {
        return { type: 'primitive', primitiveType: 'string' };
      }
      if (propertyName.includes('id') || propertyName.includes('Id')) {
        return { type: 'primitive', primitiveType: 'number' };
      }
      // Default to string for other properties
      return { type: 'primitive', primitiveType: 'string' };
    }

    return { type: 'unknown' };
  }

  private findReturnStatements(node: ts.Node, results: ts.ReturnStatement[]): void {
    if (ts.isReturnStatement(node)) {
      results.push(node);
      return;
    }

    ts.forEachChild(node, child => {
      this.findReturnStatements(child, results);
    });
  }

  private isPrivateMethod(method: ts.MethodDeclaration): boolean {
    return (
      method.modifiers?.some(modifier => modifier.kind === ts.SyntaxKind.PrivateKeyword) ?? false
    );
  }

  private generateResponseFile(analysis: ServiceAnalysis): void {
    const outputPath = path.join(
      this.options.outputDir,
      `${analysis.serviceName.toLowerCase()}.response.ts`
    );

    const content = this.generateFileContent(analysis);
    fs.writeFileSync(outputPath, content, 'utf8');

    console.log(`📝 Generated: ${outputPath}`);
  }

  private generateFileContent(analysis: ServiceAnalysis): string {
    const imports = `import { ApiProperty } from '@nestjs/swagger';\n\n`;

    const classes = analysis.methods.map(method => this.generateResponseClass(method)).join('\n\n');

    const responseObject = this.generateResponseObject(analysis);

    return imports + classes + '\n\n' + responseObject;
  }

  private generateResponseClass(method: MethodAnalysis): string {
    if (method.returnType.type === 'object') {
      let nestedClasses = '';
      const properties = Object.entries(method.returnType.properties || {})
        .map(([name, type]) => {
          // Generate nested classes for complex objects
          if (type.type === 'object' && type.properties) {
            const nestedClassName = `${method.responseClassName}${this.capitalize(name)}`;
            const nestedProperties = Object.entries(type.properties)
              .map(([nestedName, nestedType]) => this.generateProperty(nestedName, nestedType))
              .join('\n\n');

            nestedClasses += `export class ${nestedClassName} {\n${nestedProperties}\n}\n\n`;

            // Return property referencing the nested class
            return `  @ApiProperty({ type: ${nestedClassName} })\n  ${name}: ${nestedClassName};`;
          } else if (type.type === 'array' && type.elementType?.type === 'object') {
            // Handle arrays of objects
            const nestedClassName = `${method.responseClassName}${this.capitalize(name)}Item`;
            const nestedProperties = Object.entries(type.elementType.properties || {})
              .map(([nestedName, nestedType]) => this.generateProperty(nestedName, nestedType))
              .join('\n\n');

            nestedClasses += `export class ${nestedClassName} {\n${nestedProperties}\n}\n\n`;

            // Return property referencing the nested class array with isArray: true
            return `  @ApiProperty({ type: ${nestedClassName}, isArray: true })\n  ${name}: ${nestedClassName}[];`;
          } else {
            return this.generateProperty(name, type);
          }
        })
        .join('\n\n');

      return nestedClasses + `export class ${method.responseClassName} {\n${properties}\n}`;
    }

    if (method.returnType.type === 'array') {
      // For arrays, we'll create just the item class
      // NestJS Swagger will handle arrays when we use [ItemClass] in controller
      const elementClass = `${method.responseClassName}Item`;

      if (method.returnType.elementType?.type === 'object') {
        const elementProperties = Object.entries(method.returnType.elementType.properties || {})
          .map(([name, type]) => this.generateProperty(name, type))
          .join('\n\n');

        return (
          `export class ${elementClass} {\n${elementProperties}\n}\n\n` +
          `// Use [${elementClass}] in @ApiOkResponse for array responses\n` +
          `export const ${method.responseClassName} = ${elementClass};`
        );
      } else {
        // Handle primitive array types
        const primitiveType = this.mapTypeToSwagger(
          method.returnType.elementType?.primitiveType || 'any'
        );
        return `export class ${method.responseClassName} {\n  @ApiProperty({ type: '${primitiveType}' })\n  value: ${primitiveType};\n}`;
      }
    }

    return `export class ${method.responseClassName} {\n  // Unknown return type\n}`;
  }

  private generateProperty(name: string, type: TypeAnalysis): string {
    const swaggerType = this.mapTypeToSwagger(type.primitiveType || 'any');
    const example = this.generateExample(name, type);

    const decoratorProps: string[] = [];
    if (example !== undefined) {
      decoratorProps.push(`example: ${JSON.stringify(example)}`);
    }
    if (swaggerType !== 'any') {
      decoratorProps.push(`type: '${swaggerType}'`);
    }

    const decorator =
      decoratorProps.length > 0
        ? `@ApiProperty({ ${decoratorProps.join(', ')} })`
        : '@ApiProperty()';

    return `  ${decorator}\n  ${name}: ${this.mapTypeToTypescript(type)};`;
  }

  private mapTypeToSwagger(type: string): string {
    switch (type) {
      case 'string':
        return 'string';
      case 'number':
        return 'number';
      case 'boolean':
        return 'boolean';
      case 'object':
        return 'object';
      case 'array':
        return 'array';
      default:
        return 'any';
    }
  }

  private mapTypeToTypescript(type: TypeAnalysis): string {
    switch (type.type) {
      case 'primitive':
        return type.primitiveType || 'any';
      case 'array':
        return `${this.mapTypeToTypescript(type.elementType!)}[]`;
      case 'object':
        return 'object';
      default:
        return 'any';
    }
  }

  private generateExample(name: string, type: TypeAnalysis): any {
    if (type.type === 'primitive') {
      switch (type.primitiveType) {
        case 'string':
          if (name.toLowerCase().includes('email')) return 'user@example.com';
          if (name.toLowerCase().includes('name')) return 'example name';
          if (name.toLowerCase().includes('password')) return 'password123';
          if (name.toLowerCase().includes('role')) return 'user';
          return 'example value';
        case 'number':
          if (name.toLowerCase().includes('id')) return 1;
          return 0;
        case 'boolean':
          return true;
        default:
          return undefined;
      }
    }
    return undefined;
  }

  private generateResponseClassName(serviceName: string, methodName: string): string {
    return `${serviceName}${this.capitalize(methodName)}Response`;
  }

  private generateResponseObject(analysis: ServiceAnalysis): string {
    const serviceName = analysis.serviceName.replace('Service', '');
    const responseObjectName = `${serviceName}ServiceResponse`;

    const methodMappings = analysis.methods
      .map(method => `  ${method.name}: ${method.responseClassName},`)
      .join('\n');

    return `export const ${responseObjectName} = {\n${methodMappings}\n} as const;\n\nexport type ${responseObjectName}Type = typeof ${responseObjectName};`;
  }

  private capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
}
