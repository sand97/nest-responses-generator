import { applyDecorators, SetMetadata } from '@nestjs/common';
import { ApiOkResponse, ApiCreatedResponse, ApiResponseOptions } from '@nestjs/swagger';
import { UsersServiceResponse } from './responses/usersservice.response';

// Auto-generated response mapping configuration
export const RESPONSE_CONFIG = {
  Users: {
    create: { 
      type: UsersServiceResponse.create, 
      isArray: false,
      status: 'created'
    },
    findAll: { 
      type: UsersServiceResponse.findAll, 
      isArray: true,
      status: 'ok'
    },
    findAllPaginated: { 
      type: UsersServiceResponse.findAllPaginated, 
      isArray: false,
      status: 'ok'
    },
    findOne: { 
      type: UsersServiceResponse.findOne, 
      isArray: false,
      status: 'ok'
    },
    update: { 
      type: UsersServiceResponse.update, 
      isArray: false,
      status: 'ok'
    },
    remove: { 
      type: UsersServiceResponse.remove, 
      isArray: false,
      status: 'ok'
    }
  }
} as const;

export type ResponseConfig = typeof RESPONSE_CONFIG;

// Smart decorator that automatically applies correct Swagger decorators
export interface SmartResponseOptions extends Omit<ApiResponseOptions, 'type' | 'status'> {
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
 * Smart decorator that automatically detects and applies the correct Swagger response
 * based on the controller and method name
 */
export function SmartResponse(options: SmartResponseOptions = {}) {
  return function (target: any, propertyKey: string | symbol, descriptor: PropertyDescriptor) {
    // Get the controller class name
    const controllerName = target.constructor.name.replace('Controller', '');
    const methodName = String(propertyKey);
    
    // Get configuration for this controller and method
    const controllerConfig = (RESPONSE_CONFIG as any)[controllerName];
    if (!controllerConfig) {
      console.warn(`⚠️  No response config found for controller: ${controllerName}`);
      return descriptor;
    }
    
    const methodConfig = controllerConfig[methodName];
    if (!methodConfig) {
      console.warn(`⚠️  No response config found for method: ${controllerName}.${methodName}`);
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
export const SmartOkResponse = (options: SmartResponseOptions = {}) => 
  SmartResponse({ ...options, status: 'ok' });

export const SmartCreatedResponse = (options: SmartResponseOptions = {}) => 
  SmartResponse({ ...options, status: 'created' });