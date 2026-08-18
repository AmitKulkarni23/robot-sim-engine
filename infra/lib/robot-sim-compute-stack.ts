import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ecr_assets from 'aws-cdk-lib/aws-ecr-assets';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import * as path from 'path';

export interface RobotSimComputeStackProps extends cdk.StackProps {
  /** 'dev' | 'prod' — reserved for future environment-aware compute config. */
  environment: string;
  scenariosTable: dynamodb.Table;
  resultsTable: dynamodb.Table;
  telemetryBucket: s3.Bucket;
  robotModelsBucket: s3.Bucket;
  sitePacksBucket: s3.Bucket;
}

export class RobotSimComputeStack extends cdk.Stack {
  public readonly simulatorFunction: lambda.DockerImageFunction;
  public readonly functionUrl: lambda.FunctionUrl;

  constructor(scope: Construct, id: string, props: RobotSimComputeStackProps) {
    super(scope, id, props);

    const webhookSecretParam = ssm.StringParameter.fromSecureStringParameterAttributes(
      this, 'RobotSimWebhookSecret', { parameterName: '/robot-sim/webhook-secret' },
    );

    // ======================
    // 2. COMPUTE LAYER
    // ======================

    this.simulatorFunction = new lambda.DockerImageFunction(this, 'RobotSimSimulatorFunction', {
      functionName: 'RobotSimSimulator',
      code: lambda.DockerImageCode.fromImageAsset(path.join(__dirname, '../../backend'), {
        platform: ecr_assets.Platform.LINUX_AMD64,
      }),
      memorySize: 3008,
      timeout: cdk.Duration.minutes(5),
      environment: {
        SCENARIOS_TABLE_NAME_ENV: props.scenariosTable.tableName,
        RESULTS_TABLE_NAME_ENV: props.resultsTable.tableName,
        TELEMETRY_BUCKET_NAME_ENV: props.telemetryBucket.bucketName,
        MODELS_BUCKET_NAME_ENV: props.robotModelsBucket.bucketName,
        SITE_PACKS_BUCKET_NAME_ENV: props.sitePacksBucket.bucketName,
        WEBHOOK_SECRET_PARAM_NAME_ENV: '/robot-sim/webhook-secret',
      },
      logRetention: logs.RetentionDays.ONE_MONTH,
      reservedConcurrentExecutions: 3,
    });

    // Minimal IAM grants
    props.scenariosTable.grantReadWriteData(this.simulatorFunction);
    props.resultsTable.grantReadWriteData(this.simulatorFunction);
    props.telemetryBucket.grantReadWrite(this.simulatorFunction);
    props.robotModelsBucket.grantReadWrite(this.simulatorFunction);
    props.sitePacksBucket.grantRead(this.simulatorFunction);
    webhookSecretParam.grantRead(this.simulatorFunction);

    this.functionUrl = this.simulatorFunction.addFunctionUrl({
      authType: lambda.FunctionUrlAuthType.NONE,
      cors: {
        allowedOrigins: ['https://frontend-two-delta-84.vercel.app'],
        allowedMethods: [lambda.HttpMethod.GET, lambda.HttpMethod.POST],
        allowedHeaders: ['Content-Type', 'x-webhook-secret'],
        maxAge: cdk.Duration.seconds(300),
      },
    });

    // ======================
    // 3. OUTPUTS
    // ======================

    new cdk.CfnOutput(this, 'RobotSimFunctionUrlOutput', {
      value: this.functionUrl.url,
      exportName: 'RobotSimFunctionUrl',
    });
  }
}
