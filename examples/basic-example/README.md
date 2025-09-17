# Basic Example - NestJS Response Generator

This example demonstrates the basic usage of `@nest-responses-generator/plugin` with a simple CRUD API.

## Features Demonstrated

- ✅ Automatic response type generation from service methods
- ✅ Use of `@AutoResponse` and `@AutoArrayResponse` decorators
- ✅ Integration with NestJS Swagger
- ✅ Different response patterns (single objects, arrays, paginated results)

## Running the Example

1. **Install dependencies** (from the monorepo root):
   ```bash
   pnpm install
   ```

2. **Build the plugin**:
   ```bash
   pnpm --filter @nest-responses-generator/plugin run build
   ```

3. **Start the example**:
   ```bash
   pnpm run example:basic
   ```

4. **View the API documentation**:
   - Application: http://localhost:3000
   - Swagger UI: http://localhost:3000/docs
   - OpenAPI JSON: http://localhost:3000/docs-json

## What Gets Generated

When you build this example, the plugin will generate `src/generated/responses/usersservice.response.ts` with:

- `UsersServiceCreateResponse` - Response for creating a user
- `UsersServiceFindAllResponseItem` - Item type for user arrays
- `UsersServiceFindOneResponse` - Response for getting a single user
- `UsersServiceUpdateResponse` - Response for updating a user
- `UsersServiceRemoveResponse` - Response for deleting a user
- `UsersServiceFindAllPaginatedResponse` - Response for paginated user lists

## Project Structure

```
src/
├── main.ts                 # Application entry point
├── app.module.ts          # Root module
├── common/
│   └── dto/
│       └── user.dto.ts    # User DTOs and interfaces
├── users/
│   ├── users.module.ts    # Users module
│   ├── users.service.ts   # Users service (analyzed by plugin)
│   └── users.controller.ts # Users controller (uses generated types)
└── generated/
    └── responses/
        └── usersservice.response.ts # Generated response types
```

## Key Points

1. **Service Return Types**: The `UsersService` methods have explicit return types that the plugin analyzes
2. **Controller Decorators**: The controller uses `@AutoResponse` and `@AutoArrayResponse` with string references to generated classes
3. **Build Integration**: Response generation happens automatically during the NestJS build process
4. **Swagger Integration**: Generated types are automatically integrated with the Swagger documentation

## Try It Out

1. Check the generated Swagger documentation at http://localhost:3000/docs
2. Notice how all endpoints have proper response schemas
3. Try the API endpoints and see the typed responses
4. Modify the service return types and see how the generated responses update

This example shows how you can eliminate response type duplication while maintaining full type safety and rich API documentation!
