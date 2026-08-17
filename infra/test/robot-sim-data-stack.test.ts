import { describe, expect, test } from 'vitest';
import * as cdk from 'aws-cdk-lib';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { RobotSimDataStack } from '../lib/robot-sim-data-stack';

// NOTE: RobotSimComputeStack is intentionally NOT unit-tested here — it
// references backend/Dockerfile (task 010), which does not exist yet.
// Constructing/synthesizing that stack fails until task 010 lands, per
// task-003's Technical Notes ("document it, don't work around it with a
// placeholder Dockerfile").

function synthStack(environment: string) {
  const app = new cdk.App();
  const stack = new RobotSimDataStack(app, 'TestRobotSimDataStack', {
    env: { account: '123456789012', region: 'us-east-1' },
    environment,
  });
  return Template.fromStack(stack);
}

describe('RobotSimDataStack', () => {
  test('Scenarios table has correct keys and GSI', () => {
    const template = synthStack('dev');

    template.hasResourceProperties('AWS::DynamoDB::Table', {
      TableName: 'robot-sim-scenarios',
      BillingMode: 'PAY_PER_REQUEST',
      KeySchema: [
        { AttributeName: 'scenarioId', KeyType: 'HASH' },
        { AttributeName: 'version', KeyType: 'RANGE' },
      ],
      GlobalSecondaryIndexes: [
        {
          IndexName: 'StatusIndex',
          KeySchema: [
            { AttributeName: 'status', KeyType: 'HASH' },
            { AttributeName: 'updatedAt', KeyType: 'RANGE' },
          ],
        },
      ],
    });
  });

  test('SimulationResults table has correct key, GSI, and streams enabled', () => {
    const template = synthStack('dev');

    template.hasResourceProperties('AWS::DynamoDB::Table', {
      TableName: 'robot-sim-simulation-results',
      BillingMode: 'PAY_PER_REQUEST',
      KeySchema: [{ AttributeName: 'runId', KeyType: 'HASH' }],
      GlobalSecondaryIndexes: [
        {
          IndexName: 'ScenarioRunsIndex',
          KeySchema: [
            { AttributeName: 'scenarioId', KeyType: 'HASH' },
            { AttributeName: 'startedAt', KeyType: 'RANGE' },
          ],
        },
      ],
      StreamSpecification: { StreamViewType: 'NEW_AND_OLD_IMAGES' },
    });
  });

  test('dev context: SimulationResults table uses DESTROY removal policy', () => {
    const template = synthStack('dev');

    template.hasResource('AWS::DynamoDB::Table', {
      Properties: { TableName: 'robot-sim-simulation-results' },
      DeletionPolicy: 'Delete',
    });
  });

  test('prod context: SimulationResults table uses RETAIN removal policy', () => {
    const template = synthStack('prod');

    template.hasResource('AWS::DynamoDB::Table', {
      Properties: { TableName: 'robot-sim-simulation-results' },
      DeletionPolicy: 'Retain',
    });
  });

  test('all three buckets block public access', () => {
    const template = synthStack('dev');

    const buckets = template.findResources('AWS::S3::Bucket');
    const bucketKeys = Object.keys(buckets);
    expect(bucketKeys.length).toBe(3);

    for (const key of bucketKeys) {
      expect(buckets[key].Properties.PublicAccessBlockConfiguration).toEqual({
        BlockPublicAcls: true,
        BlockPublicPolicy: true,
        IgnorePublicAcls: true,
        RestrictPublicBuckets: true,
      });
    }
  });

  test('robot-models and site-packs buckets have versioning enabled', () => {
    const template = synthStack('dev');

    template.hasResourceProperties('AWS::S3::Bucket', {
      BucketName: Match.stringLikeRegexp('robot-sim-robot-models-.*'),
      VersioningConfiguration: { Status: 'Enabled' },
    });
    template.hasResourceProperties('AWS::S3::Bucket', {
      BucketName: Match.stringLikeRegexp('robot-sim-site-packs-.*'),
      VersioningConfiguration: { Status: 'Enabled' },
    });
  });

  test('video-replays bucket has a 90-day lifecycle transition rule', () => {
    const template = synthStack('dev');

    template.hasResourceProperties('AWS::S3::Bucket', {
      BucketName: Match.stringLikeRegexp('robot-sim-video-replays-.*'),
      LifecycleConfiguration: {
        Rules: [
          Match.objectLike({
            Transitions: [
              Match.objectLike({
                StorageClass: 'STANDARD_IA',
                TransitionInDays: 90,
              }),
            ],
          }),
        ],
      },
    });
  });

  test('stack exports table names, table ARNs, stream ARN, and bucket names/ARNs', () => {
    const template = synthStack('dev');

    const outputs = template.findOutputs('*');
    const exportNames = Object.values(outputs).map((o: any) => o.Export?.Name);

    expect(exportNames).toEqual(
      expect.arrayContaining([
        'RobotSimScenariosTableName',
        'RobotSimScenariosTableArn',
        'RobotSimResultsTableName',
        'RobotSimResultsTableArn',
        'RobotSimResultsTableStreamArn',
        'RobotSimVideoReplaysBucketName',
        'RobotSimVideoReplaysBucketArn',
        'RobotSimRobotModelsBucketName',
        'RobotSimRobotModelsBucketArn',
        'RobotSimSitePacksBucketName',
        'RobotSimSitePacksBucketArn',
      ])
    );
  });
});
