import { applyDecorators, SetMetadata } from '@nestjs/common';
import { ApiOkResponse, ApiCreatedResponse, ApiResponseOptions } from '@nestjs/swagger';

export const INFER_RESPONSE_METADATA_KEY = 'INFER_RESPONSE_OPTIONS';

export interface InferAPIResponseOptions extends Omit<ApiResponseOptions, 'type' | 'status'> {
  /**
   * HTTP status type for the response
   * @default 'ok'
   */
  status?: 'ok' | 'created';
  
  /**
   * Whether the response is an array
   * @default false
   */
  isArray?: boolean;
  
  /**
   * Service name override (if different from controller name)
   */
  serviceName?: string;
  
  /**
   * Method name override (if different from controller method name)
   */
  methodName?: string;
}

/**
 * Decorator that automatically infers and applies API response decorators
 * based on generated response types from services.
 * 
 * Can be applied to:
 * - Individual controller methods
 * - Entire controller class (affects all methods)
 * 
 * @example
 * ```typescript
 * // Apply to individual method - automatically detects if @Post(), @Get(), etc.
 * @Get()
 * @InferAPIResponse({ description: 'Get all users', isArray: true })
 * findAll() {
 *   return this.usersService.findAll();
 * }
 * 
 * // Apply to entire controller
 * @Controller('users')
 * @InferAPIResponse()
 * export class UsersController {
 *   @Get() // Will automatically get response type and detect it's a GET
 *   findAll() { ... }
 * }
 * ```
 */
export function InferAPIResponse(options: InferAPIResponseOptions = {}) {
  // Store metadata for the transformer to process
  return applyDecorators(
    SetMetadata(INFER_RESPONSE_METADATA_KEY, options)
  );
}

/**
 * Runtime helper function to apply the actual Swagger decorators
 * This will be called by the transformer with the resolved response type
 */
export function applyInferredResponse(
  responseClass: any,
  options: InferAPIResponseOptions = {}
): MethodDecorator {
  const {
    status = 'ok',
    isArray = false,
    description,
    ...restOptions
  } = options;

  const responseDecorator = status === 'created' ? ApiCreatedResponse : ApiOkResponse;
  
  const responseOptions: ApiResponseOptions = {
    ...restOptions,
    description: description || 'Success response',
  };

  if (isArray) {
    responseOptions.type = responseClass;
    responseOptions.isArray = true;
  } else {
    responseOptions.type = responseClass;
  }

  return responseDecorator(responseOptions);
}
