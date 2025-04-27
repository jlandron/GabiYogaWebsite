#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import * as dotenv from 'dotenv';
import { DatabaseStack } from '../lib/database-stack';
import { StorageStack } from '../lib/storage-stack';
import { WebAppStack } from '../lib/webapp-stack';
import { NetworkStack } from '../lib/network-stack';

// Load environment variables from .env file in root directory
dotenv.config({ path: '../.env' });

// Get AWS account ID from environment or use default from TODO
const accountId = process.env.AWS_ACCOUNT_ID || '891709159344';
const region = process.env.AWS_REGION || 'us-west-2';
const env = { account: accountId, region };

const app = new cdk.App();

// Create the stacks with proper dependencies
const networkStack = new NetworkStack(app, 'GabiYogaNetwork', { env });

const databaseStack = new DatabaseStack(app, 'GabiYogaDatabase', {
  env,
  vpc: networkStack.vpc
});

const storageStack = new StorageStack(app, 'GabiYogaStorage', { env });

new WebAppStack(app, 'GabiYogaWebApp', {
  env,
  vpc: networkStack.vpc,
  database: databaseStack.database,
  databaseSecurityGroup: databaseStack.databaseSecurityGroup,
  bucket: storageStack.storageBucket,
  distribution: storageStack.distribution
});

// Add tags to all resources
cdk.Tags.of(app).add('Project', 'GabiYoga');
cdk.Tags.of(app).add('Environment', 'Production');
