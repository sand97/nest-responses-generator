# NestJS Response Generator

🚀 **Automatically generate OpenAPI/Swagger response types from your NestJS service return types - Zero duplication, maximum type safety!**

[![npm version](https://badge.fury.io/js/nest-responses-generator-plugin.svg)](https://badge.fury.io/js/nest-responses-generator-plugin)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## ✨ Features

- 🔄 **Automatic Response Generation**: Analyzes your service methods and generates corresponding Swagger response classes
- 🎯 **Zero Duplication**: No need to write separate response DTOs - they're inferred from your service return types
- 🛡️ **Type Safety**: Full TypeScript support with generated types
- 🏗️ **Build-time Generation**: Integrates seamlessly with NestJS build process via CLI plugin
- 📚 **Rich Swagger Documentation**: Automatically generates detailed OpenAPI specifications
- 🔌 **Easy Integration**: Simple plugin configuration in `nest-cli.json`
- 🎨 **Smart Decorators**: `@InferredAPIResponse` decorator automatically detects response types and HTTP status codes
- ⚡ **File Watcher Integration**: Automatically regenerates types when service files change during development
- 🔍 **Intelligent Type Inference**: Handles complex return types, shorthand properties, and conditional expressions

## 🚀 Quick Start

### Installation

```bash
npm install nest-responses-generator-plugin
# or
pnpm add nest-responses-generator-plugin
# or
yarn add nest-responses-generator-plugin
```

### Build Steps

After installation, you need to build the plugin and ensure it's properly linked in your workspace:

```bash
# 1. Build the plugin package
cd packages/plugin
pnpm run build

# 2. Install dependencies in your example app
cd examples/basic-example
pnpm install

# 3. Start the development server
pnpm run start:dev
```

**Note**: If you're using this plugin in a monorepo setup, make sure to run `pnpm install` from the workspace root to properly link all packages.

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
          "introspectComments": true,
          "controllerFilenameSuffix": [".controller.ts"],
          "dtoFilenameSuffix": [".dto.ts", ".entity.ts"]
        }
      },
      {
        "name": "nest-responses-generator-plugin",
        "options": {
          "outputDir": "src/generated",
          "servicePattern": "**/*.service.ts",
          "controllerPattern": "**/*.controller.ts",
          "clean": false
        }
      }
    ]
  }
}
```

### Plugin Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `outputDir` | `string` | `'src/generated'` | Output directory for generated files |
| `servicePattern` | `string` | `'**/*.service.ts'` | Glob pattern to match service files |
| `controllerPattern` | `string` | `'**/*.controller.ts'` | Glob pattern to match controller files |
| `clean` | `boolean` | `false` | Whether to clean output directory before generation |

## 📖 Usage

### 1. Write Your Service

```typescript
// users.service.ts
import { Injectable } from '@nestjs/common';
import { CreateUserDto, UpdateUserDto } from '../common/dto/user.dto';

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
      { id: 1, firstname: 'John', lastname: 'Doe', email: 'john@example.com', role: 'user' },
      { id: 2, firstname: 'Jane', lastname: 'Smith', email: 'jane@example.com', role: 'admin' },
    ];
  }

  findOne(id: number): User {
    return {
      id,
      firstname: 'John',
      lastname: 'Doe',
      email: 'john.doe@example.com',
      role: 'admin',
    };
  }

  update(id: number, updateUserDto: UpdateUserDto): User {
    return {
      id,
      firstname: updateUserDto.firstname || 'John',
      lastname: updateUserDto.lastname || 'Doe',
      email: updateUserDto.email || 'john.doe@example.com',
      role: updateUserDto.role || 'admin',
    };
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
    const users = this.findAll();
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedUsers = users.slice(startIndex, endIndex);
    const total = users.length;
    const totalPages = Math.ceil(total / limit);

    return {
      data: paginatedUsers,
      meta: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    };
  }
}
```

### 2. Build Your Application

When you build your NestJS application, the plugin automatically generates response classes:

```bash
npm run build
# or during development (with automatic regeneration)
npm run start:dev
```

This generates two files:

**`src/generated/responses/usersservice.response.ts`:**
```typescript
// Auto-generated - do not edit manually
import { ApiProperty } from '@nestjs/swagger';

