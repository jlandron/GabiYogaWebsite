#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { LambdaDbStack } from '../lib/lambda-db-stack';
import { LambdaApiStack } from '../lib/lambda-api-stack';
import { LambdaAuthStack } from '../lib/lambda-auth-stack';
import { LambdaEmailStack } from '../lib/lambda-ses-stack';
import { LambdaRoute53Stack } from '../lib/lambda-route53-stack';

const app = new cdk.App();

// Get stage from context (dev/prod)
const stage = app.node.tryGetContext('stage') || 'dev';
const region = 'us-east-1';
const account = '891709159344';

// Environment configuration
const env = {
  account,
  region,
};

// Stack name prefix
const stackPrefix = `GabiYogaLambda-${stage}`;

// Tags for all stacks
const commonTags = {
  Project: 'GabiYoga',
  Environment: stage,
  Service: 'Lambda',
  ManagedBy: 'CDK',
};

// Database Stack - DynamoDB tables and related resources
const dbStack = new LambdaDbStack(app, `${stackPrefix}-Database`, {
  env,
  stage,
  tags: commonTags,
  description: `Gabi Yoga Lambda Database Stack (${stage})`,
});

// Authentication Stack - JWT secrets, user authentication resources
const authStack = new LambdaAuthStack(app, `${stackPrefix}-Auth`, {
  env,
  stage,
  tags: commonTags,
  description: `Gabi Yoga Lambda Authentication Stack (${stage})`,
  // Pass database references
  usersTable: dbStack.usersTable,
  jwtBlacklistTable: dbStack.jwtBlacklistTable,
});

// WorkMail Email Stack - Email sending infrastructure using WorkMail SMTP
const emailStack = new LambdaEmailStack(app, `${stackPrefix}-Email`, {
  env,
  stage,
  tags: commonTags,
  description: `Gabi Yoga Lambda WorkMail Email Stack (${stage})`,
  domainName: 'gabi.yoga',
});

// API Stack - Lambda functions and API Gateway
const apiStack = new LambdaApiStack(app, `${stackPrefix}-Api`, {
  env,
  stage,
  tags: commonTags,
  description: `Gabi Yoga Lambda API Stack (${stage})`,
  // Pass database table references
  usersTable: dbStack.usersTable,
  blogPostsTable: dbStack.blogPostsTable,
  classesTable: dbStack.classesTable,
  bookingsTable: dbStack.bookingsTable,
  retreatsTable: dbStack.retreatsTable,
  workshopsTable: dbStack.workshopsTable,
  galleryTable: dbStack.galleryTable,
  settingsTable: dbStack.settingsTable,
  communicationsTable: dbStack.communicationsTable,
  jwtBlacklistTable: dbStack.jwtBlacklistTable,
  offeringsTable: dbStack.offeringsTable,
  // Pass auth resources
  jwtSecret: authStack.jwtSecret,
  stripeSecret: authStack.stripeSecret,
});

// Route53 Stack - Custom domain for API Gateway
const route53Stack = new LambdaRoute53Stack(app, `${stackPrefix}-Route53`, {
  env,
  stage,
  tags: commonTags,
  description: `Gabi Yoga Lambda Route53 Stack (${stage})`,
  apiGateway: apiStack.apiGateway,
  domainName: 'gabi.yoga',
});

// Image CDN is now directly integrated in the API stack

// Stack dependencies
apiStack.addDependency(dbStack);
apiStack.addDependency(authStack);
apiStack.addDependency(emailStack);
route53Stack.addDependency(apiStack);
// No need for imageCdnStack dependencies as it's now part of the API stack

// Output key information
new cdk.CfnOutput(apiStack, 'ApiGatewayUrl', {
  value: apiStack.apiGateway.url,
  description: 'API Gateway URL',
  exportName: `${stackPrefix}-ApiGatewayUrl`,
});

new cdk.CfnOutput(apiStack, 'ApiGatewayId', {
  value: apiStack.apiGateway.restApiId,
  description: 'API Gateway ID',
  exportName: `${stackPrefix}-ApiGatewayId`,
});

// Custom domain output for production
if (stage === 'prod') {
  new cdk.CfnOutput(apiStack, 'CustomDomainName', {
    value: 'api.gabi.yoga',
    description: 'Custom domain name for API',
    exportName: `${stackPrefix}-CustomDomainName`,
  });
}

// Environment-specific outputs
new cdk.CfnOutput(dbStack, 'DatabaseStackName', {
  value: dbStack.stackName,
  description: 'Database stack name',
  exportName: `${stackPrefix}-DatabaseStackName`,
});

new cdk.CfnOutput(authStack, 'AuthStackName', {
  value: authStack.stackName,
  description: 'Authentication stack name',
  exportName: `${stackPrefix}-AuthStackName`,
});

new cdk.CfnOutput(emailStack, 'EmailDomain', {
  value: 'gabi.yoga',
  description: 'Email domain for sending emails',
  exportName: `${stackPrefix}-WorkMailEmailDomain`,
});

new cdk.CfnOutput(route53Stack, 'ApiCustomDomain', {
  value: route53Stack.customDomainName,
  description: 'Custom domain for API',
  exportName: `${stackPrefix}-ApiCustomDomain`,
});

// Add stack information for debugging
console.log(`Deploying Gabi Yoga Lambda stacks for ${stage} environment:`);
console.log(`- Database Stack: ${dbStack.stackName}`);
console.log(`- Auth Stack: ${authStack.stackName}`);
console.log(`- API Stack: ${apiStack.stackName}`);
console.log(`- Email Stack: ${emailStack.stackName}`);
console.log(`- Route53 Stack: ${route53Stack.stackName}`);
console.log(`- Image CDN: Integrated into API Stack`);
console.log(`- Region: ${region}`);
console.log(`- Account: ${account}`);
