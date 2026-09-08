import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as timestream from 'aws-cdk-lib/aws-timestream';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as iot from 'aws-cdk-lib/aws-iot';
import * as iam from 'aws-cdk-lib/aws-iam';

export class TelemetryPipelineStack extends cdk.Stack {
  public readonly timestreamDatabase: timestream.CfnDatabase;
  public readonly timestreamTable: timestream.CfnTable;
  public readonly archiveBucket: s3.Bucket;
  public readonly faultAlertsTopic: sns.Topic;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // ======================
    // 1. DATA LAYER
    // ======================

    this.timestreamDatabase = new timestream.CfnDatabase(this, 'RobotSimTelemetryDb', {
      databaseName: 'robot-sim-telemetry',
    });

    this.timestreamTable = new timestream.CfnTable(this, 'RobotSimTelemetryTable', {
      databaseName: this.timestreamDatabase.databaseName!,
      tableName: 'telemetry',
      retentionProperties: {
        MemoryStoreRetentionPeriodInHours: '1',
        MagneticStoreRetentionPeriodInDays: '1',
      },
      magneticStoreWriteProperties: {
        EnableMagneticStoreWrites: true,
      },
    });
    this.timestreamTable.addDependency(this.timestreamDatabase);

    this.archiveBucket = new s3.Bucket(this, 'RobotSimTelemetryArchive', {
      bucketName: `robot-sim-telemetry-archive-${this.account}-${this.region}`,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    this.faultAlertsTopic = new sns.Topic(this, 'RobotSimFaultAlerts', {
      topicName: 'robot-sim-fault-alerts',
    });

    // ======================
    // 2. IOT RULES ENGINE
    // ======================

    const iotRuleRole = new iam.Role(this, 'RobotSimIoTRuleRole', {
      assumedBy: new iam.ServicePrincipal('iot.amazonaws.com'),
    });

    iotRuleRole.addToPolicy(new iam.PolicyStatement({
      actions: [
        'timestream:WriteRecords',
        'timestream:DescribeEndpoints',
      ],
      resources: ['*'],
    }));

    this.archiveBucket.grantPut(iotRuleRole);
    this.faultAlertsTopic.grantPublish(iotRuleRole);

    new iot.CfnTopicRule(this, 'RobotSimTelemetryToTimestream', {
      ruleName: 'robot_sim_telemetry_to_timestream',
      topicRulePayload: {
        sql: "SELECT * FROM 'dt/+/+/telemetry'",
        awsIotSqlVersion: '2016-03-23',
        actions: [{
          timestream: {
            databaseName: this.timestreamDatabase.databaseName!,
            tableName: this.timestreamTable.tableName!,
            roleArn: iotRuleRole.roleArn,
            dimensions: [
              { name: 'tenant_id', value: '${topic(2)}' },
              { name: 'robot_id', value: '${topic(3)}' },
            ],
            timestamp: {
              value: '${timestamp()}',
              unit: 'MILLISECONDS',
            },
          },
        }],
      },
    });

    new iot.CfnTopicRule(this, 'RobotSimTelemetryToS3', {
      ruleName: 'robot_sim_telemetry_to_s3',
      topicRulePayload: {
        sql: "SELECT * FROM 'dt/+/+/telemetry'",
        awsIotSqlVersion: '2016-03-23',
        actions: [{
          s3: {
            bucketName: this.archiveBucket.bucketName,
            key: 'raw/${topic(2)}/${topic(3)}/${parse_time("yyyy/MM/dd", timestamp())}/${timestamp()}-${newuuid()}.json',
            roleArn: iotRuleRole.roleArn,
          },
        }],
      },
    });

    new iot.CfnTopicRule(this, 'RobotSimFaultToSns', {
      ruleName: 'robot_sim_fault_to_sns',
      topicRulePayload: {
        sql: "SELECT *, topic(2) as tenant_id, topic(3) as robot_id FROM 'dt/+/+/fault'",
        awsIotSqlVersion: '2016-03-23',
        actions: [{
          sns: {
            targetArn: this.faultAlertsTopic.topicArn,
            roleArn: iotRuleRole.roleArn,
            messageFormat: 'JSON',
          },
        }],
      },
    });

    // ======================
    // 3. OUTPUTS
    // ======================

    new cdk.CfnOutput(this, 'TimestreamDatabaseName', {
      value: this.timestreamDatabase.databaseName!,
      exportName: 'TelemetryTimestreamDb',
    });
    new cdk.CfnOutput(this, 'TimestreamTableName', {
      value: this.timestreamTable.tableName!,
      exportName: 'TelemetryTimestreamTable',
    });
    new cdk.CfnOutput(this, 'ArchiveBucketName', {
      value: this.archiveBucket.bucketName,
      exportName: 'TelemetryArchiveBucket',
    });
    new cdk.CfnOutput(this, 'FaultAlertsTopicArn', {
      value: this.faultAlertsTopic.topicArn,
      exportName: 'TelemetryFaultAlertsTopic',
    });
  }
}
