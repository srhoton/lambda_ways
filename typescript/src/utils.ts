import { Logger } from '@aws-lambda-powertools/logger';
import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2, Context } from 'aws-lambda';

import type { CrudOperation, HttpMethod, RequestContext, Result } from './types';
import { STANDARD_HEADERS, ValidationError, isString, isValidHttpMethod } from './types';

/**
 * Logger instance for the Lambda function
 */
export const logger = new Logger({
  serviceName: 'typescript-lambda-crud',
  logLevel: (process.env['LOG_LEVEL'] ?? 'INFO') as 'DEBUG' | 'INFO' | 'WARN' | 'ERROR'
});

/**
 * Creates a standardized API response
 * @param statusCode - HTTP status code
 * @param body - Response body (will be JSON stringified)
 * @param headers - Additional headers to include
 * @returns API Gateway proxy result
 */
export function createApiResponse<T>(
  statusCode: number,
  body: T,
  headers: Record<string, string> = {}
): APIGatewayProxyResultV2 {
  return {
    statusCode,
    headers: {
      ...STANDARD_HEADERS,
      ...headers
    },
    body: JSON.stringify(body)
  };
}

/**
 * Creates a success response
 * @param data - Response data
 * @param statusCode - HTTP status code (defaults to 200)
 * @returns API Gateway proxy result
 */
export function successResponse<T>(
  data: T,
  statusCode: number = 200
): APIGatewayProxyResultV2 {
  return createApiResponse(statusCode, {
    success: true,
    data
  });
}

/**
 * Creates an error response
 * @param error - Error object or message
 * @param statusCode - HTTP status code (defaults to 500)
 * @returns API Gateway proxy result
 */
export function errorResponse(
  error: Error | string,
  statusCode: number = 500
): APIGatewayProxyResultV2 {
  const errorMessage = error instanceof Error ? error.message : error;
  const errorName = error instanceof Error ? error.name : 'Error';
  
  logger.error('API Error', {
    statusCode,
    errorName,
    errorMessage,
    stack: error instanceof Error ? error.stack : undefined
  });

  return createApiResponse(statusCode, {
    success: false,
    error: {
      name: errorName,
      message: errorMessage
    }
  });
}

/**
 * Maps HTTP methods to CRUD operations
 * @param method - HTTP method
 * @param hasResourceId - Whether the request includes a resource ID
 * @returns CRUD operation type
 */
export function mapHttpMethodToCrudOperation(
  method: HttpMethod,
  hasResourceId: boolean
): Result<CrudOperation> {
  switch (method) {
    case 'GET':
      return { ok: true, value: 'READ' };
    case 'POST':
      return { ok: true, value: 'CREATE' };
    case 'PUT':
    case 'PATCH':
      return hasResourceId 
        ? { ok: true, value: 'UPDATE' }
        : { ok: false, error: new ValidationError('resourceId', 'Resource ID required for update operations') };
    case 'DELETE':
      return hasResourceId
        ? { ok: true, value: 'DELETE' }
        : { ok: false, error: new ValidationError('resourceId', 'Resource ID required for delete operations') };
    default:
      return { ok: false, error: new Error(`Unsupported HTTP method: ${method}`) };
  }
}

/**
 * Extracts resource ID from path parameters
 * @param event - API Gateway event
 * @returns Resource ID if present
 */
export function extractResourceId(event: APIGatewayProxyEventV2): string | undefined {
  const pathParameters = event.pathParameters;
  if (!pathParameters) {
    return undefined;
  }

  // Common parameter names for resource IDs
  const idParameterNames = ['id', 'resourceId', 'itemId', 'entityId'];
  
  for (const paramName of idParameterNames) {
    const value = pathParameters[paramName];
    if (isString(value) && value.length > 0) {
      return value;
    }
  }

  // Check for any parameter that looks like an ID
  const entries = Object.entries(pathParameters);
  for (const [key, value] of entries) {
    if (key.toLowerCase().includes('id') && isString(value) && value.length > 0) {
      return value;
    }
  }

  return undefined;
}

