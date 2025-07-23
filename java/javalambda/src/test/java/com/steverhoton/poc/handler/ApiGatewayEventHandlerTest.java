package com.steverhoton.poc.handler;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

import java.util.HashMap;
import java.util.Map;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.amazonaws.services.lambda.runtime.Context;
import com.amazonaws.services.lambda.runtime.events.APIGatewayV2HTTPEvent;
import com.amazonaws.services.lambda.runtime.events.APIGatewayV2HTTPResponse;
import com.fasterxml.jackson.databind.ObjectMapper;

/** Unit tests for ApiGatewayEventHandler. */
@ExtendWith(MockitoExtension.class)
class ApiGatewayEventHandlerTest {

  private ApiGatewayEventHandler handler;
  private ObjectMapper objectMapper;

  @Mock private Context context;

  @BeforeEach
  void setUp() {
    handler = new ApiGatewayEventHandler();
    objectMapper = new ObjectMapper();
    when(context.getAwsRequestId()).thenReturn("test-request-id");
  }

  @Test
  void testGetRequest() {
    // Given
    APIGatewayV2HTTPEvent event = createTestEvent("GET", "/api/users/123", null);

    // When
    APIGatewayV2HTTPResponse response = handler.handleRequest(event, context);

    // Then
    assertThat(response.getStatusCode()).isEqualTo(200);
    assertThat(response.getHeaders()).containsEntry("Content-Type", "application/json");
    assertThat(response.getBody()).contains("Request logged successfully");
    assertThat(response.getBody()).contains("test-request-id");
  }

  @Test
  void testPostRequest() {
    // Given
    String requestBody = "{\"name\": \"John Doe\", \"email\": \"john@example.com\"}";
    APIGatewayV2HTTPEvent event = createTestEvent("POST", "/api/users", requestBody);

    // When
    APIGatewayV2HTTPResponse response = handler.handleRequest(event, context);

    // Then
    assertThat(response.getStatusCode()).isEqualTo(200);
    assertThat(response.getHeaders()).containsEntry("Content-Type", "application/json");
    assertThat(response.getBody()).contains("Request logged successfully");
  }

  @Test
  void testPutRequest() {
    // Given
    String requestBody = "{\"name\": \"John Updated\"}";
    APIGatewayV2HTTPEvent event = createTestEvent("PUT", "/api/users/123", requestBody);

    // When
    APIGatewayV2HTTPResponse response = handler.handleRequest(event, context);

    // Then
    assertThat(response.getStatusCode()).isEqualTo(200);
    assertThat(response.getBody()).contains("Request logged successfully");
  }

  @Test
  void testDeleteRequest() {
    // Given
    APIGatewayV2HTTPEvent event = createTestEvent("DELETE", "/api/users/123", null);

    // When
    APIGatewayV2HTTPResponse response = handler.handleRequest(event, context);

    // Then
    assertThat(response.getStatusCode()).isEqualTo(200);
    assertThat(response.getBody()).contains("Request logged successfully");
  }

  @Test
  void testRequestWithQueryParameters() {
    // Given
    APIGatewayV2HTTPEvent event = createTestEvent("GET", "/api/users", null);
    Map<String, String> queryParams = new HashMap<>();
    queryParams.put("page", "1");
    queryParams.put("size", "10");
    event.setQueryStringParameters(queryParams);

    // When
    APIGatewayV2HTTPResponse response = handler.handleRequest(event, context);

    // Then
    assertThat(response.getStatusCode()).isEqualTo(200);
    assertThat(response.getBody()).contains("Request logged successfully");
  }

  @Test
  void testRequestWithPathParameters() {
    // Given
    APIGatewayV2HTTPEvent event = createTestEvent("GET", "/api/users/123", null);
    Map<String, String> pathParams = new HashMap<>();
    pathParams.put("userId", "123");
    event.setPathParameters(pathParams);

    // When
    APIGatewayV2HTTPResponse response = handler.handleRequest(event, context);

    // Then
    assertThat(response.getStatusCode()).isEqualTo(200);
    assertThat(response.getBody()).contains("Request logged successfully");
  }

  @Test
  void testRequestWithHeaders() {
    // Given
    APIGatewayV2HTTPEvent event = createTestEvent("GET", "/api/users", null);
    Map<String, String> headers = new HashMap<>();
    headers.put("Content-Type", "application/json");
    headers.put("X-Custom-Header", "custom-value");
    headers.put("Authorization", "Bearer secret-token"); // Should be sanitized
    event.setHeaders(headers);

    // When
    APIGatewayV2HTTPResponse response = handler.handleRequest(event, context);

    // Then
    assertThat(response.getStatusCode()).isEqualTo(200);
    assertThat(response.getBody()).contains("Request logged successfully");
  }

