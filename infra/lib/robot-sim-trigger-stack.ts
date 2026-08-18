import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as lambdaEventSources from 'aws-cdk-lib/aws-lambda-event-sources';

export interface RobotSimTriggerStackProps extends cdk.StackProps {
  environment: string;
  scenariosTable: dynamodb.Table;
  simulatorFunction: lambda.DockerImageFunction;
}

export class RobotSimTriggerStack extends cdk.Stack {
  public readonly triggerDlq: sqs.Queue;

  constructor(scope: Construct, id: string, props: RobotSimTriggerStackProps) {
    super(scope, id, props);

    const isProd = props.environment === 'prod';
    const removalPolicy = isProd ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY;

    // ======================
    // 1. DATA LAYER
    // ======================

    this.triggerDlq = new sqs.Queue(this, 'RobotSimTriggerDlq', {
      queueName: 'robot-sim-trigger-dlq',
      retentionPeriod: cdk.Duration.days(14),
      removalPolicy,
    });

    // ======================
    // 2. COMPUTE LAYER
    // ======================

    props.scenariosTable.grantStreamRead(props.simulatorFunction);

    props.simulatorFunction.addEventSource(
      new lambdaEventSources.DynamoEventSource(props.scenariosTable, {
        startingPosition: lambda.StartingPosition.TRIM_HORIZON,
        batchSize: 1,
        retryAttempts: 2,
        filters: [
          lambda.FilterCriteria.filter({
            eventName: lambda.FilterRule.isEqual('MODIFY'),
            dynamodb: {
              NewImage: {
                status: { S: lambda.FilterRule.isEqual('queued') },
              },
              OldImage: {
                status: { S: lambda.FilterRule.notEquals('queued') },
              },
            },
          }),
        ],
        onFailure: new lambdaEventSources.SqsDlq(this.triggerDlq),
      }),
    );

    // ======================
    // 3. OUTPUTS
    // ======================

    new cdk.CfnOutput(this, 'RobotSimTriggerDlqUrlOutput', {
      value: this.triggerDlq.queueUrl,
      exportName: 'RobotSimTriggerDlqUrl',
    });
    new cdk.CfnOutput(this, 'RobotSimTriggerDlqArnOutput', {
      value: this.triggerDlq.queueArn,
      exportName: 'RobotSimTriggerDlqArn',
    });
  }
}
