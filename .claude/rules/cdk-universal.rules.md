---
paths:
  - "lib/**/*.ts"
  - "bin/**/*.ts"
  - "cdk/**/*.ts"
  - "infra/**/*.ts"
  - "**/cdk/**/*.ts"
  - "**/infra/**/*.ts"
---

# CDK Infrastructure Conventions

**Load when:** creating, editing, or reviewing AWS CDK stacks, constructs, or infrastructure-as-code files. Also use when discussing CloudFormation outputs, cross-stack references, Lambda definitions in CDK, or any file under a cdk/ or infra/ directory.

AWS CDK v2 (TypeScript) + Node.js 18+

## Stack Pattern

```typescript
import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';

export class {ProjectName}{Feature}Stack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // ======================
    // 1. DATA LAYER
    // ======================

    // ======================
    // 2. COMPUTE LAYER
    // ======================

    // ======================
    // 3. OUTPUTS
    // ======================
  }
}
```

- Use numbered section comments: `// 1. SECTION NAME`
- Keep logical sections grouped
- Add CfnOutput for values needed by other stacks or frontend

## Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Stack class | `{ProjectName}{Feature}Stack` | `MyAppBackendStack` |
| Construct ID | `{ProjectName}{Resource}` | `MyAppProjectsTable` |
| Resource name | lowercase-hyphenated | `myapp-generated-pages` |
| Lambda function name | `{ProjectName}{Function}` | `MyAppCreateProject` |
| Export name | `{ProjectName}{Resource}{Type}` | `MyAppUserPoolId` |

## Lambda Definition Pattern

```typescript
const myLambda = new lambda.Function(this, '{ProjectName}MyLambda', {
  functionName: '{ProjectName}MyFunction',
  runtime: lambda.Runtime.JAVA_17,
  code: lambda.Code.fromAsset(
    path.join(__dirname, '../backend-application-code/app/build/distributions/{project-artifact}.zip')
  ),
  handler: 'org.handlers.MyHandler::handleRequest',
  memorySize: 512,
  timeout: Duration.minutes(1),
  environment: {
    TABLE_NAME_ENV: table.tableName,
    BUCKET_NAME_ENV: bucket.bucketName,
  }
});

// Grant minimal permissions
table.grantReadWriteData(myLambda);
bucket.grantReadWrite(myLambda);
secret.grantRead(myLambda);

// Function URL (if needed)
myLambda.addFunctionUrl({
  authType: lambda.FunctionUrlAuthType.AWS_IAM,
  cors: {
    allowedOrigins: ['http://localhost:3000'],
    allowedMethods: [lambda.HttpMethod.POST],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Amz-Date', 'X-Amz-Security-Token'],
    maxAge: Duration.seconds(300),
  },
});
```

## Cross-Stack References

Export from source stack:

```typescript
new cdk.CfnOutput(this, '{ProjectName}MyOutput', {
  value: resource.id,
  exportName: '{ProjectName}MyResourceId',
});
```

Import in consuming stack:

```typescript
const resourceId = Fn.importValue('{ProjectName}MyResourceId');
```

## Alarm Naming and Descriptions

Alarms MUST be named and described in terms of user impact, not technical metrics. The alarm name MUST tell the oncall engineer what customer-facing problem is occurring without needing to understand the underlying infrastructure.

```typescript
// Anti-pattern: describes the metric, not the impact
new cloudwatch.Alarm(this, 'LambdaErrorsAlarm', {
  alarmName: 'myapp-lambda-errors-gt-5',
  alarmDescription: 'Errors metric exceeded threshold of 5 in 5 minutes',
  metric: reportLambda.metricErrors(),
  threshold: 5,
  evaluationPeriods: 1,
});

// Recommended: describes who is affected and where to start
new cloudwatch.Alarm(this, 'ReportGenerationFailingAlarm', {
  alarmName: 'myapp-customers-cannot-generate-reports',
  alarmDescription:
    'Customers are failing to generate usage reports. The report-generation ' +
    'Lambda is erroring — check recent deploys and DynamoDB throttling first. ' +
    'Runbook: https://wiki.example.com/runbooks/report-generation',
  metric: reportLambda.metricErrors(),
  threshold: 5,
  evaluationPeriods: 1,
});
```

## CDK Commands

```bash
npm install          # Install dependencies
npx cdk synth        # Synthesize CloudFormation
npx cdk deploy --all # Deploy all stacks
npx cdk diff         # Preview changes
npx cdk destroy --all # Destroy
```

## Rules

- Do NOT write CDK tests (no assertions, no vitest, no jest). CDK stacks are validated by `cdk synth` and manual deploy — unit tests on IaC add ceremony without value.
- CloudFront certificates MUST be in `us-east-1`
- S3 buckets MUST use `blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL`
- Dev resources SHOULD use `removalPolicy: cdk.RemovalPolicy.DESTROY`
- Permissions MUST be granted using `.grantRead()`, `.grantWrite()`, etc. — never inline IAM policy statements
- Stack instantiation MUST specify `env.region` and `env.account`
- Lambda environment variables MUST be named with `_ENV` suffix to distinguish from system env vars
- Account IDs, ARNs, and secrets MUST NOT be hardcoded — use `env`, CDK context, or Secrets Manager references
- Lambda log groups MUST set explicit retention (e.g. `logRetention: logs.RetentionDays.ONE_MONTH`) — the never-expire default accumulates cost forever
- Prod stateful resources (tables, buckets) MUST use `RemovalPolicy.RETAIN` and deletion protection where available

## Gotchas

- Claude often forgets to add CfnOutput for values the frontend needs
- Claude defaults to `lambda.Runtime.NODEJS_18_X` — check if the project uses Java lambdas
- Claude sometimes uses inline IAM policies instead of `.grant*()` methods
- Claude forgets `cors` configuration on Function URLs, causing frontend CORS errors
