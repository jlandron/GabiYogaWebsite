#!/usr/bin/env node
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
require("source-map-support/register");
const cdk = __importStar(require("aws-cdk-lib"));
const lambda_db_stack_1 = require("../lib/lambda-db-stack");
const lambda_api_stack_1 = require("../lib/lambda-api-stack");
const lambda_auth_stack_1 = require("../lib/lambda-auth-stack");
const lambda_ses_stack_1 = require("../lib/lambda-ses-stack");
const lambda_route53_stack_1 = require("../lib/lambda-route53-stack");
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
const dbStack = new lambda_db_stack_1.LambdaDbStack(app, `${stackPrefix}-Database`, {
    env,
    stage,
    tags: commonTags,
    description: `Gabi Yoga Lambda Database Stack (${stage})`,
});
// Authentication Stack - JWT secrets, user authentication resources
const authStack = new lambda_auth_stack_1.LambdaAuthStack(app, `${stackPrefix}-Auth`, {
    env,
    stage,
    tags: commonTags,
    description: `Gabi Yoga Lambda Authentication Stack (${stage})`,
    // Pass database references
    usersTable: dbStack.usersTable,
    jwtBlacklistTable: dbStack.jwtBlacklistTable,
});
// API Stack - Lambda functions and API Gateway
const apiStack = new lambda_api_stack_1.LambdaApiStack(app, `${stackPrefix}-Api`, {
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
// Route53 Stack - Custom domain for API Gateway
const route53Stack = new lambda_route53_stack_1.LambdaRoute53Stack(app, `${stackPrefix}-Route53`, {
    env,
    stage,
    tags: commonTags,
    description: `Gabi Yoga Lambda Route53 Stack (${stage})`,
    apiGateway: apiStack.apiGateway,
    domainName: 'gabi.yoga',
});
// SES Stack - Email sending infrastructure
const sesStack = new lambda_ses_stack_1.LambdaSesStack(app, `${stackPrefix}-SES`, {
    env,
    stage,
    tags: commonTags,
    description: `Gabi Yoga Lambda SES Email Stack (${stage})`,
    domainName: 'gabi.yoga',
    // Pass the hosted zone ID from Route53 stack
    hostedZoneId: route53Stack.hostedZone.hostedZoneId,
});
// Stack dependencies
apiStack.addDependency(dbStack);
apiStack.addDependency(authStack);
route53Stack.addDependency(apiStack);
sesStack.addDependency(route53Stack);
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
console.log(`- SES Stack: ${sesStack.stackName}`);
console.log(`- Route53 Stack: ${route53Stack.stackName}`);
console.log(`- Region: ${region}`);
console.log(`- Account: ${account}`);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGFtYmRhLXN0YWNrLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsibGFtYmRhLXN0YWNrLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQ0EsdUNBQXFDO0FBQ3JDLGlEQUFtQztBQUNuQyw0REFBdUQ7QUFDdkQsOERBQXlEO0FBQ3pELGdFQUEyRDtBQUMzRCw4REFBeUQ7QUFDekQsc0VBQWlFO0FBRWpFLE1BQU0sR0FBRyxHQUFHLElBQUksR0FBRyxDQUFDLEdBQUcsRUFBRSxDQUFDO0FBRTFCLG9DQUFvQztBQUNwQyxNQUFNLEtBQUssR0FBRyxHQUFHLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxPQUFPLENBQUMsSUFBSSxLQUFLLENBQUM7QUFDdkQsTUFBTSxNQUFNLEdBQUcsV0FBVyxDQUFDO0FBQzNCLE1BQU0sT0FBTyxHQUFHLGNBQWMsQ0FBQztBQUUvQiw0QkFBNEI7QUFDNUIsTUFBTSxHQUFHLEdBQUc7SUFDVixPQUFPO0lBQ1AsTUFBTTtDQUNQLENBQUM7QUFFRixvQkFBb0I7QUFDcEIsTUFBTSxXQUFXLEdBQUcsa0JBQWtCLEtBQUssRUFBRSxDQUFDO0FBRTlDLHNCQUFzQjtBQUN0QixNQUFNLFVBQVUsR0FBRztJQUNqQixPQUFPLEVBQUUsVUFBVTtJQUNuQixXQUFXLEVBQUUsS0FBSztJQUNsQixPQUFPLEVBQUUsUUFBUTtJQUNqQixTQUFTLEVBQUUsS0FBSztDQUNqQixDQUFDO0FBRUYseURBQXlEO0FBQ3pELE1BQU0sT0FBTyxHQUFHLElBQUksK0JBQWEsQ0FBQyxHQUFHLEVBQUUsR0FBRyxXQUFXLFdBQVcsRUFBRTtJQUNoRSxHQUFHO0lBQ0gsS0FBSztJQUNMLElBQUksRUFBRSxVQUFVO0lBQ2hCLFdBQVcsRUFBRSxvQ0FBb0MsS0FBSyxHQUFHO0NBQzFELENBQUMsQ0FBQztBQUVILG9FQUFvRTtBQUNwRSxNQUFNLFNBQVMsR0FBRyxJQUFJLG1DQUFlLENBQUMsR0FBRyxFQUFF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QjtDQUM3QyxDQUFDLENBQUM7QUFFSCxzQ0FBc0M7QUFDdEMsT0FBTyxDQUFDLEdBQUcsQ0FBQyx5Q0FBeUMsS0FBSyxlQUFlLENBQUMsQ0FBQztBQUMzRSxPQUFPLENBQUMsR0FBRyxDQUFDLHFCQUFxQixPQUFPLENBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQztBQUN0RCxPQUFPLENBQUMsR0FBRyxDQUFDLGlCQUFpQixTQUFTLENBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQztBQUNwRCxPQUFPLENBQUMsR0FBRyxDQUFDLGdCQUFnQixRQUFRLENBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQztBQUNsRCxPQUFPLENBQUMsR0FBRyxDQUFDLGdCQUFnQixRQUFRLENBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQztBQUNsRCxPQUFPLENBQUMsR0FBRyxDQUFDLG9CQUFvQixZQUFZLENBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQztBQUMxRCxPQUFPLENBQUMsR0FBRyxDQUFDLGFBQWEsTUFBTSxFQUFFLENBQUMsQ0FBQztBQUNuQyxPQUFPLENBQUMsR0FBRyxDQUFDLGNBQWMsT0FBTyxFQUFFLENBQUMsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIiMhL3Vzci9iaW4vZW52IG5vZGVcbmltcG9ydCAnc291cmNlLW1hcC1zdXBwb3J0L3JlZ2lzdGVyJztcbmltcG9ydCAqIGFzIGNkayBmcm9tICdhd3MtY2RrLWxpYic7XG5pbXBvcnQgeyBMYW1iZGFEYlN0YWNrIH0gZnJvbSAnLi4vbGliL2xhbWJkYS1kYi1zdGFjayc7XG5pbXBvcnQgeyBMYW1iZGFBcGlTdGFjayB9IGZyb20gJy4uL2xpYi9sYW1iZGEtYXBpLXN0YWNrJztcbmltcG9ydCB7IExhbWJkYUF1dGhTdGFjayB9IGZyb20gJy4uL2xpYi9sYW1iZGEtYXV0aC1zdGFjayc7XG5pbXBvcnQgeyBMYW1iZGFTZXNTdGFjayB9IGZyb20gJy4uL2xpYi9sYW1iZGEtc2VzLXN0YWNrJztcbmltcG9ydCB7IExhbWJkYVJvdXRlNTNTdGFjayB9IGZyb20gJy4uL2xpYi9sYW1iZGEtcm91dGU1My1zdGFjayc7XG5cbmNvbnN0IGFwcCA9IG5ldyBjZGsuQXBwKCk7XG5cbi8vIEdldCBzdGFnZSBmcm9tIGNvbnRleHQgKGRldi9wcm9kKVxuY29uc3Qgc3RhZ2UgPSBhcHAubm9kZS50cnlHZXRDb250ZXh0KCdzdGFnZScpIHx8ICdkZXYnO1xuY29uc3QgcmVnaW9uID0gJ3VzLWVhc3QtMSc7XG5jb25zdCBhY2NvdW50ID0gJzg5MTcwOTE1OTM0NCc7XG5cbi8vIEVudmlyb25tZW50IGNvbmZpZ3VyYXRpb25cbmNvbnN0IGVudiA9IHtcbiAgYWNjb3VudCxcbiAgcmVnaW9uLFxufTtcblxuLy8gU3RhY2sgbmFtZSBwcmVmaXhcbmNvbnN0IHN0YWNrUHJlZml4ID0gYEdhYmlZb2dhTGFtYmRhLSR7c3RhZ2V9YDtcblxuLy8gVGFncyBmb3IgYWxsIHN0YWNrc1xuY29uc3QgY29tbW9uVGFncyA9IHtcbiAgUHJvamVjdDogJ0dhYmlZb2dhJyxcbiAgRW52aXJvbm1lbnQ6IHN0YWdlLFxuICBTZXJ2aWNlOiAnTGFtYmRhJyxcbiAgTWFuYWdlZEJ5OiAnQ0RLJyxcbn07XG5cbi8vIERhdGFiYXNlIFN0YWNrIC0gRHluYW1vREIgdGFibGVzIGFuZCByZWxhdGVkIHJlc291cmNlc1xuY29uc3QgZGJTdGFjayA9IG5ldyBMYW1iZGFEYlN0YWNrKGFwcCwgYCR7c3RhY2tQcmVmaXh9LURhdGFiYXNlYCwge1xuICBlbnYsXG4gIHN0YWdlLFxuICB0YWdzOiBjb21tb25UYWdzLFxuICBkZXNjcmlwdGlvbjogYEdhYmkgWW9nYSBMYW1iZGEgRGF0YWJhc2UgU3RhY2sgKCR7c3RhZ2V9KWAsXG59KTtcblxuLy8gQXV0aGVudGljYXRpb24gU3RhY2sgLSBKV1Qgc2VjcmV0cywgdXNlciBhdXRoZW50aWNhdGlvbiByZXNvdXJjZXNcbmNvbnN0IGF1dGhTdGFjayA9IG5ldyBMYW1iZGFBdXRoU3RhY2soYXBwLCBgJHtzdGFja1ByZWZpeH0tQXV0aGAsIHtcbiAgZW52LFxuICBzdGFnZSxcbiAgdGFnczogY29tbW9uVGFncyxcbiAgZGVzY3JpcHRpb246IGBHYWJpIFlvZ2EgTGFtYmRhIEF1dGhlbnRpY2F0aW9uIFN0YWNrICgke3N0YWdlfSlgLFxuICAvLyBQYXNzIGRhdGFiYXNlIHJlZmVyZW5jZXNcbiAgdXNlcnNUYWJsZTogZGJTdGFjay51c2Vyc1RhYmxlLFxuICBqd3RCbGFja2xpc3RUYWJsZTogZGJTdGFjay5qd3RCbGFja2xpc3RUYWJsZSxcbn0pO1xuXG4vLyBBUEkgU3RhY2sgLSBMYW1iZGEgZnVuY3Rpb25zIGFuZCBBUEkgR2F0ZXdheVxuY29uc3QgYXBpU3RhY2sgPSBuZXcgTGFtYmRhQXBpU3RhY2soYXBwLCBgJHtzdGFja1ByZWZpeH0tQXBpYCwge1xuICBlbnYsXG4gIHN0YWdlLFxuICB0YWdzOiBjb21tb25UYWdzLFxuICBkZXNjcmlwdGlvbjogYEdhYmkgWW9nYSBMYW1iZGEgQVBJIFN0YWNrICgke3N0YWdlfSlgLFxuICAvLyBQYXNzIGRhdGFiYXNlIHRhYmxlIHJlZmVyZW5jZXNcbiAgdXNlcnNUYWJsZTogZGJTdGFjay51c2Vyc1RhYmxlLFxuICBibG9nUG9zdHNUYWJsZTogZGJTdGFjay5ibG9nUG9zdHNUYWJsZSxcbiAgY2xhc3Nlc1RhYmxlOiBkYlN0YWNrLmNsYXNzZXNUYWJsZSxcbiAgYm9va2luZ3NUYWJsZTogZGJTdGFjay5ib29raW5nc1RhYmxlLFxuICByZXRyZWF0c1RhYmxlOiBkYlN0YWNrLnJldHJlYXRzVGFibGUsXG4gIHdvcmtzaG9wc1RhYmxlOiBkYlN0YWNrLndvcmtzaG9wc1RhYmxlLFxuICBnYWxsZXJ5VGFibGU6IGRiU3RhY2suZ2FsbGVyeVRhYmxlLFxuICBzZXR0aW5nc1RhYmxlOiBkYlN0YWNrLnNldHRpbmdzVGFibGUsXG4gIGNvbW11bmljYXRpb25zVGFibGU6IGRiU3RhY2suY29tbXVuaWNhdGlvbnNUYWJsZSxcbiAgand0QmxhY2tsaXN0VGFibGU6IGRiU3RhY2suand0QmxhY2tsaXN0VGFibGUsXG4gIC8vIFBhc3MgYXV0aCByZXNvdXJjZXNcbiAgand0U2VjcmV0OiBhdXRoU3RhY2suand0U2VjcmV0LFxuICBzdHJpcGVTZWNyZXQ6IGF1dGhTdGFjay5zdHJpcGVTZWNyZXQsXG59KTtcblxuLy8gUm91dGU1MyBTdGFjayAtIEN1c3RvbSBkb21haW4gZm9yIEFQSSBHYXRld2F5XG5jb25zdCByb3V0ZTUzU3RhY2sgPSBuZXcgTGFtYmRhUm91dGU1M1N0YWNrKGFwcCwgYCR7c3RhY2tQcmVmaXh9LVJvdXRlNTNgLCB7XG4gIGVudixcbiAgc3RhZ2UsXG4gIHRhZ3M6IGNvbW1vblRhZ3MsXG4gIGRlc2NyaXB0aW9uOiBgR2FiaSBZb2dhIExhbWJkYSBSb3V0ZTUzIFN0YWNrICgke3N0YWdlfSlgLFxuICBhcGlHYXRld2F5OiBhcGlTdGFjay5hcGlHYXRld2F5LFxuICBkb21haW5OYW1lOiAnZ2FiaS55b2dhJyxcbn0pO1xuXG4vLyBTRVMgU3RhY2sgLSBFbWFpbCBzZW5kaW5nIGluZnJhc3RydWN0dXJlXG5jb25zdCBzZXNTdGFjayA9IG5ldyBMYW1iZGFTZXNTdGFjayhhcHAsIGAke3N0YWNrUHJlZml4fS1TRVNgLCB7XG4gIGVudixcbiAgc3RhZ2UsXG4gIHRhZ3M6IGNvbW1vblRhZ3MsXG4gIGRlc2NyaXB0aW9uOiBgR2FiaSBZb2dhIExhbWJkYSBTRVMgRW1haWwgU3RhY2sgKCR7c3RhZ2V9KWAsXG4gIGRvbWFpbk5hbWU6ICdnYWJpLnlvZ2EnLFxuICAvLyBQYXNzIHRoZSBob3N0ZWQgem9uZSBJRCBmcm9tIFJvdXRlNTMgc3RhY2tcbiAgaG9zdGVkWm9uZUlkOiByb3V0ZTUzU3RhY2suaG9zdGVkWm9uZS5ob3N0ZWRab25lSWQsXG59KTtcblxuLy8gU3RhY2sgZGVwZW5kZW5jaWVzXG5hcGlTdGFjay5hZGREZXBlbmRlbmN5KGRiU3RhY2spO1xuYXBpU3RhY2suYWRkRGVwZW5kZW5jeShhdXRoU3RhY2spO1xucm91dGU1M1N0YWNrLmFkZERlcGVuZGVuY3koYXBpU3RhY2spO1xuc2VzU3RhY2suYWRkRGVwZW5kZW5jeShyb3V0ZTUzU3RhY2spO1xuXG4vLyBPdXRwdXQga2V5IGluZm9ybWF0aW9uXG5uZXcgY2RrLkNmbk91dHB1dChhcGlTdGFjaywgJ0FwaUdhdGV3YXlVcmwnLCB7XG4gIHZhbHVlOiBhcGlTdGFjay5hcGlHYXRld2F5LnVybCxcbiAgZGVzY3JpcHRpb246ICdBUEkgR2F0ZXdheSBVUkwnLFxuICBleHBvcnROYW1lOiBgJHtzdGFja1ByZWZpeH0tQXBpR2F0ZXdheVVybGAsXG59KTtcblxubmV3IGNkay5DZm5PdXRwdXQoYXBpU3RhY2ssICdBcGlHYXRld2F5SWQnLCB7XG4gIHZhbHVlOiBhcGlTdGFjay5hcGlHYXRld2F5LnJlc3RBcGlJZCxcbiAgZGVzY3JpcHRpb246ICdBUEkgR2F0ZXdheSBJRCcsXG4gIGV4cG9ydE5hbWU6IGAke3N0YWNrUHJlZml4fS1BcGlHYXRld2F5SWRgLFxufSk7XG5cbi8vIEN1c3RvbSBkb21haW4gb3V0cHV0IGZvciBwcm9kdWN0aW9uXG5pZiAoc3RhZ2UgPT09ICdwcm9kJykge1xuICBuZXcgY2RrLkNmbk91dHB1dChhcGlTdGFjaywgJ0N1c3RvbURvbWFpbk5hbWUnLCB7XG4gICAgdmFsdWU6ICdhcGkuZ2FiaS55b2dhJyxcbiAgICBkZXNjcmlwdGlvbjogJ0N1c3RvbSBkb21haW4gbmFtZSBmb3IgQVBJJyxcbiAgICBleHBvcnROYW1lOiBgJHtzdGFja1ByZWZpeH0tQ3VzdG9tRG9tYWluTmFtZWAsXG4gIH0pO1xufVxuXG4vLyBFbnZpcm9ubWVudC1zcGVjaWZpYyBvdXRwdXRzXG5uZXcgY2RrLkNmbk91dHB1dChkYlN0YWNrLCAnRGF0YWJhc2VTdGFja05hbWUnLCB7XG4gIHZhbHVlOiBkYlN0YWNrLnN0YWNrTmFtZSxcbiAgZGVzY3JpcHRpb246ICdEYXRhYmFzZSBzdGFjayBuYW1lJyxcbiAgZXhwb3J0TmFtZTogYCR7c3RhY2tQcmVmaXh9LURhdGFiYXNlU3RhY2tOYW1lYCxcbn0pO1xuXG5uZXcgY2RrLkNmbk91dHB1dChhdXRoU3RhY2ssICdBdXRoU3RhY2tOYW1lJywge1xuICB2YWx1ZTogYXV0aFN0YWNrLnN0YWNrTmFtZSxcbiAgZGVzY3JpcHRpb246ICdBdXRoZW50aWNhdGlvbiBzdGFjayBuYW1lJyxcbiAgZXhwb3J0TmFtZTogYCR7c3RhY2tQcmVmaXh9LUF1dGhTdGFja05hbWVgLFxufSk7XG5cbm5ldyBjZGsuQ2ZuT3V0cHV0KHNlc1N0YWNrLCAnRW1haWxEb21haW4nLCB7XG4gIHZhbHVlOiAnZ2FiaS55b2dhJyxcbiAgZGVzY3JpcHRpb246ICdFbWFpbCBkb21haW4gZm9yIHNlbmRpbmcgZW1haWxzJyxcbiAgZXhwb3J0TmFtZTogYCR7c3RhY2tQcmVmaXh9LUVtYWlsRG9tYWluYCxcbn0pO1xuXG5uZXcgY2RrLkNmbk91dHB1dChzZXNTdGFjaywgJ0RlZmF1bHRTZW5kZXJFbWFpbCcsIHtcbiAgdmFsdWU6ICdub3JlcGx5QGdhYmkueW9nYScsXG4gIGRlc2NyaXB0aW9uOiAnRGVmYXVsdCBzZW5kZXIgZW1haWwgYWRkcmVzcycsXG4gIGV4cG9ydE5hbWU6IGAke3N0YWNrUHJlZml4fS1EZWZhdWx0U2VuZGVyRW1haWxgLFxufSk7XG5cbi8vIFJvdXRlNTMgb3V0cHV0cyBhcmUgYWxyZWFkeSBkZWZpbmVkIGluIHRoZSBzdGFja1xuXG5uZXcgY2RrLkNmbk91dHB1dChyb3V0ZTUzU3RhY2ssICdBcGlDdXN0b21Eb21haW4nLCB7XG4gIHZhbHVlOiByb3V0ZTUzU3RhY2suY3VzdG9tRG9tYWluTmFtZSxcbiAgZGVzY3JpcHRpb246ICdDdXN0b20gZG9tYWluIGZvciBBUEknLFxuICBleHBvcnROYW1lOiBgJHtzdGFja1ByZWZpeH0tQXBpQ3VzdG9tRG9tYWluYCxcbn0pO1xuXG4vLyBBZGQgc3RhY2sgaW5mb3JtYXRpb24gZm9yIGRlYnVnZ2luZ1xuY29uc29sZS5sb2coYERlcGxveWluZyBHYWJpIFlvZ2EgTGFtYmRhIHN0YWNrcyBmb3IgJHtzdGFnZX0gZW52aXJvbm1lbnQ6YCk7XG5jb25zb2xlLmxvZyhgLSBEYXRhYmFzZSBTdGFjazogJHtkYlN0YWNrLnN0YWNrTmFtZX1gKTtcbmNvbnNvbGUubG9nKGAtIEF1dGggU3RhY2s6ICR7YXV0aFN0YWNrLnN0YWNrTmFtZX1gKTtcbmNvbnNvbGUubG9nKGAtIEFQSSBTdGFjazogJHthcGlTdGFjay5zdGFja05hbWV9YCk7XG5jb25zb2xlLmxvZyhgLSBTRVMgU3RhY2s6ICR7c2VzU3RhY2suc3RhY2tOYW1lfWApO1xuY29uc29sZS5sb2coYC0gUm91dGU1MyBTdGFjazogJHtyb3V0ZTUzU3RhY2suc3RhY2tOYW1lfWApO1xuY29uc29sZS5sb2coYC0gUmVnaW9uOiAke3JlZ2lvbn1gKTtcbmNvbnNvbGUubG9nKGAtIEFjY291bnQ6ICR7YWNjb3VudH1gKTtcbiJdfQ==