export class UsersServiceCreateResponse {
  @ApiProperty({ example: 1, type: 'number' })
  id: number;

  @ApiProperty({ example: 'example name', type: 'string' })
  firstname: string;

  @ApiProperty({ example: 'example name', type: 'string' })
  lastname: string;

  @ApiProperty({ example: 'user@example.com', type: 'string' })
  email: string;

  @ApiProperty({ example: 'user', type: 'string' })
  role: string;
}

export class UsersServiceFindAllResponseItem {
  @ApiProperty({ example: 1, type: 'number' })
  id: number;

  @ApiProperty({ example: 'example name', type: 'string' })
  firstname: string;

  @ApiProperty({ example: 'example name', type: 'string' })
  lastname: string;

  @ApiProperty({ example: 'user@example.com', type: 'string' })
  email: string;

  @ApiProperty({ example: 'user', type: 'string' })
  role: string;
}

export class UsersServiceFindAllPaginatedResponseDataItem {
  @ApiProperty({ example: 1, type: 'number' })
  id: number;

  @ApiProperty({ example: 'example name', type: 'string' })
  firstname: string;

  @ApiProperty({ example: 'example name', type: 'string' })
  lastname: string;

  @ApiProperty({ example: 'user@example.com', type: 'string' })
  email: string;

  @ApiProperty({ example: 'user', type: 'string' })
  role: string;
}

export class UsersServiceFindAllPaginatedResponseMeta {
  @ApiProperty({ example: 1, type: 'number' })
  page: number;

  @ApiProperty({ example: 10, type: 'number' })
  limit: number;

  @ApiProperty({ example: 100, type: 'number' })
  total: number;

  @ApiProperty({ example: 10, type: 'number' })
  totalPages: number;

  @ApiProperty({ example: true, type: 'boolean' })
  hasNext: boolean;

  @ApiProperty({ example: false, type: 'boolean' })
  hasPrev: boolean;
}

export class UsersServiceFindAllPaginatedResponse {
  @ApiProperty({ isArray: true, type: UsersServiceFindAllPaginatedResponseDataItem })
  data: UsersServiceFindAllPaginatedResponseDataItem[];

  @ApiProperty({ type: UsersServiceFindAllPaginatedResponseMeta })
  meta: UsersServiceFindAllPaginatedResponseMeta;
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
  update: UsersServiceUpdateResponse,
  remove: UsersServiceRemoveResponse,
  findAllPaginated: UsersServiceFindAllPaginatedResponse,
} as const;
```

**`src/generated/index.ts`:** (Generated decorator and configuration)
```typescript
// Auto-generated - do not edit manually
import { ApiOkResponse, ApiCreatedResponse } from '@nestjs/swagger';
import * as UsersServiceResponseImport from './responses/usersservice.response';

export const RESPONSE_CONFIG = {
  UsersController: {
    create: { 
      responseClass: UsersServiceResponseImport.UsersServiceCreateResponse, 
      isArray: false, 
      status: 201 
    },
    findAll: { 
      responseClass: UsersServiceResponseImport.UsersServiceFindAllResponseItem, 
      isArray: true, 
      status: 200 
    },
    findOne: { 
      responseClass: UsersServiceResponseImport.UsersServiceFindOneResponse, 
      isArray: false, 
      status: 200 
    },
    update: { 
      responseClass: UsersServiceResponseImport.UsersServiceUpdateResponse, 
      isArray: false, 
      status: 200 
    },
    remove: { 
      responseClass: UsersServiceResponseImport.UsersServiceRemoveResponse, 
      isArray: false, 
      status: 200 
    },
    findAllPaginated: { 
      responseClass: UsersServiceResponseImport.UsersServiceFindAllPaginatedResponse, 
      isArray: false, 
      status: 200 
    },
  },
};

export function InferredAPIResponse(options: { description?: string } = {}) {
  return function (target: any, propertyKey?: string, descriptor?: PropertyDescriptor) {
    // Runtime decorator that applies correct Swagger decorators based on RESPONSE_CONFIG
    // Implementation details handled automatically
  };
}
```

### 3. Use in Your Controller

```typescript
// users.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  ParseIntPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateUserDto, UpdateUserDto } from '../common/dto/user.dto';
import { InferredAPIResponse } from '../generated'; // Import from generated index

