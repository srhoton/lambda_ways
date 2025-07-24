import type { APIGatewayProxyEventV2, Context } from 'aws-lambda';

import { ValidationError } from '../types';
import {
  createApiResponse,
  createRequestContext,
  errorResponse,
  extractResourceId,
  logger,
  logRequest,
  mapHttpMethodToCrudOperation,
  parseRequestBody,
  sanitizeInput,
  successResponse,
  validateAndSanitizeObject
} from '../utils';

// Mock the logger to prevent console output during tests
jest.mock('@aws-lambda-powertools/logger', () => ({
  Logger: jest.fn().mockImplementation(() => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
  }))
}));

describe('utils.ts', () => {
  describe('API Response Functions', () => {
    describe('createApiResponse', () => {
      it('should create response with standard headers', () => {
        const response = createApiResponse(200, { message: 'test' });
        expect(typeof response).toBe('object');
        const objResponse = response as { statusCode: number; body: string; headers?: Record<string, string> };
        expect(objResponse.statusCode).toBe(200);
        expect(objResponse.body).toBe(JSON.stringify({ message: 'test' }));
        expect(objResponse.headers).toMatchObject({
          'Content-Type': 'application/json',
          'X-Content-Type-Options': 'nosniff',
          'X-Frame-Options': 'DENY'
        });
      });

      it('should merge custom headers', () => {
        const response = createApiResponse(200, { data: 'test' }, { 'X-Custom': 'value' });
        const objResponse = response as { headers?: Record<string, string> };
        expect(objResponse.headers?.['X-Custom']).toBe('value');
        expect(objResponse.headers?.['Content-Type']).toBe('application/json');
      });

      it('should handle different status codes', () => {
        const response = createApiResponse(404, { error: 'Not found' });
        const objResponse = response as { statusCode: number };
        expect(objResponse.statusCode).toBe(404);
      });
    });

    describe('successResponse', () => {
      it('should create success response with default 200 status', () => {
        const response = successResponse({ id: '123', name: 'Test' });
        const objResponse = response as { statusCode: number; body: string };
        expect(objResponse.statusCode).toBe(200);
        const body = JSON.parse(objResponse.body ?? '{}') as { success: boolean; data: { id: string; name: string } };
        expect(body).toEqual({
          success: true,
          data: { id: '123', name: 'Test' }
        });
      });

      it('should accept custom status code', () => {
        const response = successResponse({ created: true }, 201);
        const objResponse = response as { statusCode: number };
        expect(objResponse.statusCode).toBe(201);
      });
    });

    describe('errorResponse', () => {
      it('should handle Error objects', () => {
        const error = new Error('Something went wrong');
        const response = errorResponse(error);
        const objResponse = response as { statusCode: number; body: string };
        expect(objResponse.statusCode).toBe(500);
        const body = JSON.parse(objResponse.body ?? '{}') as { success: boolean; error: { name: string; message: string } };
        expect(body).toEqual({
          success: false,
          error: {
            name: 'Error',
            message: 'Something went wrong'
          }
        });
        expect(logger.error).toHaveBeenCalled();
      });

      it('should handle custom error types', () => {
        const error = new ValidationError('email', 'invalid');
        const response = errorResponse(error, 400);
        const objResponse = response as { statusCode: number; body: string };
        expect(objResponse.statusCode).toBe(400);
        const body = JSON.parse(objResponse.body ?? '{}') as { error: { name: string } };
        expect(body.error.name).toBe('ValidationError');
      });

      it('should handle string errors', () => {
        const response = errorResponse('Simple error message', 400);
        const objResponse = response as { body: string };
        const body = JSON.parse(objResponse.body ?? '{}') as { error: { message: string; name: string } };
        expect(body.error.message).toBe('Simple error message');
        expect(body.error.name).toBe('Error');
      });
    });
  });

  describe('HTTP Method Mapping', () => {
    describe('mapHttpMethodToCrudOperation', () => {
      it('should map GET to READ', () => {
        const result = mapHttpMethodToCrudOperation('GET', false);
        expect(result).toEqual({ ok: true, value: 'READ' });
      });

      it('should map POST to CREATE', () => {
        const result = mapHttpMethodToCrudOperation('POST', false);
        expect(result).toEqual({ ok: true, value: 'CREATE' });
      });

      it('should map PUT to UPDATE with resource ID', () => {
        const result = mapHttpMethodToCrudOperation('PUT', true);
        expect(result).toEqual({ ok: true, value: 'UPDATE' });
      });

      it('should map PATCH to UPDATE with resource ID', () => {
        const result = mapHttpMethodToCrudOperation('PATCH', true);
        expect(result).toEqual({ ok: true, value: 'UPDATE' });
      });

      it('should fail PUT without resource ID', () => {
        const result = mapHttpMethodToCrudOperation('PUT', false);
        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.error).toBeInstanceOf(ValidationError);
          expect(result.error.message).toContain('Resource ID required');
        }
      });

      it('should map DELETE to DELETE with resource ID', () => {
        const result = mapHttpMethodToCrudOperation('DELETE', true);
        expect(result).toEqual({ ok: true, value: 'DELETE' });
      });

      it('should fail DELETE without resource ID', () => {
        const result = mapHttpMethodToCrudOperation('DELETE', false);
        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.error.message).toContain('Resource ID required');
        }
      });
    });
  });

  describe('Resource ID Extraction', () => {
    describe('extractResourceId', () => {
      it('should extract ID from common parameter names', () => {
        const event = {
          pathParameters: { id: '123' }
        } as unknown as APIGatewayProxyEventV2;
        expect(extractResourceId(event)).toBe('123');
      });

      it('should extract resourceId parameter', () => {
        const event = {
          pathParameters: { resourceId: '456' }
        } as unknown as APIGatewayProxyEventV2;
        expect(extractResourceId(event)).toBe('456');
      });

      it('should extract itemId parameter', () => {
        const event = {
          pathParameters: { itemId: '789' }
        } as unknown as APIGatewayProxyEventV2;
        expect(extractResourceId(event)).toBe('789');
      });

      it('should extract entityId parameter', () => {
        const event = {
          pathParameters: { entityId: 'abc' }
        } as unknown as APIGatewayProxyEventV2;
        expect(extractResourceId(event)).toBe('abc');
      });

      it('should extract any parameter containing "id"', () => {
        const event = {
          pathParameters: { customIdField: 'xyz' }
        } as unknown as APIGatewayProxyEventV2;
        expect(extractResourceId(event)).toBe('xyz');
      });

      it('should return undefined when no path parameters', () => {
        const event = {} as APIGatewayProxyEventV2;
        expect(extractResourceId(event)).toBeUndefined();
      });

      it('should return undefined when no ID parameter found', () => {
        const event = {
          pathParameters: { name: 'test', type: 'example' }
        } as unknown as APIGatewayProxyEventV2;
        expect(extractResourceId(event)).toBeUndefined();
      });

      it('should ignore empty string IDs', () => {
        const event = {
          pathParameters: { id: '' }
        } as unknown as APIGatewayProxyEventV2;
        expect(extractResourceId(event)).toBeUndefined();
      });
    });
  });

  describe('Request Body Parsing', () => {
    describe('parseRequestBody', () => {
      it('should parse valid JSON', () => {
        const result = parseRequestBody('{"name":"test","value":123}');
        expect(result).toEqual({
          ok: true,
          value: { name: 'test', value: 123 }
        });
      });

      it('should return empty object for undefined body', () => {
        const result = parseRequestBody(undefined);
        expect(result).toEqual({ ok: true, value: {} });
      });

      it('should handle invalid JSON', () => {
        const result = parseRequestBody('{ invalid json }');
        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.error).toBeInstanceOf(ValidationError);
          expect(result.error.message).toContain('Invalid JSON');
        }
      });

      it('should handle empty string', () => {
        const result = parseRequestBody('');
        expect(result).toEqual({ ok: true, value: {} });
      });

      it('should parse arrays', () => {
        const result = parseRequestBody('[1,2,3]');
        expect(result).toEqual({ ok: true, value: [1, 2, 3] });
      });
    });
  });

  describe('Request Context Creation', () => {
    describe('createRequestContext', () => {
      let mockEvent: APIGatewayProxyEventV2;
      let mockContext: Context;

      beforeEach(() => {
        mockEvent = {
          requestContext: {
            http: {
              method: 'GET',
              path: '/api/items'
            }
          },
          pathParameters: {}
        } as unknown as APIGatewayProxyEventV2;

        mockContext = {
          awsRequestId: 'test-request-id'
        } as Context;
      });

      it('should create context for valid GET request', () => {
        const result = createRequestContext(mockEvent, mockContext);
        expect(result.ok).toBe(true);
        if (result.ok) {
          expect(result.value.operation).toBe('READ');
          expect(result.value.resourceId).toBeUndefined();
        }
      });

      it('should create context for POST request', () => {
        mockEvent.requestContext.http.method = 'POST';
        const result = createRequestContext(mockEvent, mockContext);
        expect(result.ok).toBe(true);
        if (result.ok) {
          expect(result.value.operation).toBe('CREATE');
        }
      });

      it('should handle invalid HTTP method', () => {
        (mockEvent.requestContext.http as { method: string }).method = 'INVALID';
        const result = createRequestContext(mockEvent, mockContext);
        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.error.message).toContain('Invalid HTTP method');
        }
      });

      it('should extract resource ID when present', () => {
        mockEvent.pathParameters = { id: '123' };
        const result = createRequestContext(mockEvent, mockContext);
        expect(result.ok).toBe(true);
        if (result.ok) {
          expect(result.value.resourceId).toBe('123');
        }
      });
    });
  });

  describe('Request Logging', () => {
    describe('logRequest', () => {
      it('should log request details', () => {
        const context = {
          event: {
            requestContext: {
              http: {
                method: 'POST',
                path: '/api/items',
                sourceIp: '192.168.1.1',
                userAgent: 'test-agent'
              },
              requestId: 'req-123',
              accountId: 'acc-123',
              stage: 'dev'
            },
            headers: { 'content-type': 'application/json' },
            queryStringParameters: null,
            body: 'test body'
          } as unknown as APIGatewayProxyEventV2,
          context: {} as Context,
          operation: 'CREATE' as const,
          resourceId: undefined
        };

        logRequest(context);
        expect(logger.info).toHaveBeenCalledWith(
          'Incoming request',
          expect.objectContaining({
            operation: 'CREATE',
            method: 'POST',
            path: '/api/items'
          })
        );
      });
    });
  });

  describe('Input Sanitization', () => {
    describe('sanitizeInput', () => {
      it('should remove control characters', () => {
        const input = 'Hello\x00World\x1F\x7FTest\x9F';
        expect(sanitizeInput(input)).toBe('HelloWorldTest');
      });

      it('should limit length to prevent DoS', () => {
        const longInput = 'a'.repeat(15000);
        const result = sanitizeInput(longInput);
        expect(result.length).toBe(10000);
      });

      it('should handle normal strings', () => {
        const input = 'Normal string with spaces and punctuation!';
        expect(sanitizeInput(input)).toBe(input);
      });

      it('should handle empty strings', () => {
        expect(sanitizeInput('')).toBe('');
      });
    });

    describe('validateAndSanitizeObject', () => {
      it('should sanitize string values', () => {
        const obj = {
          name: 'Test\x00Name',
          description: 'Normal description'
        };
        const result = validateAndSanitizeObject(obj);
        expect(result.ok).toBe(true);
        if (result.ok) {
          expect(result.value['name']).toBe('TestName');
          expect(result.value['description']).toBe('Normal description');
        }
      });

      it('should handle nested objects', () => {
        const obj = {
          user: {
            name: 'John\x1FDoe',
            profile: {
              bio: 'Developer\x00'
            }
          }
        };
        const result = validateAndSanitizeObject(obj);
        expect(result.ok).toBe(true);
        if (result.ok) {
          const sanitized = result.value as { user: { name: string; profile: { bio: string } } };
          expect(sanitized.user.name).toBe('JohnDoe');
          expect(sanitized.user.profile.bio).toBe('Developer');
        }
      });

      it('should reject non-objects', () => {
        const result = validateAndSanitizeObject('not an object');
        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.error.message).toContain('Expected an object');
        }
      });

      it('should reject null', () => {
        const result = validateAndSanitizeObject(null);
        expect(result.ok).toBe(false);
      });

      it('should reject invalid keys', () => {
        const obj = {
          '': 'empty key'
        };
        const result = validateAndSanitizeObject(obj);
        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.error.message).toContain('Invalid key');
        }
      });

      it('should reject very long keys', () => {
        const obj = {
          ['x'.repeat(101)]: 'value'
        };
        const result = validateAndSanitizeObject(obj);
        expect(result.ok).toBe(false);
      });

      it('should preserve non-string values', () => {
        const obj = {
          count: 123,
          active: true,
          items: [1, 2, 3],
          nullable: null
        };
        const result = validateAndSanitizeObject(obj);
        expect(result.ok).toBe(true);
        if (result.ok) {
          expect(result.value).toEqual(obj);
        }
      });
    });
  });
});