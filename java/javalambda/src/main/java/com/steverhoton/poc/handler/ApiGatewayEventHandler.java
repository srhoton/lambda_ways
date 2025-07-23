package com.steverhoton.poc.handler;

import java.util.HashMap;
import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import com.amazonaws.services.lambda.runtime.Context;
import com.amazonaws.services.lambda.runtime.RequestHandler;
import com.amazonaws.services.lambda.runtime.events.APIGatewayV2HTTPEvent;
import com.amazonaws.services.lambda.runtime.events.APIGatewayV2HTTPResponse;
import com.fasterxml.jackson.databind.ObjectMapper;

/**
 * Lambda handler for processing API Gateway v2 HTTP events.
 *
 * <p>This handler logs all CRUD operations including HTTP method, path, query parameters, request
 * body, request ID, and other metadata.
 */
public class ApiGatewayEventHandler
    implements RequestHandler<APIGatewayV2HTTPEvent, APIGatewayV2HTTPResponse> {

  private static final Logger logger = LoggerFactory.getLogger(ApiGatewayEventHandler.class);
  private static final ObjectMapper objectMapper = new ObjectMapper();

  @Override
  public APIGatewayV2HTTPResponse handleRequest(APIGatewayV2HTTPEvent event, Context context) {
    String requestId = context.getAwsRequestId();

    try {
      // Log the incoming event details
      logEventDetails(event, requestId);

      // Create response
      Map<String, Object> responseBody = new HashMap<>();
      responseBody.put("message", "Request logged successfully");
      responseBody.put("requestId", requestId);
      responseBody.put("timestamp", System.currentTimeMillis());

      return APIGatewayV2HTTPResponse.builder()
          .withStatusCode(200)
          .withHeaders(createResponseHeaders())
          .withBody(objectMapper.writeValueAsString(responseBody))
          .build();

    } catch (Exception e) {
      logger.error("Error processing request: {}", requestId, e);

      return APIGatewayV2HTTPResponse.builder()
          .withStatusCode(500)
          .withHeaders(createResponseHeaders())
          .withBody("{\"error\": \"Internal server error\", \"requestId\": \"" + requestId + "\"}")
          .build();
    }
  }

  /**
   * Logs comprehensive details about the incoming API Gateway event.
   *
   * @param event The API Gateway v2 HTTP event
   * @param requestId The AWS request ID
   */
  private void logEventDetails(APIGatewayV2HTTPEvent event, String requestId) {
    // Basic request information
    String httpMethod = event.getRequestContext().getHttp().getMethod();
    String path = event.getRequestContext().getHttp().getPath();
    String sourceIp = event.getRequestContext().getHttp().getSourceIp();
    String userAgent = event.getRequestContext().getHttp().getUserAgent();

    logger.info("Processing {} request", httpMethod);
    logger.info("Request ID: {}", requestId);
    logger.info("Path: {}", path);
    logger.info("Source IP: {}", sourceIp);
    logger.info("User Agent: {}", userAgent);

    // Request context details
    APIGatewayV2HTTPEvent.RequestContext requestContext = event.getRequestContext();
    logger.info("Account ID: {}", requestContext.getAccountId());
    logger.info("API ID: {}", requestContext.getApiId());
    logger.info("Domain Name: {}", requestContext.getDomainName());
    logger.info("Stage: {}", requestContext.getStage());
    logger.info("Request Time: {}", requestContext.getTime());
    logger.info("Request Time Epoch: {}", requestContext.getTimeEpoch());

    // Headers
    if (event.getHeaders() != null && !event.getHeaders().isEmpty()) {
      logger.info("Headers: {}", sanitizeHeaders(event.getHeaders()));
    }

    // Query parameters
    if (event.getQueryStringParameters() != null && !event.getQueryStringParameters().isEmpty()) {
      logger.info("Query Parameters: {}", event.getQueryStringParameters());
    }

    // Path parameters
    if (event.getPathParameters() != null && !event.getPathParameters().isEmpty()) {
      logger.info("Path Parameters: {}", event.getPathParameters());
    }

    // Request body
    if (event.getBody() != null && !event.getBody().isEmpty()) {
      if (event.getIsBase64Encoded()) {
        logger.info("Request Body: [Base64 Encoded] Length: {} bytes", event.getBody().length());
      } else {
        logger.info("Request Body: {}", event.getBody());
      }
    }

    // Stage variables
    if (event.getStageVariables() != null && !event.getStageVariables().isEmpty()) {
      logger.info("Stage Variables: {}", event.getStageVariables());
    }

    // Determine CRUD operation based on HTTP method
    String crudOperation = determineCrudOperation(httpMethod);
    logger.info("CRUD Operation: {}", crudOperation);
  }

  /**
   * Determines the CRUD operation based on HTTP method.
   *
   * @param httpMethod The HTTP method
   * @return The corresponding CRUD operation
   */
  private String determineCrudOperation(String httpMethod) {
    return switch (httpMethod.toUpperCase()) {
      case "GET" -> "READ";
      case "POST" -> "CREATE";
      case "PUT", "PATCH" -> "UPDATE";
      case "DELETE" -> "DELETE";
      default -> "UNKNOWN";
    };
  }

  /**
   * Sanitizes headers by removing sensitive information.
   *
   * @param headers The original headers map
   * @return Sanitized headers map
   */
  private Map<String, String> sanitizeHeaders(Map<String, String> headers) {
    Map<String, String> sanitized = new HashMap<>(headers);
    // Remove potentially sensitive headers
    sanitized.remove("authorization");
    sanitized.remove("x-api-key");
    sanitized.remove("cookie");
    return sanitized;
  }

  /**
   * Creates standard response headers.
   *
   * @return Map of response headers
   */
  private Map<String, String> createResponseHeaders() {
    Map<String, String> headers = new HashMap<>();
    headers.put("Content-Type", "application/json");
    headers.put("X-Lambda-Function-Version", "$LATEST");
    return headers;
  }
}
