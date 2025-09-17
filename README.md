# NestJS Response Generator

🚀 **Automatically generate OpenAPI/Swagger response types from your NestJS service return types - Zero duplication, maximum type safety!**

[![npm version](https://badge.fury.io/js/%40nest-responses-generator%2Fplugin.svg)](https://badge.fury.io/js/%40nest-responses-generator%2Fplugin)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## ✨ Features

- 🔄 **Automatic Response Generation**: Analyzes your service methods and generates corresponding Swagger response classes
- 🎯 **Zero Duplication**: No need to write separate response DTOs - they're inferred from your service return types
- 🛡️ **Type Safety**: Full TypeScript support with generated types
- 🏗️ **Build-time Generation**: Integrates seamlessly with NestJS build process
- 📚 **Rich Swagger Documentation**: Automatically generates detailed OpenAPI specifications
- 🔌 **Easy Integration**: Simple plugin configuration in `nest-cli.json`
- 🎨 **Smart Decorators**: `@AutoResponse` and `@AutoArrayResponse` decorators for effortless controller setup

## 🚀 Quick Start

### Installation

```bash
npm install @nest-responses-generator/plugin
# or
pnpm add @nest-responses-generator/plugin
# or
yarn add @nest-responses-generator/plugin
```

### Configuration

Add the plugin to your `nest-cli.json`:

```json
{
  "$schema": "https://json.schemastore.org/nest-cli",
  "collection": "@nestjs/schematics",
  "sourceRoot": "src",
  "compilerOptions": {
    "deleteOutDir": true,
    "plugins": [
      {
        "name": "@nestjs/swagger",
        "options": {
          "classValidatorShim": true,
          "introspectComments": true
        }
      },
      "@nest-responses-generator/plugin"
    ]
  }
}
```

### Advanced Configuration

You can customize the plugin behavior:

```json
{
  "compilerOptions": {
    "plugins": [
      {
        "name": "@nest-responses-generator/plugin",
        "options": {
          "srcDir": "src",
          "outputDir": "src/generated/responses",
          "servicePattern": "**/*.service.ts",
          "clean": true
        }
      }
    ]
  }
}
```

## 📖 Usage

### 1. Write Your Service

```typescript
// users.service.ts
import { Injectable } from '@nestjs/common';

export interface User {
  id: number;
  firstname: string;
  lastname: string;
  email: string;
  role: string;
}

@Injectable()
export class UsersService {
  create(createUserDto: CreateUserDto): User {
    return {
      id: 1,
      firstname: createUserDto.firstname,
      lastname: createUserDto.lastname,
      email: createUserDto.email,
      role: createUserDto.role,
    };
  }

  findAll(): User[] {
    return [
      { id: 1, firstname: 'John', lastname: 'Doe', email: 'john@example.com', role: 'admin' }
    ];
  }

  findOne(id: number): User {
    return { id, firstname: 'John', lastname: 'Doe', email: 'john@example.com', role: 'admin' };
  }

  remove(id: number): { deleted: boolean } {
    return { deleted: true };
  }

  findAllPaginated(page: number = 1, limit: number = 10): {
    data: User[];
    meta: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  } {
    // Implementation...
  }
}
```

### 2. Build Your Application

When you build your NestJS application, the plugin automatically generates response classes:

```bash
npm run build
# or during development
npm run start:dev
```

This generates `src/generated/responses/usersservice.response.ts`:

```typescript
// Auto-generated - do not edit manually
import { ApiProperty } from '@nestjs/swagger';

export class UsersServiceCreateResponse {
  @ApiProperty({ example: 1, type: 'number' })
  id: number;

  @ApiProperty({ example: "example name", type: 'string' })
  firstname: string;

  @ApiProperty({ example: "example name", type: 'string' })
  lastname: string;

  @ApiProperty({ example: "user@example.com", type: 'string' })
  email: string;

  @ApiProperty({ example: "user", type: 'string' })
  role: string;
}

export class UsersServiceFindAllResponseItem {
  @ApiProperty({ example: 1, type: 'number' })
  id: number;
  // ... other properties
}

export class UsersServiceRemoveResponse {
  @ApiProperty({ example: true, type: 'boolean' })
  deleted: boolean;
}

// Object to access response types by method name
export const UsersServiceResponse = {
  create: UsersServiceCreateResponse,
  findAll: UsersServiceFindAllResponseItem,
  findOne: UsersServiceFindOneResponse,
  remove: UsersServiceRemoveResponse,
  findAllPaginated: UsersServiceFindAllPaginatedResponse,
} as const;

export type UsersServiceResponseType = typeof UsersServiceResponse;
```

### 3. Use in Your Controller

```typescript
// users.controller.ts
import { Controller, Get, Post, Body, Param, Delete } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { AutoResponse, AutoArrayResponse } from '@nest-responses-generator/plugin';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';

@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new user' })
  @AutoResponse('UsersServiceCreateResponse', { 
    status: 'created', 
    includeBadRequest: true 
  })
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all users' })
  @AutoArrayResponse('UsersServiceFindAllResponseItem')
  findAll() {
    return this.usersService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get user by ID' })
  @AutoResponse('UsersServiceFindOneResponse', { includeNotFound: true })
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(+id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete user' })
  @AutoResponse('UsersServiceRemoveResponse', { includeNotFound: true })
  remove(@Param('id') id: string) {
    return this.usersService.remove(+id);
  }
}
```

## 🎯 API Reference

### Decorators

#### `@AutoResponse(responseType, options?)`

Automatically applies appropriate Swagger response decorators.

**Parameters:**
- `responseType`: String name of the generated response class
- `options`: Configuration object
  - `status`: `'ok' | 'created'` (default: `'ok'`)
  - `description`: Custom description
  - `includeNotFound`: Include 404 response (default: `false`)
  - `includeBadRequest`: Include 400 response (default: `false`)
  - `includeInternalServerError`: Include 500 response (default: `true`)

#### `@AutoArrayResponse(responseType, options?)`

Shorthand for array responses. Equivalent to `@AutoResponse([responseType], options)`.

### Plugin Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `srcDir` | `string` | `'src'` | Source directory to scan for service files |
| `outputDir` | `string` | `'src/generated/responses'` | Output directory for generated files |
| `servicePattern` | `string` | `'**/*.service.ts'` | Glob pattern to match service files |
| `clean` | `boolean` | `true` | Clean output directory before generation |

## 🔧 Advanced Usage

### Manual Generation

You can also generate responses manually:

```typescript
import { generateResponses } from '@nest-responses-generator/plugin';

// Generate with default options
await generateResponses();

// Generate with custom options
await generateResponses({
  srcDir: 'src',
  outputDir: 'src/generated/responses',
  servicePattern: '**/*.service.ts'
});
```

### Custom Scripts

Add a script to your `package.json`:

```json
{
  "scripts": {
    "generate:responses": "node -e \"require('@nest-responses-generator/plugin').generateResponses()\""
  }
}
```

## 🏗️ How It Works

1. **Analysis Phase**: The plugin scans your service files during the build process
2. **Type Extraction**: It analyzes method return types using TypeScript's compiler API
3. **Class Generation**: Generates response classes with appropriate `@ApiProperty` decorators
4. **Response Object**: Creates a mapping object for easy access in controllers
5. **Integration**: Works seamlessly with NestJS Swagger plugin for complete documentation

## 🎭 Examples

Check out the [examples](./examples) directory for complete working examples:

- [Basic Example](./examples/basic-example) - Simple CRUD API demonstrating core features

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is [MIT licensed](LICENSE).

## 🙏 Acknowledgments

- Built on top of the excellent [NestJS](https://nestjs.com/) framework
- Integrates seamlessly with [@nestjs/swagger](https://docs.nestjs.com/openapi/introduction)
- Inspired by the need to reduce boilerplate in API development

---

**Happy coding! 🚀**
