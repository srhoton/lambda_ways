import { Tracer } from '@aws-lambda-powertools/tracer';
import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2, Context } from 'aws-lambda';

import { AuthorizationError, NotFoundError, RequestContext, ValidationError } from './types';
import {
  createRequestContext,
  errorResponse,
  logger,
  logRequest,
  parseRequestBody,
  successResponse,
  validateAndSanitizeObject
} from './utils';

// Initialize AWS X-Ray tracer
const tracer = new Tracer({
  serviceName: 'typescript-lambda-crud'
});

/**
 * Main Lambda handler for CRUD operations
 * @param event - API Gateway event
 * @param context - Lambda context
 * @returns API Gateway proxy result
 */
export const handler = async (
  event: APIGatewayProxyEventV2,
  context: Context
): Promise<APIGatewayProxyResultV2> => {
  // Add correlation IDs to logs
  logger.addPersistentLogAttributes({
    lambdaContext: context,
    awsRequestId: context.awsRequestId,
    functionName: context.functionName,
  });
  
  // Start X-Ray segment
  const segment = tracer.getSegment();
  
  try {
    // Create request context
    const contextResult = createRequestContext(event, context);
    if (!contextResult.ok) {
      return errorResponse(contextResult.error, 400);
    }
    
    const requestContext = contextResult.value;
    
    // Log the incoming request
    logRequest(requestContext);
    
    // Parse and validate request body if present
    let requestBody: Record<string, unknown> | undefined;
    if (event.body) {
      const bodyResult = parseRequestBody(event.body);
      if (!bodyResult.ok) {
        return errorResponse(bodyResult.error, 400);
      }
      
      const sanitizeResult = validateAndSanitizeObject(bodyResult.value);
      if (!sanitizeResult.ok) {
        return errorResponse(sanitizeResult.error, 400);
      }
      
      requestBody = sanitizeResult.value;
    }
    
    // Dump request to stdout based on operation
    switch (requestContext.operation) {
      case 'CREATE':
        await handleCreate(requestContext, requestBody);
        break;
        
      case 'READ':
        await handleRead(requestContext);
        break;
        
      case 'UPDATE':
        await handleUpdate(requestContext, requestBody);
        break;
        
      case 'DELETE':
        await handleDelete(requestContext);
        break;
        
      default: {
        // This should never happen due to type checking, but satisfies exhaustiveness
        const exhaustiveCheck: never = requestContext.operation;
        throw new Error(`Unhandled operation: ${exhaustiveCheck}`);
      }
    }
    
    // Return success response
    return successResponse({
      message: `${requestContext.operation} operation logged successfully`,
      operation: requestContext.operation,
      resourceId: requestContext.resourceId,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    // Handle known error types
    if (error instanceof ValidationError) {
      return errorResponse(error, 400);
    }
    
    if (error instanceof AuthorizationError) {
      return errorResponse(error, 403);
    }
    
    if (error instanceof NotFoundError) {
      return errorResponse(error, 404);
    }
    
    // Log unexpected errors
    logger.error('Unexpected error in Lambda handler', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    
    // Return generic error for unexpected errors
    return errorResponse(
      error instanceof Error ? error : new Error('Internal server error'),
      500
    );
  } finally {
    // Close X-Ray segment
    if (segment) {
      segment.close();
    }
  }
};

/**
 * Handles CREATE operations
 * @param context - Request context
 * @param body - Request body
 */
async function handleCreate(
  context: RequestContext,
  body?: Record<string, unknown>
): Promise<void> {
  console.log('=== CREATE Operation ===');
  console.log('Timestamp:', new Date().toISOString());
  console.log('Request ID:', context.event.requestContext.requestId);
  console.log('Path:', context.event.requestContext.http.path);
  console.log('Source IP:', context.event.requestContext.http.sourceIp);
  console.log('User Agent:', context.event.requestContext.http.userAgent);
  
  if (body && Object.keys(body).length > 0) {
    console.log('Request Body:', JSON.stringify(body, null, 2));
  } else {
    console.log('Request Body: (empty)');
  }
  
  console.log('Headers:', JSON.stringify(context.event.headers, null, 2));
  console.log('========================\n');
}

/**
 * Handles READ operations
 * @param context - Request context
 */
async function handleRead(
  context: RequestContext
): Promise<void> {
  console.log('=== READ Operation ===');
  console.log('Timestamp:', new Date().toISOString());
  console.log('Request ID:', context.event.requestContext.requestId);
  console.log('Path:', context.event.requestContext.http.path);
  console.log('Source IP:', context.event.requestContext.http.sourceIp);
  console.log('User Agent:', context.event.requestContext.http.userAgent);
  
  if (context.resourceId) {
    console.log('Resource ID:', context.resourceId);
  } else {
    console.log('Resource ID: (not specified - list operation)');
  }
  
  if (context.event.queryStringParameters) {
    console.log('Query Parameters:', JSON.stringify(context.event.queryStringParameters, null, 2));
  }
  
  console.log('Headers:', JSON.stringify(context.event.headers, null, 2));
  console.log('======================\n');
}

/**
 * Handles UPDATE operations
 * @param context - Request context
 * @param body - Request body
 */
async function handleUpdate(
  context: RequestContext,
  body?: Record<string, unknown>
): Promise<void> {
  console.log('=== UPDATE Operation ===');
  console.log('Timestamp:', new Date().toISOString());
  console.log('Request ID:', context.event.requestContext.requestId);
  console.log('Path:', context.event.requestContext.http.path);
  console.log('Method:', context.event.requestContext.http.method);
  console.log('Source IP:', context.event.requestContext.http.sourceIp);
  console.log('User Agent:', context.event.requestContext.http.userAgent);
  console.log('Resource ID:', context.resourceId);
  
  if (body && Object.keys(body).length > 0) {
    console.log('Request Body:', JSON.stringify(body, null, 2));
  } else {
    console.log('Request Body: (empty)');
  }
  
  console.log('Headers:', JSON.stringify(context.event.headers, null, 2));
  console.log('========================\n');
}

/**
 * Handles DELETE operations
 * @param context - Request context
 */
async function handleDelete(
  context: RequestContext
): Promise<void> {
  console.log('=== DELETE Operation ===');
  console.log('Timestamp:', new Date().toISOString());
  console.log('Request ID:', context.event.requestContext.requestId);
  console.log('Path:', context.event.requestContext.http.path);
  console.log('Source IP:', context.event.requestContext.http.sourceIp);
  console.log('User Agent:', context.event.requestContext.http.userAgent);
  console.log('Resource ID:', context.resourceId);
  console.log('Headers:', JSON.stringify(context.event.headers, null, 2));
  console.log('=========================\n');
}