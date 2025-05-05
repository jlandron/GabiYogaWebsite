#!/usr/bin/env node
import 'source-map-support/register';
import { App, Tags } from 'aws-cdk-lib';
import * as iam from 'aws-cdk-lib/aws-iam';
import { config } from 'dotenv';
import { DatabaseStack } from '../lib/database-stack';
import { StorageStack } from '../lib/storage-stack';
import { WebAppStack } from '../lib/webapp-stack';
import { NetworkStack } from '../lib/network-stack';
import { DnsStack } from '../lib/dns-stack';
import { EmailStack } from '../lib/email-stack';
import { WorkMailUserStack } from '../lib/workmail-user-stack';

// Load environment variables from .env file in root directory
config({ path: '../.env' });

// Get AWS account ID from environment or use default
const accountId = process.env.AWS_ACCOUNT_ID || '891709159344';
const region = process.env.AWS_REGION || 'us-west-2';
const env = { account: accountId, region };

// Define domain name for DNS configuration
const domainName = 'gabi.yoga';

const app = new App();

// Create the stacks with proper dependencies
const networkStack = new NetworkStack(app, 'GabiYogaNetwork', { env });
const storageStack = new StorageStack(app, 'GabiYogaStorage', { env });

// Create database stack FIRST
const databaseStack = new DatabaseStack(app, 'GabiYogaDatabase', {
  env,
  vpc: networkStack.vpc
});

// Then create WebApp stack WITHOUT any database security group references
const webAppStack = new WebAppStack(app, 'GabiYogaWebApp', {
  env,
  vpc: networkStack.vpc,
  bucket: storageStack.storageBucket,
  distribution: storageStack.distribution,
  // Pass database endpoints and secrets but NOT security groups
  databaseEndpoint: databaseStack.database.dbInstanceEndpointAddress,
  // Pass domain name for email configuration
  domainName: domainName,
});

// Grant read access to the database secret to the webapp's IAM role
// This is a one-way dependency, not circular
databaseStack.databaseSecret.grantRead(webAppStack.asg.role);

// Note: The database stack already has a VPC-wide ingress rule
// which allows connections from all EC2 instances in the VPC
// We do NOT add a specific reference to the webapp security group here

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

// Create Email stack with WorkMail for complete email management
const emailStack = new EmailStack(app, 'GabiYogaEmail', {
  env,
  domainName: domainName,
  hostedZoneId: dnsStack.hostedZone.hostedZoneId,
});

// Create WorkMail User stack for automatic user creation and SMTP credentials
const workMailUserStack = new WorkMailUserStack(app, 'GabiYogaWorkMailUser', {
  env,
  organizationId: emailStack.organizationId, // Get organization ID from email stack
  emailFrom: process.env.EMAIL_FROM || 'noreply@gabi.yoga',
  region: region
});

// Add dependency to ensure email stack is created before the WorkMail user
workMailUserStack.addDependency(emailStack);

// Add access to email services and secrets from webapp
webAppStack.asg.role.addManagedPolicy(
  { managedPolicyArn: 'arn:aws:iam::aws:policy/AmazonSESFullAccess' }
);
webAppStack.asg.role.addManagedPolicy(
  { managedPolicyArn: 'arn:aws:iam::aws:policy/AmazonWorkMailFullAccess' }
);

// Grant the webapp instance access to the SMTP secret
// The secret needs to explicitly grant permission to the web app role
workMailUserStack.smtpCredentials.grantRead(webAppStack.asg.role);

// Also make sure the secret's resource policy allows access
// Add resource policy for 'gabi-yoga-workmail-smtp-credentials' if it exists in the account
const legacySecretName = 'gabi-yoga-workmail-smtp-credentials';
new iam.Policy(webAppStack, 'LegacySecretAccessPolicy', {
  statements: [
    new iam.PolicyStatement({
      actions: ['secretsmanager:GetSecretValue', 'secretsmanager:DescribeSecret'],
      resources: [`arn:aws:secretsmanager:${region}:${accountId}:secret:${legacySecretName}-*`]
    })
  ],
  roles: [webAppStack.asg.role]
});

// Add tags to all resources
Tags.of(app).add('Project', 'GabiYoga');
Tags.of(app).add('Environment', 'Production');
