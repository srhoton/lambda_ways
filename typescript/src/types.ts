import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2, Context } from 'aws-lambda';

/**
 * Supported HTTP methods for CRUD operations
 */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

/**
 * CRUD operation types
 */
export type CrudOperation = 'CREATE' | 'READ' | 'UPDATE' | 'DELETE';

/**
 * Custom error class for validation errors
 */
export class ValidationError extends Error {
  constructor(public readonly field: string, public readonly value: unknown) {
    super(`Validation failed for field ${field}`);
    this.name = 'ValidationError';
  }
}

/**
 * Custom error class for authorization errors
 */
export class AuthorizationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthorizationError';
  }
}

/**
 * Custom error class for not found errors
 */
export class NotFoundError extends Error {
  constructor(resource: string, id: string) {
    super(`${resource} with id ${id} not found`);
    this.name = 'NotFoundError';
  }
}

/**
 * Result type for operations that can fail
 */
export type Result<T, E = Error> = 
  | { ok: true; value: T }
  | { ok: false; error: E };

/**
 * API response structure
 */
export interface ApiResponse<T = unknown> {
  statusCode: number;
  headers: Record<string, string>;
  body: string;
}

/**
 * Request context with typed event
 */
export interface RequestContext {
  event: APIGatewayProxyEventV2;
  context: Context;
  operation: CrudOperation;
  resourceId?: string;
}

/**
 * Type guard to check if value is a string
 */
export function isString(value: unknown): value is string {
  return typeof value === 'string';
}

/**
 * Type guard to check if value is non-nullable
 */
export function isNonNullable<T>(value: T): value is NonNullable<T> {
  return value !== null && value !== undefined;
}

/**
 * Type guard to check if value is a valid HTTP method
 */
export function isValidHttpMethod(method: unknown): method is HttpMethod {
  return isString(method) && ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].includes(method);
}

/**
 * Type guard to check if object has a property
 */
export function hasProperty<T extends object, K extends PropertyKey>(
  obj: T,
  prop: K
): obj is T & Record<K, unknown> {
  return prop in obj;
}

/**
 * Assertion function to ensure value is defined
 */
export function assertDefined<T>(value: T | undefined, message?: string): asserts value is T {
  if (value === undefined) {
    throw new Error(message ?? 'Value is undefined');
  }
}

/**
 * Assertion function to ensure value is not null
 */
export function assertNotNull<T>(value: T | null, message?: string): asserts value is T {
  if (value === null) {
    throw new Error(message ?? 'Value is null');
  }
}

/**
 * Standard API Gateway response headers
 */
export const STANDARD_HEADERS = {
  'Content-Type': 'application/json',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'Cache-Control': 'no-store, no-cache, must-revalidate',
  'Pragma': 'no-cache'
} as const;