import type { APIGatewayProxyEventV2, Context } from 'aws-lambda';

import { handler } from '../index';
import { logger } from '../utils';

// Mock the logger to prevent console output during tests
jest.mock('../utils', () => ({
  ...jest.requireActual('../utils'),
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    addContext: jest.fn()
  }
}));

// Mock console.log to verify output
const mockConsoleLog = jest.spyOn(console, 'log').mockImplementation();

describe('Lambda Handler', () => {
  let mockEvent: APIGatewayProxyEventV2;
  let mockContext: Context;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockEvent = {
      version: '2.0',
      routeKey: '$default',
      rawPath: '/api/items',
      rawQueryString: '',
      headers: {
        'content-type': 'application/json',
        'user-agent': 'test-agent',
        'x-forwarded-for': '192.168.1.1'
      },
      requestContext: {
        accountId: '123456789012',
        apiId: 'api-id',
        domainName: 'api.example.com',
        domainPrefix: 'api',
        http: {
          method: 'GET',
          path: '/api/items',
          protocol: 'HTTP/1.1',
          sourceIp: '192.168.1.1',
          userAgent: 'test-agent'
        },
        requestId: 'test-request-id',
        routeKey: '$default',
        stage: 'test',
        time: '01/Jan/2023:00:00:00 +0000',
        timeEpoch: 1672531200000
      },
      isBase64Encoded: false
    };

    mockContext = {
      callbackWaitsForEmptyEventLoop: true,
      functionName: 'test-function',
      functionVersion: '$LATEST',
      invokedFunctionArn: 'arn:aws:lambda:us-east-1:123456789012:function:test-function',
      memoryLimitInMB: '128',
      awsRequestId: 'test-aws-request-id',
      logGroupName: '/aws/lambda/test-function',
      logStreamName: '2023/01/01/[$LATEST]test-stream',
      getRemainingTimeInMillis: jest.fn().mockReturnValue(30000),
      done: jest.fn(),
      fail: jest.fn(),
      succeed: jest.fn()
    };
  });

  describe('CREATE operations', () => {
    it('should handle POST request with valid body', async () => {
      // Arrange
      mockEvent.requestContext.http.method = 'POST';
      mockEvent.body = JSON.stringify({
        name: 'Test Item',
        description: 'Test Description',
        price: 29.99
      });

      // Act
      const result = await handler(mockEvent, mockContext);

      // Assert
      expect(result.statusCode).toBe(200);
      expect(result.headers?.['Content-Type']).toBe('application/json');
      
      const body = JSON.parse(result.body ?? '{}') as { success: boolean; data: { operation: string } };
      expect(body.success).toBe(true);
      expect(body.data.operation).toBe('CREATE');
      
      expect(mockConsoleLog).toHaveBeenCalledWith('=== CREATE Operation ===');
      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('Request Body:'), expect.stringContaining('"name": "Test Item"'));
    });

    it('should handle POST request with empty body', async () => {
      // Arrange
      mockEvent.requestContext.http.method = 'POST';
      mockEvent.body = undefined;

      // Act
      const result = await handler(mockEvent, mockContext);

      // Assert
      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body ?? '{}') as { success: boolean };
      expect(body.success).toBe(true);
      expect(mockConsoleLog).toHaveBeenCalledWith('Request Body: (empty)');
    });

    it('should reject POST request with invalid JSON body', async () => {
      // Arrange
      mockEvent.requestContext.http.method = 'POST';
      mockEvent.body = '{ invalid json }';

      // Act
      const result = await handler(mockEvent, mockContext);

      // Assert
      expect(result.statusCode).toBe(400);
      const body = JSON.parse(result.body ?? '{}') as { success: boolean; error: { name: string } };
      expect(body.success).toBe(false);
      expect(body.error.name).toBe('ValidationError');
    });
  });

  describe('READ operations', () => {
    it('should handle GET request for list operation', async () => {
      // Arrange
      mockEvent.requestContext.http.method = 'GET';
      mockEvent.queryStringParameters = { limit: '10', offset: '0' };

      // Act
      const result = await handler(mockEvent, mockContext);

      // Assert
      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body ?? '{}') as { success: boolean; data: { operation: string } };
      expect(body.success).toBe(true);
      expect(body.data.operation).toBe('READ');
      
      expect(mockConsoleLog).toHaveBeenCalledWith('Resource ID: (not specified - list operation)');
      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('Query Parameters:'), expect.stringContaining('"limit": "10"'));
    });

    it('should handle GET request with resource ID', async () => {
      // Arrange
      mockEvent.requestContext.http.method = 'GET';
      mockEvent.pathParameters = { id: 'item-123' };

      // Act
      const result = await handler(mockEvent, mockContext);

      // Assert
      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body ?? '{}') as { success: boolean; data: { resourceId: string } };
      expect(body.success).toBe(true);
      expect(body.data.resourceId).toBe('item-123');
      
      expect(mockConsoleLog).toHaveBeenCalledWith('Resource ID:', 'item-123');
    });
  });

  describe('UPDATE operations', () => {
    it('should handle PUT request with resource ID and body', async () => {
      // Arrange
      mockEvent.requestContext.http.method = 'PUT';
      mockEvent.pathParameters = { resourceId: 'item-456' };
      mockEvent.body = JSON.stringify({
        name: 'Updated Item',
        price: 39.99
      });

      // Act
      const result = await handler(mockEvent, mockContext);

      // Assert
      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body ?? '{}') as { success: boolean; data: { operation: string; resourceId: string } };
      expect(body.success).toBe(true);
      expect(body.data.operation).toBe('UPDATE');
      expect(body.data.resourceId).toBe('item-456');
      
      expect(mockConsoleLog).toHaveBeenCalledWith('=== UPDATE Operation ===');
      expect(mockConsoleLog).toHaveBeenCalledWith('Method:', 'PUT');
    });

    it('should handle PATCH request with resource ID', async () => {
      // Arrange
      mockEvent.requestContext.http.method = 'PATCH';
      mockEvent.pathParameters = { entityId: 'item-789' };
      mockEvent.body = JSON.stringify({ price: 49.99 });

      // Act
      const result = await handler(mockEvent, mockContext);

      // Assert
      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body ?? '{}') as { success: boolean; data: { operation: string } };
      expect(body.success).toBe(true);
      expect(body.data.operation).toBe('UPDATE');
    });

    it('should reject UPDATE request without resource ID', async () => {
      // Arrange
      mockEvent.requestContext.http.method = 'PUT';
      mockEvent.pathParameters = undefined;
      mockEvent.body = JSON.stringify({ name: 'Updated Item' });

      // Act
      const result = await handler(mockEvent, mockContext);

      // Assert
      expect(result.statusCode).toBe(400);
      const body = JSON.parse(result.body ?? '{}') as { success: boolean; error: { message: string } };
      expect(body.success).toBe(false);
      expect(body.error.message).toContain('Resource ID required');
    });
  });

  describe('DELETE operations', () => {
    it('should handle DELETE request with resource ID', async () => {
      // Arrange
      mockEvent.requestContext.http.method = 'DELETE';
      mockEvent.pathParameters = { itemId: 'item-999' };

      // Act
      const result = await handler(mockEvent, mockContext);

      // Assert
      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body ?? '{}') as { success: boolean; data: { operation: string; resourceId: string } };
      expect(body.success).toBe(true);
      expect(body.data.operation).toBe('DELETE');
      expect(body.data.resourceId).toBe('item-999');
      
      expect(mockConsoleLog).toHaveBeenCalledWith('=== DELETE Operation ===');
    });

    it('should reject DELETE request without resource ID', async () => {
      // Arrange
      mockEvent.requestContext.http.method = 'DELETE';
      mockEvent.pathParameters = {};

      // Act
      const result = await handler(mockEvent, mockContext);

      // Assert
      expect(result.statusCode).toBe(400);
      const body = JSON.parse(result.body ?? '{}') as { success: boolean; error: { message: string } };
      expect(body.success).toBe(false);
      expect(body.error.message).toContain('Resource ID required');
    });
  });

  describe('Error handling', () => {
    it('should handle unsupported HTTP method', async () => {
      // Arrange
      (mockEvent.requestContext.http as any).method = 'CONNECT';

      // Act
      const result = await handler(mockEvent, mockContext);

      // Assert
      expect(result.statusCode).toBe(400);
      const body = JSON.parse(result.body ?? '{}') as { success: boolean; error: { message: string } };
      expect(body.success).toBe(false);
      expect(body.error.message).toContain('Invalid HTTP method');
    });

    it('should handle body with invalid object structure', async () => {
      // Arrange
      mockEvent.requestContext.http.method = 'POST';
      mockEvent.body = JSON.stringify('not an object');

      // Act
      const result = await handler(mockEvent, mockContext);

      // Assert
      expect(result.statusCode).toBe(400);
      const body = JSON.parse(result.body ?? '{}') as { success: boolean; error: { name: string } };
      expect(body.success).toBe(false);
      expect(body.error.name).toBe('ValidationError');
    });

    it('should include security headers in all responses', async () => {
      // Arrange
      mockEvent.requestContext.http.method = 'GET';

      // Act
      const result = await handler(mockEvent, mockContext);

      // Assert
      expect(result.headers).toMatchObject({
        'Content-Type': 'application/json',
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'X-XSS-Protection': '1; mode=block',
        'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Pragma': 'no-cache'
      });
    });

    it('should handle unexpected errors gracefully', async () => {
      // Arrange
      mockEvent.requestContext.http.method = 'GET';
      // Force an error by making pathParameters a non-object
      (mockEvent as any).pathParameters = 'invalid';

      // Act
      const result = await handler(mockEvent, mockContext);

      // Assert
      expect(result.statusCode).toBe(500);
      const body = JSON.parse(result.body ?? '{}') as { success: boolean; error: { name: string } };
      expect(body.success).toBe(false);
      expect(body.error.name).toBe('Error');
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('Request logging', () => {
    it('should log all request details', async () => {
      // Arrange
      mockEvent.requestContext.http.method = 'POST';
      mockEvent.body = JSON.stringify({ test: 'data' });

      // Act
      await handler(mockEvent, mockContext);

      // Assert
      expect(logger.addContext).toHaveBeenCalledWith(mockContext);
      expect(logger.info).toHaveBeenCalledWith(
        'Incoming request',
        expect.objectContaining({
          operation: 'CREATE',
          method: 'POST',
          path: '/api/items',
          sourceIp: '192.168.1.1',
          userAgent: 'test-agent',
          requestId: 'test-request-id'
        })
      );
    });
  });
});