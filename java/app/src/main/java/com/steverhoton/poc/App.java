package com.steverhoton.poc;

import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import com.amazonaws.services.lambda.runtime.Context;
import com.amazonaws.services.lambda.runtime.RequestHandler;
import com.amazonaws.services.lambda.runtime.events.APIGatewayV2HTTPEvent;
import com.amazonaws.services.lambda.runtime.events.APIGatewayV2HTTPResponse;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;

/**
 * AWS Lambda handler that responds to both API Gateway v2 and AppSync events and logs the event
 * structure.
 */
public class App implements RequestHandler<Object, Object> {

  private static final Logger logger = LoggerFactory.getLogger(App.class);
  private final ObjectMapper objectMapper = new ObjectMapper();

  /**
   * Handles both API Gateway v2 HTTP events and AppSync events.
   *
   * @param event The incoming event (API Gateway v2 or AppSync)
   * @param context The Lambda execution context
   * @return Appropriate response based on event type
   */
  @Override
  public Object handleRequest(Object event, Context context) {
    logger.info(
        "Received event of type: {}", event != null ? event.getClass().getSimpleName() : "null");

    try {
      String eventJson = objectMapper.writeValueAsString(event);
      System.out.println("Event structure: " + eventJson);
      logger.debug("Event details: {}", eventJson);

      if (isApiGatewayV2Event(event)) {
        return handleApiGatewayV2Event((APIGatewayV2HTTPEvent) event);
      } else if (isAppSyncEvent(event)) {
        return handleAppSyncEvent(event);
      } else {
        logger.warn(
            "Unknown event type received: {}", event != null ? event.getClass().getName() : "null");
        return createErrorResponse("Unknown event type");
      }

    } catch (JsonProcessingException e) {
      logger.error("Failed to serialize event", e);
      return createErrorResponse("Failed to process event");
    }
  }

  /**
   * Handles API Gateway v2 HTTP events.
   *
   * @param event The API Gateway v2 HTTP event
   * @return API Gateway v2 HTTP response
   */
  private APIGatewayV2HTTPResponse handleApiGatewayV2Event(APIGatewayV2HTTPEvent event) {
    logger.info("Processing API Gateway v2 event with route: {}", event.getRouteKey());

    return APIGatewayV2HTTPResponse.builder()
        .withStatusCode(200)
        .withBody(
            "{\"message\":\"API Gateway v2 event logged successfully\",\"eventType\":\"APIGatewayV2\"}")
        .build();
  }

  /**
   * Handles AppSync events.
   *
   * @param event The AppSync event
   * @return AppSync response
   */
  private Object handleAppSyncEvent(Object event) {
    logger.info("Processing AppSync event");

    // AppSync events are typically Map objects with specific structure
    if (event instanceof Map<?, ?> eventMap) {
      String fieldName = (String) eventMap.get("fieldName");
      logger.info("AppSync field name: {}", fieldName);
    }

    return Map.of(
        "message", "AppSync event logged successfully",
        "eventType", "AppSync",
        "timestamp", System.currentTimeMillis());
  }

  /**
   * Determines if the event is an API Gateway v2 event.
   *
   * @param event The event to check
   * @return true if it's an API Gateway v2 event
   */
  private boolean isApiGatewayV2Event(Object event) {
    return event instanceof APIGatewayV2HTTPEvent;
  }

  /**
   * Determines if the event is an AppSync event.
   *
   * @param event The event to check
   * @return true if it's an AppSync event
   */
  private boolean isAppSyncEvent(Object event) {
    if (!(event instanceof Map<?, ?> eventMap)) {
      return false;
    }

    // AppSync events typically have these fields
    return eventMap.containsKey("fieldName")
        || eventMap.containsKey("arguments")
        || eventMap.containsKey("source")
        || eventMap.containsKey("info");
  }

  /**
   * Creates an error response that works for both event types.
   *
   * @param message The error message
   * @return Error response object
   */
  private Object createErrorResponse(String message) {
    return Map.of("error", message, "statusCode", 500);
  }
}
