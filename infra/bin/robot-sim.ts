#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { RobotSimDataStack } from '../lib/robot-sim-data-stack';
import { RobotSimComputeStack } from '../lib/robot-sim-compute-stack';
import { RobotSimTriggerStack } from '../lib/robot-sim-trigger-stack';

const app = new cdk.App();

const environment = (app.node.tryGetContext('environment') as string) ?? 'dev';

const env = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION,
};

const dataStack = new RobotSimDataStack(app, 'RobotSimDataStack', {
  env,
  environment,
});

const computeStack = new RobotSimComputeStack(app, 'RobotSimComputeStack', {
  env,
  environment,
  scenariosTable: dataStack.scenariosTable,
  resultsTable: dataStack.resultsTable,
  videoReplaysBucket: dataStack.videoReplaysBucket,
  robotModelsBucket: dataStack.robotModelsBucket,
  sitePacksBucket: dataStack.sitePacksBucket,
});

new RobotSimTriggerStack(app, 'RobotSimTriggerStack', {
  env,
  environment,
  scenariosTable: dataStack.scenariosTable,
  simulatorFunction: computeStack.simulatorFunction,
});
