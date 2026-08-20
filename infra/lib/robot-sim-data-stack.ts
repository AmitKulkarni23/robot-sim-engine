import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as s3 from 'aws-cdk-lib/aws-s3';

export interface RobotSimDataStackProps extends cdk.StackProps {
  /** 'dev' | 'prod' — controls RemovalPolicy for all stateful resources. */
  environment: string;
}

/**
 * RobotSimDataStack — persistence layer for the simulation engine.
 *
 * Owns:
 *  - Scenarios table (versioned scenario definitions)
 *  - SimulationResults table (per-run verdicts/metrics, streamed)
 *  - telemetry bucket       — JSON telemetry output, key prefix {scenarioId}/{runId}/telemetry.json
 *  - robot-models bucket    — cached Menagerie assets, key prefix {modelName}/{version}/model.mjcf
 *  - site-packs bucket      — customer-specific bundles, key prefix {customerId}/{packVersion}/
 */
export class RobotSimDataStack extends cdk.Stack {
  public readonly scenariosTable: dynamodb.Table;
  public readonly resultsTable: dynamodb.Table;
  public readonly telemetryBucket: s3.Bucket;
  public readonly robotModelsBucket: s3.Bucket;
  public readonly sitePacksBucket: s3.Bucket;

  constructor(scope: Construct, id: string, props: RobotSimDataStackProps) {
    super(scope, id, props);

    const isProd = props.environment === 'prod';
    const removalPolicy = isProd ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY;

    // ======================
    // 1. DATA LAYER
    // ======================

    // --- Scenarios table ---
    this.scenariosTable = new dynamodb.Table(this, 'RobotSimScenariosTable', {
      tableName: 'robot-sim-scenarios',
      partitionKey: { name: 'scenarioId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'version', type: dynamodb.AttributeType.NUMBER },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      stream: dynamodb.StreamViewType.NEW_AND_OLD_IMAGES,
      removalPolicy,
    });

    this.scenariosTable.addGlobalSecondaryIndex({
      indexName: 'StatusIndex',
      partitionKey: { name: 'status', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'updatedAt', type: dynamodb.AttributeType.STRING },
    });

    // --- SimulationResults table ---
    // Keys use camelCase to match the Lambda handler's write format.
    this.resultsTable = new dynamodb.Table(this, 'RobotSimResultsTable', {
      tableName: 'robot-sim-simulation-results',
      partitionKey: { name: 'runId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      stream: dynamodb.StreamViewType.NEW_AND_OLD_IMAGES,
      removalPolicy,
    });

    this.resultsTable.addGlobalSecondaryIndex({
      indexName: 'ScenarioRunsIndex',
      partitionKey: { name: 'scenarioId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'startedAt', type: dynamodb.AttributeType.STRING },
    });

    // --- telemetry bucket ---
    // Key prefix convention: {scenarioId}/{runId}/telemetry.json
    this.telemetryBucket = new s3.Bucket(this, 'RobotSimVideoReplaysBucket', {
      bucketName: `robot-sim-video-replays-${this.account}-${this.region}`,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      cors: [
        {
          allowedMethods: [s3.HttpMethods.GET],
          allowedOrigins: ['*'],
          allowedHeaders: ['*'],
          maxAge: 3000,
        },
      ],
      lifecycleRules: [
        {
          transitions: [
            {
              storageClass: s3.StorageClass.INFREQUENT_ACCESS,
              transitionAfter: cdk.Duration.days(90),
            },
          ],
        },
      ],
      removalPolicy,
      autoDeleteObjects: !isProd,
    });

    // --- robot-models bucket ---
    // Key prefix convention: {modelName}/{version}/model.mjcf (e.g. unitree_g1/1.0.0/model.mjcf)
    this.robotModelsBucket = new s3.Bucket(this, 'RobotSimRobotModelsBucket', {
      bucketName: `robot-sim-robot-models-${this.account}-${this.region}`,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      versioned: true,
      removalPolicy,
      autoDeleteObjects: !isProd,
    });

    // --- site-packs bucket ---
    // Key prefix convention: {customerId}/{packVersion}/
    this.sitePacksBucket = new s3.Bucket(this, 'RobotSimSitePacksBucket', {
      bucketName: `robot-sim-site-packs-${this.account}-${this.region}`,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      versioned: true,
      removalPolicy,
      autoDeleteObjects: !isProd,
    });

    // ======================
    // 3. OUTPUTS
    // ======================

    new cdk.CfnOutput(this, 'RobotSimScenariosTableNameOutput', {
      value: this.scenariosTable.tableName,
      exportName: 'RobotSimScenariosTableName',
    });
    new cdk.CfnOutput(this, 'RobotSimScenariosTableArnOutput', {
      value: this.scenariosTable.tableArn,
      exportName: 'RobotSimScenariosTableArn',
    });
    new cdk.CfnOutput(this, 'RobotSimScenariosTableStreamArnOutput', {
      value: this.scenariosTable.tableStreamArn ?? '',
      exportName: 'RobotSimScenariosTableStreamArn',
    });

    new cdk.CfnOutput(this, 'RobotSimResultsTableNameOutput', {
      value: this.resultsTable.tableName,
      exportName: 'RobotSimResultsTableName',
    });
    new cdk.CfnOutput(this, 'RobotSimResultsTableArnOutput', {
      value: this.resultsTable.tableArn,
      exportName: 'RobotSimResultsTableArn',
    });
    new cdk.CfnOutput(this, 'RobotSimResultsTableStreamArnOutput', {
      value: this.resultsTable.tableStreamArn ?? '',
      exportName: 'RobotSimResultsTableStreamArn',
    });

    new cdk.CfnOutput(this, 'RobotSimVideoReplaysBucketNameOutput', {
      value: this.telemetryBucket.bucketName,
      exportName: 'RobotSimVideoReplaysBucketName',
    });
    new cdk.CfnOutput(this, 'RobotSimVideoReplaysBucketArnOutput', {
      value: this.telemetryBucket.bucketArn,
      exportName: 'RobotSimVideoReplaysBucketArn',
    });

    new cdk.CfnOutput(this, 'RobotSimRobotModelsBucketNameOutput', {
      value: this.robotModelsBucket.bucketName,
      exportName: 'RobotSimRobotModelsBucketName',
    });
    new cdk.CfnOutput(this, 'RobotSimRobotModelsBucketArnOutput', {
      value: this.robotModelsBucket.bucketArn,
      exportName: 'RobotSimRobotModelsBucketArn',
    });

    new cdk.CfnOutput(this, 'RobotSimSitePacksBucketNameOutput', {
      value: this.sitePacksBucket.bucketName,
      exportName: 'RobotSimSitePacksBucketName',
    });
    new cdk.CfnOutput(this, 'RobotSimSitePacksBucketArnOutput', {
      value: this.sitePacksBucket.bucketArn,
      exportName: 'RobotSimSitePacksBucketArn',
    });
  }
}
