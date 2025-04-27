#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import * as dotenv from 'dotenv';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { DatabaseStack } from '../lib/database-stack';
import { StorageStack } from '../lib/storage-stack';
import { WebAppStack } from '../lib/webapp-stack';
import { NetworkStack } from '../lib/network-stack';
import { DnsStack } from '../lib/dns-stack';

// Load environment variables from .env file in root directory
dotenv.config({ path: '../.env' });

// Get AWS account ID from environment or use default
const accountId = process.env.AWS_ACCOUNT_ID || '891709159344';
const region = process.env.AWS_REGION || 'us-west-2';
const env = { account: accountId, region };

// Define domain name for DNS configuration
const domainName = 'gabi.yoga';

const app = new cdk.App();

// Create the stacks with proper dependencies
const networkStack = new NetworkStack(app, 'GabiYogaNetwork', { env });
const storageStack = new StorageStack(app, 'GabiYogaStorage', { env });

// Create database stack
const databaseStack = new DatabaseStack(app, 'GabiYogaDatabase', {
  env,
  vpc: networkStack.vpc
});

// Create WebApp stack and store a reference to it - skipping database for free tier
const webAppStack = new WebAppStack(app, 'GabiYogaWebApp', {
  env,
  vpc: networkStack.vpc,
  bucket: storageStack.storageBucket,
  distribution: storageStack.distribution
});

// Create DNS stack with Route53 configuration
const dnsStack = new DnsStack(app, 'GabiYogaDns', {
  env,
  domainName: domainName,
  loadBalancer: webAppStack.loadBalancer
});

// Add a dependency to ensure the certificate is created before being used
webAppStack.addDependency(dnsStack);

// Now pass the certificate to the WebAppStack to enable HTTPS
webAppStack.addHttpsListener(dnsStack.certificate);

// We'll manage security group access by allowing all traffic within the VPC
// This avoids creating circular dependencies between stacks

// Add tags to all resources
cdk.Tags.of(app).add('Project', 'GabiYoga');
cdk.Tags.of(app).add('Environment', 'Production');
