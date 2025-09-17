# @nest-responses-generator/plugin

🚀 **NestJS plugin that automatically generates Swagger response types from service return types**

This is the core plugin package for the NestJS Response Generator. It provides automatic generation of OpenAPI/Swagger response specifications based on inferred types from your service functions.

## Installation

```bash
npm install @nest-responses-generator/plugin
```

## Quick Setup

1. Add to your `nest-cli.json`:

```json
{
  "compilerOptions": {
    "plugins": [
      "@nest-responses-generator/plugin"
    ]
  }
}
```

2. Use the generated responses in your controllers:

```typescript
import { AutoResponse } from '@nest-responses-generator/plugin';

@Controller('users')
export class UsersController {
  @Get()
  @AutoResponse('UsersServiceFindAllResponseItem')
  findAll() {
    return this.usersService.findAll();
  }
}
```

## Documentation

For complete documentation, examples, and usage guides, see the [main repository](https://github.com/your-username/nest-responses-generator).

## Features

- ✅ Zero duplication - no need to write separate response DTOs
- ✅ Automatic build-time generation
- ✅ Full TypeScript support
- ✅ Smart decorator system
- ✅ Rich Swagger documentation

## License

MIT