@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @ApiOperation({
    summary: 'Create a new user',
    description: 'Creates a new user with the provided information',
  })
  @InferredAPIResponse({ description: 'User created successfully' })
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all users', description: 'Retrieves a list of all users' })
  @InferredAPIResponse({ description: 'List of users retrieved successfully' })
  findAll() {
    return this.usersService.findAll();
  }

  @Get('paginated')
  @ApiOperation({
    summary: 'Get paginated users',
    description: 'Retrieves a paginated list of users',
  })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page' })
  @InferredAPIResponse({ description: 'Paginated users retrieved successfully' })
  findAllPaginated(
    @Query('page', ParseIntPipe) page?: number,
    @Query('limit', ParseIntPipe) limit?: number
  ) {
    return this.usersService.findAllPaginated(page, limit);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get user by ID', description: 'Retrieves a specific user by their ID' })
  @ApiParam({ name: 'id', type: Number, description: "User's ID" })
  @InferredAPIResponse({ description: 'User retrieved successfully' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update user', description: 'Updates a user by their ID' })
  @ApiParam({ name: 'id', type: Number, description: "User's ID" })
  @InferredAPIResponse({ description: 'User updated successfully' })
  update(@Param('id', ParseIntPipe) id: number, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(id, updateUserDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete user', description: 'Deletes a user by their ID' })
  @ApiParam({ name: 'id', type: Number, description: "User's ID" })
  @InferredAPIResponse({ description: 'User deleted successfully' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.remove(id);
  }
}
```

## 🎯 API Reference

### Decorators

#### `@InferredAPIResponse(options?)`

🌟 **The magic decorator!** Automatically detects the correct response type and HTTP status code based on your service method and HTTP verb.

**Parameters:**
- `options`: Configuration object
  - `description`: Custom description for the response

**Features:**
- ✅ **Automatic Type Detection**: Infers response class from controller method name and service
- ✅ **HTTP Status Detection**: Uses `@ApiCreatedResponse` for `@Post` methods, `@ApiOkResponse` for others
- ✅ **Array Detection**: Automatically detects array responses (e.g., `findAll` methods)
- ✅ **Zero Configuration**: No need to specify response types manually

**Examples:**
```typescript
@Post()
@InferredAPIResponse({ description: 'User created successfully' })
// → Automatically uses @ApiCreatedResponse with UsersServiceCreateResponse

@Get()
@InferredAPIResponse({ description: 'Users retrieved successfully' })
// → Automatically uses @ApiOkResponse with UsersServiceFindAllResponseItem[] (array)

@Get(':id')
@InferredAPIResponse({ description: 'User found' })
// → Automatically uses @ApiOkResponse with UsersServiceFindOneResponse
```

#### Controller-level Usage

You can also apply `@InferredAPIResponse` to the entire controller:

```typescript
@Controller('users')
@InferredAPIResponse() // Applies to all methods in the controller
export class UsersController {
  // All methods automatically get appropriate response types
}
```

## 🔧 How It Works

### 🔍 Analysis Process

1. **Service Scanning**: The plugin scans all `*.service.ts` files during compilation
2. **Type Extraction**: Uses TypeScript's compiler API to analyze method return types
3. **Smart Inference**: Handles complex patterns like:
   - Shorthand properties (`{ id }` instead of `{ id: id }`)
   - Conditional expressions (`updateUserDto.name || 'Default'`)
   - Nested objects and arrays
   - Paginated responses with metadata
4. **Class Generation**: Creates `@ApiProperty`-decorated classes with proper examples
5. **Decorator Generation**: Creates intelligent `@InferredAPIResponse` decorator
6. **Runtime Integration**: Applies correct Swagger decorators based on HTTP methods

### 🎯 Smart Features

- **Automatic Array Detection**: Methods like `findAll()` automatically use `isArray: true`
- **HTTP Status Inference**: `@Post` methods get `@ApiCreatedResponse`, others get `@ApiOkResponse`
- **Nested Object Support**: Complex return types are properly decomposed into nested classes
- **Development-friendly**: Automatic regeneration when files change in watch mode

### 📁 Generated File Structure

```
src/
├── generated/
│   ├── index.ts              # Exported decorator and configuration
│   └── responses/
│       ├── usersservice.response.ts
│       ├── productsservice.response.ts
│       └── ...               # One file per service
```

## 🚀 Development Workflow

### During Development

```bash
npm run start:dev
```

- ✅ Plugin automatically detects service changes
- ✅ Regenerates response types in real-time
- ✅ No manual intervention required
- ✅ TypeScript compilation continues seamlessly

### Production Build

```bash
npm run build
```

- ✅ Response types generated during build
- ✅ Optimized for production
- ✅ No runtime overhead

## 🎭 Examples

Check out the [examples](./examples) directory for complete working examples:

- [Basic Example](./examples/basic-example) - Simple CRUD API demonstrating core features

## 📚 Real-World Benefits

### Before `@nest-responses-generator/plugin`

```typescript
// ❌ Lots of duplication and manual work
export class CreateUserResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'John' })
  firstname: string;
  
  // ... more properties
}

@Controller('users')
export class UsersController {
  @Post()
  @ApiCreatedResponse({ type: CreateUserResponseDto })
  create(@Body() dto: CreateUserDto) {
    return this.service.create(dto); // Returns different shape!
  }
}
```

### After `@nest-responses-generator/plugin`

```typescript
// ✅ Zero duplication, automatic synchronization
@Controller('users')
export class UsersController {
  @Post()
  @InferredAPIResponse({ description: 'User created successfully' })
  create(@Body() dto: CreateUserDto) {
    return this.service.create(dto); // Plugin infers response type automatically!
  }
}
```

### Key Improvements

- 🎯 **90% less boilerplate code**
- 🔄 **Always in sync** - response schemas match actual service return types
- ⚡ **Development speed** - focus on business logic, not documentation
- 🛡️ **Type safety** - TypeScript ensures consistency
- 📚 **Rich documentation** - automatic examples and proper OpenAPI specs

## 🔧 Troubleshooting

### Plugin Not Installed Error

If you encounter the error `"nest-responses-generator-plugin" plugin is not installed`, follow these steps:

1. **Build the plugin package**:
   ```bash
   cd packages/plugin
   pnpm run build
   ```

2. **Reinstall dependencies**:
   ```bash
   cd examples/basic-example
   pnpm install
   ```

3. **Verify plugin is properly linked**:
   ```bash
   ls node_modules/nest-responses-generator-plugin/
   ```
   You should see the `plugin.js` file and `dist/` directory.

4. **Check nest-cli.json configuration**:
   Ensure the plugin is properly configured in your `nest-cli.json`:
   ```json
   {
     "compilerOptions": {
       "plugins": [
         {
           "name": "nest-responses-generator-plugin",
           "options": { ... }
         }
       ]
     }
   }
   ```

### Common Issues

- **TypeScript compilation errors**: Make sure your service methods have explicit return types
- **Generated files not updating**: Check that the plugin has write permissions to the output directory
- **Import errors**: Ensure the generated files are not manually edited (they should be auto-generated only)

## 📦 Publishing & Development

This monorepo uses automated publishing with GitHub Actions and manual publishing scripts.

### 🚀 Automated Publishing (GitHub Actions)

The repository is configured with smart auto-publishing that detects package changes and publishes them automatically.

#### How It Works
- **Automatic Detection**: Pushes to `main` branch automatically detect which packages changed
- **Smart Versioning**: Auto-bumps versions if current version exists on npm
- **Build & Test**: Runs build and tests before publishing
- **Git Integration**: Commits version bumps back and creates tags

#### Setup Required

**1. Add NPM Token to GitHub Secrets:**
1. Generate automation token at https://www.npmjs.com/settings/tokens
2. Go to repository **Settings** → **Secrets and variables** → **Actions**
3. Add new secret: `NPM_TOKEN` with your token value

**2. Push Changes:**
```bash
# Make changes to any package
git add packages/plugin/src/new-feature.ts
git commit -m "feat: add new feature"
git push origin main

# Workflow automatically:
# → Detects changes in plugin package
# → Builds and tests the package
# → Bumps version if needed
# → Publishes to npm
# → Commits version bump back
# → Creates git tag
```

**3. Manual Trigger:**
- Go to **Actions** tab → **Auto Publish Packages** → **Run workflow**
- Choose package name, version type, and options

#### Workflow Features
- ✅ Smart package change detection
- ✅ Automatic version bumping (patch/minor/major)
- ✅ Build validation before publishing
- ✅ Git tags for published versions
- ✅ Manual trigger with custom options
- ✅ Parallel publishing for multiple packages

### 🛠 Manual Publishing

For local development and testing:

#### Quick Commands
```bash
# Publish plugin with current version
pnpm run publish:plugin

# Test publishing (dry run)
pnpm run publish:plugin:dry

# Publish with version bump
pnpm run publish:plugin:patch   # 0.0.1 → 0.0.2
pnpm run publish:plugin:minor   # 0.0.1 → 0.1.0
pnpm run publish:plugin:major   # 0.0.1 → 1.0.0
```

#### Generic Package Publishing
```bash
# Publish any package by name
node scripts/publish-package.js <package-name> [version-type]

# Examples:
node scripts/publish-package.js nest-responses-generator-plugin
node scripts/publish-package.js nest-responses-generator-plugin patch
node scripts/publish-package.js nest-responses-generator-plugin --dry-run
```

#### Publishing Process
The automated script:
1. ✅ Validates package exists in workspace
2. ✅ Updates version (if specified)
3. ✅ Builds the package
4. ✅ Runs `prepublishOnly` script
5. ✅ Publishes to npm with public access
6. ✅ Handles authentication and git checks

### 📋 Adding New Packages

To add a new publishable package to the monorepo:

1. **Create package structure:**
   ```
   packages/your-package/
   ├── package.json
   ├── src/
   └── ...
   ```

2. **Configure package.json:**
   ```json
   {
     "name": "your-package-name",
     "version": "0.0.1",
     "main": "dist/index.js",
     "types": "dist/index.d.ts",
     "files": ["dist/**/*"],
     "scripts": {
       "build": "tsc",
       "prepublishOnly": "npm run build"
     }
   }
   ```

3. **Add convenience scripts to root package.json:**
   ```json
   {
     "scripts": {
       "publish:your-package": "node scripts/publish-package.js your-package-name",
       "publish:your-package:dry": "node scripts/publish-package.js your-package-name --dry-run"
     }
   }
   ```

4. **The GitHub workflow will automatically detect and publish changes!**

### 🔍 Monitoring Publications

#### Check Published Packages
```bash
# Verify latest version on npm
npm view nest-responses-generator-plugin version

# Install published package
npm install nest-responses-generator-plugin@latest
```

#### GitHub Actions Monitoring
- Go to **Actions** tab in repository
- View workflow runs and their status
- Check detailed logs for troubleshooting

### 🛡 Security & Best Practices

#### NPM Token Security
- ✅ Use "Automation" token type for CI/CD
- ✅ Store token in GitHub repository secrets only
- ✅ Use descriptive token names
- ❌ Never commit tokens to code
- ❌ Never share tokens in logs or files

#### Version Management
- 📈 **Patch** (0.0.X): Bug fixes and small changes
- 📈 **Minor** (0.X.0): New features, backward compatible
- 📈 **Major** (X.0.0): Breaking changes

#### Git Workflow
- 🔀 All changes go through main branch
- 🏷️ Automatic git tags for releases
- 💾 Version bumps committed back to repository
- 🔄 Clean git history maintained

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is [MIT licensed](LICENSE).

## 🙏 Acknowledgments

- Built on top of the excellent [NestJS](https://nestjs.com/) framework
- Integrates seamlessly with [@nestjs/swagger](https://docs.nestjs.com/openapi/introduction)
- Inspired by the need to reduce boilerplate in API development
- Thanks to the TypeScript team for the powerful compiler API

---

🚀 **Transform your NestJS API development today!** No more response type duplication, just pure productivity.

**Happy coding! 🎉**
