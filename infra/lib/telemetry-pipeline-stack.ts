import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as iot from 'aws-cdk-lib/aws-iot';
import * as iam from 'aws-cdk-lib/aws-iam';

export class TelemetryPipelineStack extends cdk.Stack {
  public readonly archiveBucket: s3.Bucket;
  public readonly faultAlertsTopic: sns.Topic;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // ======================
    // 1. DATA LAYER
    // ======================

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

    this.archiveBucket.grantPut(iotRuleRole);
    this.faultAlertsTopic.grantPublish(iotRuleRole);

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
