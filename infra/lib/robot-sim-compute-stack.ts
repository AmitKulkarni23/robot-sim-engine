import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as path from 'path';

export interface RobotSimComputeStackProps extends cdk.StackProps {
  /** 'dev' | 'prod' — reserved for future environment-aware compute config. */
  environment: string;
  scenariosTable: dynamodb.Table;
  resultsTable: dynamodb.Table;
  videoReplaysBucket: s3.Bucket;
  robotModelsBucket: s3.Bucket;
  sitePacksBucket: s3.Bucket;
}

/**
 * RobotSimComputeStack — the single Lambda container that runs the entire
 * simulation engine (MuJoCo physics + OSMesa render + ffmpeg encode).
 *
 * NOTE: the Function URL is created with authType: NONE because Supabase
 * Database Webhooks cannot sign AWS SigV4 requests. The Lambda handler
 * (task 010) MUST validate a shared-secret header (e.g. X-Webhook-Secret)
 * on every invocation — that validation happens in application code, not
 * here, but omitting it would leave the endpoint fully unauthenticated.
 */
export class RobotSimComputeStack extends cdk.Stack {
  public readonly simulatorFunction: lambda.DockerImageFunction;

  constructor(scope: Construct, id: string, props: RobotSimComputeStackProps) {
    super(scope, id, props);

    // ======================
    // 2. COMPUTE LAYER
    // ======================

    // Container image build context is backend/ — task 010 populates this
    // directory with a Dockerfile. Until then, `cdk synth` fails on image
    // build; that is expected and acceptable at this stage.
    this.simulatorFunction = new lambda.DockerImageFunction(this, 'RobotSimSimulatorFunction', {
      functionName: 'RobotSimSimulator',
      code: lambda.DockerImageCode.fromImageAsset(path.join(__dirname, '../../backend')),
      memorySize: 3008,
      timeout: cdk.Duration.minutes(5),
      environment: {
        SCENARIOS_TABLE_NAME_ENV: props.scenariosTable.tableName,
        RESULTS_TABLE_NAME_ENV: props.resultsTable.tableName,
        VIDEO_BUCKET_NAME_ENV: props.videoReplaysBucket.bucketName,
        MODELS_BUCKET_NAME_ENV: props.robotModelsBucket.bucketName,
        SITE_PACKS_BUCKET_NAME_ENV: props.sitePacksBucket.bucketName,
      },
      logRetention: logs.RetentionDays.ONE_MONTH,
    });

    // Minimal IAM grants
    props.scenariosTable.grantReadWriteData(this.simulatorFunction);
    props.resultsTable.grantReadWriteData(this.simulatorFunction);
    props.videoReplaysBucket.grantReadWrite(this.simulatorFunction);
    props.robotModelsBucket.grantRead(this.simulatorFunction);
    props.sitePacksBucket.grantRead(this.simulatorFunction);

    // ======================
    // 3. OUTPUTS
    // ======================
  }
}
