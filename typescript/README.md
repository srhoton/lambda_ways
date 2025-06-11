# TypeScript AWS Lambda CRUD Handler

A TypeScript-based AWS Lambda function that handles CRUD (Create, Read, Update, Delete) operations from AWS API Gateway. The function logs all incoming requests to stdout and follows strict TypeScript best practices and security guidelines.

## Features

- **Full CRUD Support**: Handles GET, POST, PUT, PATCH, and DELETE HTTP methods
- **Type Safety**: Strict TypeScript configuration with comprehensive type checking
- **Security First**: Input validation, sanitization, and security headers on all responses
- **Observability**: AWS X-Ray tracing and structured logging with AWS Lambda Powertools
- **Error Handling**: Comprehensive error handling with custom error types
- **Testing**: Unit tests with >80% code coverage requirement
- **Linting**: ESLint with security and code quality plugins

## Prerequisites

- Node.js 18.x or later
- npm or yarn
- AWS CLI configured with appropriate credentials
- AWS SAM CLI (for local testing)

## Installation

```bash
npm install
```

## Development

### Build the project

```bash
npm run build
```

### Run linting

```bash
npm run lint
npm run lint:fix  # Auto-fix linting issues
```

### Run tests

```bash
npm test
npm run test:coverage  # Run with coverage report
npm run test:watch     # Run in watch mode
```

### Type checking

```bash
npm run typecheck
```

## Project Structure

```
typescript/
├── src/
│   ├── __tests__/       # Unit tests
│   │   └── index.test.ts
│   ├── index.ts         # Main Lambda handler
│   ├── types.ts         # Type definitions and custom errors
│   └── utils.ts         # Utility functions
├── dist/                # Compiled JavaScript (generated)
├── package.json
├── tsconfig.json        # TypeScript configuration
├── jest.config.js       # Jest test configuration
├── .eslintrc.json       # ESLint configuration
└── README.md
```

## Lambda Function Behavior

The Lambda function maps HTTP methods to CRUD operations as follows:

- **GET** → READ operation
  - Without resource ID: List operation
  - With resource ID: Get single resource
- **POST** → CREATE operation
- **PUT/PATCH** → UPDATE operation (requires resource ID)
- **DELETE** → DELETE operation (requires resource ID)

### Request Processing

1. Validates the HTTP method
2. Extracts resource ID from path parameters (if present)
3. Parses and validates JSON body (if present)
4. Logs complete request details to stdout
5. Returns standardized JSON response

### Example Output

For a CREATE operation:
```
=== CREATE Operation ===
Timestamp: 2023-12-01T10:30:00.000Z
Request ID: abc123-def456-ghi789
Path: /api/items
Source IP: 192.168.1.1
User Agent: Mozilla/5.0...
Request Body: {
  "name": "Test Item",
  "description": "Test Description",
  "price": 29.99
}
Headers: {
  "content-type": "application/json",
  ...
}
========================
```

## API Gateway Integration

The Lambda expects API Gateway V2 (HTTP API) events. Resource IDs should be passed as path parameters with one of these names:
- `id`
- `resourceId`
- `itemId`
- `entityId`

Example API Gateway routes:
- `GET /items` - List all items
- `GET /items/{id}` - Get specific item
- `POST /items` - Create new item
- `PUT /items/{id}` - Update item
- `DELETE /items/{id}` - Delete item

## Security Features

- Input validation and sanitization
- Type-safe request handling
- Security headers on all responses:
  - X-Content-Type-Options: nosniff
  - X-Frame-Options: DENY
  - X-XSS-Protection: 1; mode=block
  - Strict-Transport-Security
  - Cache-Control: no-store
- Request size limits
- Comprehensive error handling without exposing internals

## Deployment

### Using AWS SAM

Create a `template.yaml` file:

```yaml
AWSTemplateFormatVersion: '2010-09-09'
Transform: AWS::Serverless-2016-10-31

Resources:
  CrudLambda:
    Type: AWS::Serverless::Function
    Properties:
      CodeUri: .
      Handler: dist/index.handler
      Runtime: nodejs18.x
      Timeout: 30
      MemorySize: 512
      Environment:
        Variables:
          LOG_LEVEL: INFO
      Events:
        ApiEvent:
          Type: HttpApi
          Properties:
            Path: /{proxy+}
            Method: ANY
```

Deploy:
```bash
npm run build
sam deploy --guided
```

### Using AWS CDK

```typescript
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigatewayv2';

const fn = new lambda.Function(this, 'CrudLambda', {
  runtime: lambda.Runtime.NODEJS_18_X,
  handler: 'index.handler',
  code: lambda.Code.fromAsset('dist'),
  timeout: Duration.seconds(30),
  memorySize: 512,
  environment: {
    LOG_LEVEL: 'INFO'
  }
});
```

### Manual Deployment

1. Build the project: `npm run build`
2. Create a deployment package:
   ```bash
   zip -r function.zip dist/ node_modules/
   ```
3. Deploy using AWS CLI:
   ```bash
   aws lambda create-function \
     --function-name typescript-crud-lambda \
     --runtime nodejs18.x \
     --handler dist/index.handler \
     --zip-file fileb://function.zip \
     --role arn:aws:iam::YOUR_ACCOUNT:role/YOUR_LAMBDA_ROLE
   ```

## Environment Variables

- `LOG_LEVEL`: Logging level (DEBUG, INFO, WARN, ERROR). Default: INFO
- `AWS_LAMBDA_FUNCTION_NAME`: Automatically set by Lambda
- `AWS_REGION`: AWS region
- `_X_AMZN_TRACE_ID`: X-Ray trace ID

## Monitoring and Debugging

- **CloudWatch Logs**: All console output and structured logs
- **X-Ray Tracing**: Automatic tracing with AWS Lambda Powertools
- **CloudWatch Metrics**: Lambda metrics and custom metrics via Powertools

## License

MIT