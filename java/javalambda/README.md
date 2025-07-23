# Java Lambda for API Gateway v2 Events

A Java 21 Lambda function that handles AWS API Gateway v2 HTTP events and logs all CRUD operations.

## Features

- Handles all HTTP methods (GET, POST, PUT, PATCH, DELETE)
- Comprehensive logging of request details including:
  - HTTP method and path
  - Query parameters
  - Path parameters
  - Headers (with sensitive headers sanitized)
  - Request body
  - Request metadata (IP, user agent, etc.)
- Maps HTTP methods to CRUD operations
- Uses SLF4J with Log4j2 for structured logging
- Fully tested with JUnit 5 and Mockito
- Code formatting with Spotless (Google Java Style)

## Project Structure

```
javalambda/
├── build.gradle           # Gradle build configuration
├── src/
│   ├── main/
│   │   ├── java/com/steverhoton/poc/handler/
│   │   │   └── ApiGatewayEventHandler.java    # Lambda handler
│   │   └── resources/
│   │       └── log4j2.xml                      # Logging configuration
│   └── test/
│       └── java/com/steverhoton/poc/handler/
│           └── ApiGatewayEventHandlerTest.java # Unit tests
```

## Build and Deploy

### Prerequisites

- Java 21
- Gradle 8.5+

### Build

```bash
./gradlew clean build
```

This creates a deployment package at `build/distributions/javalambda-1.0.0.zip`

### Deploy to AWS Lambda

1. Create a Lambda function with:
   - Runtime: Java 21
   - Handler: `com.steverhoton.poc.handler.ApiGatewayEventHandler::handleRequest`
   - Memory: 512 MB (recommended)
   - Timeout: 30 seconds

2. Upload the zip file from `build/distributions/`

3. Configure API Gateway v2 (HTTP API) to trigger the Lambda

## Testing

Run unit tests:
```bash
./gradlew test
```

## Code Quality

Format code with Spotless:
```bash
./gradlew spotlessApply
```

Check formatting:
```bash
./gradlew spotlessCheck
```

## Lambda Handler Details

The handler processes all API Gateway v2 HTTP events and logs:

- **Request ID**: AWS request identifier
- **HTTP Method**: GET, POST, PUT, PATCH, DELETE
- **Path**: Request path
- **Query Parameters**: URL query string parameters
- **Path Parameters**: URL path parameters
- **Headers**: HTTP headers (sensitive headers are sanitized)
- **Body**: Request body (identifies Base64 encoded content)
- **Source IP**: Client IP address
- **User Agent**: Client user agent
- **API Gateway Context**: Account ID, API ID, stage, etc.
- **CRUD Operation**: Maps HTTP method to CRUD operation

### Response Format

```json
{
  "message": "Request logged successfully",
  "requestId": "aws-request-id",
  "timestamp": 1234567890
}
```

### Error Response

```json
{
  "error": "Internal server error",
  "requestId": "aws-request-id"
}
```