#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { LambdaDbStack } from '../lib/lambda-db-stack';
import { LambdaApiStack } from '../lib/lambda-api-stack';
import { LambdaAuthStack } from '../lib/lambda-auth-stack';
import { LambdaMonitoringStack } from '../lib/lambda-monitoring-stack';
import { LambdaSesStack } from '../lib/lambda-ses-stack';
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
  // Pass auth resources
  jwtSecret: authStack.jwtSecret,
  stripeSecret: authStack.stripeSecret,
});

// Monitoring Stack - CloudWatch dashboards, alarms, and logs
const monitoringStack = new LambdaMonitoringStack(app, `${stackPrefix}-Monitoring`, {
  env,
  stage,
  tags: commonTags,
  description: `Gabi Yoga Lambda Monitoring Stack (${stage})`,
  // Pass API Gateway and Lambda references for monitoring
  apiGateway: apiStack.apiGateway,
  lambdaFunctions: apiStack.lambdaFunctions,
  dynamodbTables: dbStack.dynamodbTables,
});

// SES Stack - Email sending infrastructure
const sesStack = new LambdaSesStack(app, `${stackPrefix}-SES`, {
  env,
  stage,
  tags: commonTags,
  description: `Gabi Yoga Lambda SES Email Stack (${stage})`,
  domainName: 'gabi.yoga',
  // If we have the hosted zone ID, we'd include it here
  // hostedZoneId: 'Z1234567890ABC',
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

// Stack dependencies
apiStack.addDependency(dbStack);
apiStack.addDependency(authStack);
apiStack.addDependency(sesStack);
monitoringStack.addDependency(apiStack);
route53Stack.addDependency(apiStack);

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

new cdk.CfnOutput(monitoringStack, 'MonitoringDashboardUrl', {
  value: monitoringStack.dashboardUrl,
  description: 'CloudWatch Dashboard URL',
  exportName: `${stackPrefix}-MonitoringDashboardUrl`,
});

new cdk.CfnOutput(sesStack, 'EmailDomain', {
  value: 'gabi.yoga',
  description: 'Email domain for sending emails',
  exportName: `${stackPrefix}-EmailDomain`,
});

new cdk.CfnOutput(sesStack, 'DefaultSenderEmail', {
  value: 'noreply@gabi.yoga',
  description: 'Default sender email address',
  exportName: `${stackPrefix}-DefaultSenderEmail`,
});

// Route53 outputs are already defined in the stack

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
console.log(`- Monitoring Stack: ${monitoringStack.stackName}`);
console.log(`- SES Stack: ${sesStack.stackName}`);
console.log(`- Route53 Stack: ${route53Stack.stackName}`);
console.log(`- Region: ${region}`);
console.log(`- Account: ${account}`);