/**
 * Safely parses JSON from request body
 * @param body - Request body string
 * @returns Parsed JSON or error
 */
export function parseRequestBody(body: string | undefined): Result<unknown> {
  if (!body) {
    return { ok: true, value: {} };
  }

  try {
    const parsed: unknown = JSON.parse(body);
    return { ok: true, value: parsed };
  } catch (error) {
    return { 
      ok: false, 
      error: new ValidationError('body', `Invalid JSON: ${error instanceof Error ? error.message : 'Unknown error'}`)
    };
  }
}

/**
 * Creates a request context from API Gateway event
 * @param event - API Gateway event
 * @param context - Lambda context
 * @returns Request context or error
 */
export function createRequestContext(
  event: APIGatewayProxyEventV2,
  context: Context
): Result<RequestContext> {
  const method = event.requestContext.http.method;
  
  if (!isValidHttpMethod(method)) {
    return {
      ok: false,
      error: new ValidationError('method', `Invalid HTTP method: ${method}`)
    };
  }

  const resourceId = extractResourceId(event);
  const operationResult = mapHttpMethodToCrudOperation(method, resourceId !== undefined);

  if (!operationResult.ok) {
    return operationResult;
  }

  return {
    ok: true,
    value: {
      event,
      context,
      operation: operationResult.value,
      resourceId: resourceId
    }
  };
}

/**
 * Logs request details
 * @param context - Request context
 */
export function logRequest(context: RequestContext): void {
  const { event, operation, resourceId } = context;
  
  logger.info('Incoming request', {
    operation,
    resourceId,
    method: event.requestContext.http.method,
    path: event.requestContext.http.path,
    sourceIp: event.requestContext.http.sourceIp,
    userAgent: event.requestContext.http.userAgent,
    requestId: event.requestContext.requestId,
    accountId: event.requestContext.accountId,
    stage: event.requestContext.stage,
    headers: event.headers,
    queryStringParameters: event.queryStringParameters,
    hasBody: !!event.body,
    bodyLength: event.body?.length ?? 0
  });
}

/**
 * Sanitizes input to prevent injection attacks
 * @param input - Input string to sanitize
 * @returns Sanitized string
 */
export function sanitizeInput(input: string): string {
  // Remove any control characters
  let sanitized = input.replace(/[\x00-\x1F\x7F-\x9F]/g, '');
  
  // Limit length to prevent DoS
  const MAX_INPUT_LENGTH = 10000;
  if (sanitized.length > MAX_INPUT_LENGTH) {
    sanitized = sanitized.substring(0, MAX_INPUT_LENGTH);
  }
  
  return sanitized;
}

/**
 * Validates and sanitizes an object's string properties
 * @param obj - Object to validate
 * @returns Validated object or error
 */
export function validateAndSanitizeObject(obj: unknown): Result<Record<string, unknown>> {
  if (typeof obj !== 'object' || obj === null) {
    return {
      ok: false,
      error: new ValidationError('object', 'Expected an object')
    };
  }

  const sanitized: Record<string, unknown> = {};
  const entries = Object.entries(obj as Record<string, unknown>);

  for (const [key, value] of entries) {
    // Validate key
    if (!isString(key) || key.length === 0 || key.length > 100) {
      return {
        ok: false,
        error: new ValidationError('key', `Invalid key: ${key}`)
      };
    }

    // Sanitize string values
    if (isString(value)) {
      sanitized[key] = sanitizeInput(value);
    } else if (typeof value === 'object' && value !== null) {
      // Recursively validate nested objects
      const nestedResult = validateAndSanitizeObject(value);
      if (!nestedResult.ok) {
        return nestedResult;
      }
      sanitized[key] = nestedResult.value;
    } else {
      sanitized[key] = value;
    }
  }

  return { ok: true, value: sanitized };
}