  @Test
  void testBase64EncodedBody() {
    // Given
    APIGatewayV2HTTPEvent event = createTestEvent("POST", "/api/upload", "SGVsbG8gV29ybGQ=");
    event.setIsBase64Encoded(true);

    // When
    APIGatewayV2HTTPResponse response = handler.handleRequest(event, context);

    // Then
    assertThat(response.getStatusCode()).isEqualTo(200);
    assertThat(response.getBody()).contains("Request logged successfully");
  }

  @Test
  void testNullRequestBody() {
    // Given
    APIGatewayV2HTTPEvent event = createTestEvent("GET", "/api/users", null);

    // When
    APIGatewayV2HTTPResponse response = handler.handleRequest(event, context);

    // Then
    assertThat(response.getStatusCode()).isEqualTo(200);
    assertThat(response.getBody()).contains("Request logged successfully");
  }

  @Test
  void testPatchRequest() {
    // Given
    String requestBody = "{\"status\": \"active\"}";
    APIGatewayV2HTTPEvent event = createTestEvent("PATCH", "/api/users/123", requestBody);

    // When
    APIGatewayV2HTTPResponse response = handler.handleRequest(event, context);

    // Then
    assertThat(response.getStatusCode()).isEqualTo(200);
    assertThat(response.getBody()).contains("Request logged successfully");
  }

  @Test
  void testUnknownHttpMethod() {
    // Given
    APIGatewayV2HTTPEvent event = createTestEvent("OPTIONS", "/api/users", null);

    // When
    APIGatewayV2HTTPResponse response = handler.handleRequest(event, context);

    // Then
    assertThat(response.getStatusCode()).isEqualTo(200);
    assertThat(response.getBody()).contains("Request logged successfully");
  }

  @Test
  void testResponseHeaders() {
    // Given
    APIGatewayV2HTTPEvent event = createTestEvent("GET", "/api/users", null);

    // When
    APIGatewayV2HTTPResponse response = handler.handleRequest(event, context);

    // Then
    assertThat(response.getHeaders()).containsEntry("Content-Type", "application/json");
    assertThat(response.getHeaders()).containsEntry("X-Lambda-Function-Version", "$LATEST");
  }

  @Test
  void testExceptionHandling() {
    // Given
    APIGatewayV2HTTPEvent event = createTestEvent("GET", "/api/users", null);
    // Create a request context that will cause an exception
    event.setRequestContext(null);

    // When
    APIGatewayV2HTTPResponse response = handler.handleRequest(event, context);

    // Then
    assertThat(response.getStatusCode()).isEqualTo(500);
    assertThat(response.getHeaders()).containsEntry("Content-Type", "application/json");
    assertThat(response.getBody()).contains("Internal server error");
    assertThat(response.getBody()).contains("test-request-id");
  }

  /**
   * Creates a test API Gateway v2 HTTP event with required fields.
   *
   * @param method The HTTP method
   * @param path The request path
   * @param body The request body (can be null)
   * @return A configured test event
   */
  private APIGatewayV2HTTPEvent createTestEvent(String method, String path, String body) {
    APIGatewayV2HTTPEvent event = new APIGatewayV2HTTPEvent();

    // Set up HTTP context
    APIGatewayV2HTTPEvent.RequestContext.Http http =
        APIGatewayV2HTTPEvent.RequestContext.Http.builder()
            .withMethod(method)
            .withPath(path)
            .withSourceIp("192.168.1.1")
            .withUserAgent("Test-Agent/1.0")
            .build();

    // Set up request context
    APIGatewayV2HTTPEvent.RequestContext requestContext =
        APIGatewayV2HTTPEvent.RequestContext.builder()
            .withAccountId("123456789012")
            .withApiId("test-api-id")
            .withDomainName("test.execute-api.us-east-1.amazonaws.com")
            .withStage("prod")
            .withTime("01/Jan/2024:00:00:00 +0000")
            .withTimeEpoch(1704067200000L)
            .withHttp(http)
            .build();

    event.setRequestContext(requestContext);
    event.setBody(body);
    event.setIsBase64Encoded(false);

    return event;
  }
}
