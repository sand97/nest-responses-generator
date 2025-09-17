import { applyDecorators, Type } from '@nestjs/common';
import {
  ApiOkResponse,
  ApiCreatedResponse,
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiInternalServerErrorResponse,
} from '@nestjs/swagger';

export interface AutoResponseOptions {
  status?: 'ok' | 'created';
  description?: string;
  includeNotFound?: boolean;
  includeBadRequest?: boolean;
  includeInternalServerError?: boolean;
}

/**
 * Automatically applies Swagger response decorators based on the generated response type
 *
 * @param responseType - The generated response class from the ServiceResponseGenerator
 * @param options - Configuration options for additional error responses
 *
 * @example
 * ```typescript
 * // Import the generated responses
 * import { UsersServiceResponse } from '../generated/responses/usersservice.response';
 *
 * @Get()
 * @AutoResponse(UsersServiceResponse.findAll)
 * findAll() {
 *   return this.usersService.findAll();
 * }
 *
 * @Post()
 * @AutoResponse(UsersServiceResponse.create, {
 *   status: 'created',
 *   includeBadRequest: true
 * })
 * create(@Body() createUserDto: CreateUserDto) {
 *   return this.usersService.create(createUserDto);
 * }
 * ```
 */
export function AutoResponse(
  responseType: Type<any> | [Type<any>],
  options: AutoResponseOptions = {}
) {
  const {
    status = 'ok',
    description,
    includeNotFound = false,
    includeBadRequest = false,
    includeInternalServerError = true,
  } = options;

  const decorators: Array<MethodDecorator | ClassDecorator> = [];

  // Determine if it's an array response
  const isArrayResponse = Array.isArray(responseType);
  const responseTypeToUse = isArrayResponse ? responseType : responseType;

  // Add main response decorator
  const responseDecorator = status === 'created' ? ApiCreatedResponse : ApiOkResponse;

  decorators.push(
    responseDecorator({
      description: description || 'Success response',
      type: responseTypeToUse,
    })
  );

  // Add error response decorators
  if (includeInternalServerError) {
    decorators.push(
      ApiInternalServerErrorResponse({
        description: 'Internal server error',
      })
    );
  }

  if (includeBadRequest) {
    decorators.push(
      ApiBadRequestResponse({
        description: 'Bad request',
      })
    );
  }

  if (includeNotFound) {
    decorators.push(
      ApiNotFoundResponse({
        description: 'Resource not found',
      })
    );
  }

  return applyDecorators(...decorators);
}

/**
 * Shorthand for array responses
 *
 * @example
 * ```typescript
 * @Get()
 * @AutoArrayResponse(UsersServiceResponse.findAll)
 * findAll() {
 *   return this.usersService.findAll();
 * }
 * ```
 */
export function AutoArrayResponse(
  responseType: Type<any>,
  options: Omit<AutoResponseOptions, 'status'> = {}
) {
  return AutoResponse([responseType], { ...options, status: 'ok' });
}
