package com.steverhoton.poc;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.util.Map;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import com.amazonaws.services.lambda.runtime.Context;
import com.amazonaws.services.lambda.runtime.events.APIGatewayV2HTTPEvent;
import com.amazonaws.services.lambda.runtime.events.APIGatewayV2HTTPResponse;

/** Unit tests for the App Lambda handler. */
class AppTest {

  private App app;
  private Context mockContext;

  @BeforeEach
  void setUp() {
    app = new App();
    mockContext = mock(Context.class);
    when(mockContext.getRemainingTimeInMillis()).thenReturn(30000);
  }

  // API Gateway v2 Tests
  @Test
  void handleRequest_withApiGatewayV2Event_returnsSuccessResponse() {
    APIGatewayV2HTTPEvent event = createApiGatewayV2TestEvent();

    Object response = app.handleRequest(event, mockContext);

    assertThat(response).isInstanceOf(APIGatewayV2HTTPResponse.class);
    APIGatewayV2HTTPResponse apiResponse = (APIGatewayV2HTTPResponse) response;
    assertThat(apiResponse.getStatusCode()).isEqualTo(200);
    assertThat(apiResponse.getBody()).contains("API Gateway v2 event logged successfully");
    assertThat(apiResponse.getBody()).contains("APIGatewayV2");
  }

  @Test
  void handleRequest_withComplexApiGatewayV2Event_logsCorrectly() {
    APIGatewayV2HTTPEvent event = createComplexApiGatewayV2TestEvent();

    Object response = app.handleRequest(event, mockContext);

    assertThat(response).isInstanceOf(APIGatewayV2HTTPResponse.class);
    APIGatewayV2HTTPResponse apiResponse = (APIGatewayV2HTTPResponse) response;
    assertThat(apiResponse.getStatusCode()).isEqualTo(200);
    assertThat(apiResponse.getBody()).contains("API Gateway v2 event logged successfully");
  }

  // AppSync Tests
  @Test
  void handleRequest_withAppSyncEvent_returnsSuccessResponse() {
    Map<String, Object> appSyncEvent = createAppSyncTestEvent();

    Object response = app.handleRequest(appSyncEvent, mockContext);

    assertThat(response).isInstanceOf(Map.class);
    @SuppressWarnings("unchecked")
    Map<String, Object> mapResponse = (Map<String, Object>) response;
    assertThat(mapResponse.get("message")).isEqualTo("AppSync event logged successfully");
    assertThat(mapResponse.get("eventType")).isEqualTo("AppSync");
    assertThat(mapResponse.get("timestamp")).isNotNull();
  }

  @Test
  void handleRequest_withComplexAppSyncEvent_logsCorrectly() {
    Map<String, Object> appSyncEvent = createComplexAppSyncTestEvent();

    Object response = app.handleRequest(appSyncEvent, mockContext);

    assertThat(response).isInstanceOf(Map.class);
    @SuppressWarnings("unchecked")
    Map<String, Object> mapResponse = (Map<String, Object>) response;
    assertThat(mapResponse.get("message")).isEqualTo("AppSync event logged successfully");
    assertThat(mapResponse.get("eventType")).isEqualTo("AppSync");
  }

  // Error Handling Tests
  @Test
  void handleRequest_withNullEvent_handlesGracefully() {
    Object response = app.handleRequest(null, mockContext);

    assertThat(response).isInstanceOf(Map.class);
    @SuppressWarnings("unchecked")
    Map<String, Object> mapResponse = (Map<String, Object>) response;
    assertThat(mapResponse.get("error")).isEqualTo("Unknown event type");
    assertThat(mapResponse.get("statusCode")).isEqualTo(500);
  }

  @Test
  void handleRequest_withUnknownEventType_returnsError() {
    String unknownEvent = "not a valid event";

    Object response = app.handleRequest(unknownEvent, mockContext);

    assertThat(response).isInstanceOf(Map.class);
    @SuppressWarnings("unchecked")
    Map<String, Object> mapResponse = (Map<String, Object>) response;
    assertThat(mapResponse.get("error")).isEqualTo("Unknown event type");
    assertThat(mapResponse.get("statusCode")).isEqualTo(500);
  }

  @Test
  void handleRequest_withEmptyMap_returnsError() {
    Map<String, Object> emptyEvent = Map.of();

    Object response = app.handleRequest(emptyEvent, mockContext);

    assertThat(response).isInstanceOf(Map.class);
    @SuppressWarnings("unchecked")
    Map<String, Object> mapResponse = (Map<String, Object>) response;
    assertThat(mapResponse.get("error")).isEqualTo("Unknown event type");
    assertThat(mapResponse.get("statusCode")).isEqualTo(500);
  }

  // Helper Methods
  private APIGatewayV2HTTPEvent createApiGatewayV2TestEvent() {
    APIGatewayV2HTTPEvent event = new APIGatewayV2HTTPEvent();
    event.setVersion("2.0");
    event.setRouteKey("GET /test");
    event.setRawPath("/test");
    event.setHeaders(Map.of("Content-Type", "application/json"));
    return event;
  }

  private APIGatewayV2HTTPEvent createComplexApiGatewayV2TestEvent() {
    APIGatewayV2HTTPEvent event = new APIGatewayV2HTTPEvent();
    event.setVersion("2.0");
    event.setRouteKey("POST /api/users");
    event.setRawPath("/api/users");
    event.setRawQueryString("param1=value1&param2=value2");
    event.setHeaders(
        Map.of(
            "Content-Type", "application/json",
            "Authorization", "Bearer token123",
            "X-Custom-Header", "custom-value"));
    event.setBody("{\"name\":\"John Doe\",\"email\":\"john@example.com\"}");

    APIGatewayV2HTTPEvent.RequestContext requestContext =
        new APIGatewayV2HTTPEvent.RequestContext();
    requestContext.setRequestId("test-request-id");
    requestContext.setStage("test");
    event.setRequestContext(requestContext);

    return event;
  }

  private Map<String, Object> createAppSyncTestEvent() {
    return Map.of(
        "fieldName", "getUser",
        "arguments", Map.of("id", "123"),
        "source", Map.of(),
        "info",
            Map.of(
                "fieldName", "getUser",
                "parentTypeName", "Query"));
  }

  private Map<String, Object> createComplexAppSyncTestEvent() {
    return Map.of(
        "fieldName", "createUser",
        "arguments",
            Map.of(
                "input",
                Map.of(
                    "name", "John Doe",
                    "email", "john@example.com",
                    "age", 30)),
        "source", Map.of(),
        "info",
            Map.of(
                "fieldName", "createUser",
                "parentTypeName", "Mutation",
                "selectionSetList", Map.of("id", true, "name", true, "email", true)),
        "request",
            Map.of(
                "headers",
                Map.of(
                    "authorization", "Bearer token123",
                    "x-api-key", "api-key-456")));
  }
}
