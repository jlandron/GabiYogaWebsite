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
const lambda_monitoring_stack_1 = require("../lib/lambda-monitoring-stack");
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
// Monitoring Stack - CloudWatch dashboards, alarms, and logs
const monitoringStack = new lambda_monitoring_stack_1.LambdaMonitoringStack(app, `${stackPrefix}-Monitoring`, {
    env,
    stage,
    tags: commonTags,
    description: `Gabi Yoga Lambda Monitoring Stack (${stage})`,
    // Pass API Gateway and Lambda references for monitoring
    apiGateway: apiStack.apiGateway,
    lambdaFunctions: apiStack.lambdaFunctions,
    dynamodbTables: dbStack.dynamodbTables,
});
// Stack dependencies
apiStack.addDependency(dbStack);
apiStack.addDependency(authStack);
monitoringStack.addDependency(apiStack);
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
// Add stack information for debugging
console.log(`Deploying Gabi Yoga Lambda stacks for ${stage} environment:`);
console.log(`- Database Stack: ${dbStack.stackName}`);
console.log(`- Auth Stack: ${authStack.stackName}`);
console.log(`- API Stack: ${apiStack.stackName}`);
console.log(`- Monitoring Stack: ${monitoringStack.stackName}`);
console.log(`- Region: ${region}`);
console.log(`- Account: ${account}`);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGFtYmRhLXN0YWNrLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsibGFtYmRhLXN0YWNrLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQ0EsdUNBQXFDO0FBQ3JDLGlEQUFtQztBQUNuQyw0REFBdUQ7QUFDdkQsOERBQXlEO0FBQ3pELGdFQUEyRDtBQUMzRCw0RUFBdUU7QUFFdkUsTUFBTSxHQUFHLEdBQUcsSUFBSSxHQUFHLENBQUMsR0FBRyxFQUFFLENBQUM7QUFFMUIsb0NBQW9DO0FBQ3BDLE1BQU0sS0FBSyxHQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLE9BQU8sQ0FBQyxJQUFJLEtBQUssQ0FBQztBQUN2RCxNQUFNLE1BQU0sR0FBRyxXQUFXLENBQUM7QUFDM0IsTUFBTSxPQUFPLEdBQUcsY0FBYyxDQUFDO0FBRS9CLDRCQUE0QjtBQUM1QixNQUFNLEdBQUcsR0FBRztJQUNWLE9BQU87SUFDUCxNQUFNO0NBQ1AsQ0FBQztBQUVGLG9CQUFvQjtBQUNwQixNQUFNLFdBQVcsR0FBRyxrQkFBa0IsS0FBSyxFQUFFLENBQUM7QUFFOUMsc0JBQXNCO0FBQ3RCLE1BQU0sVUFBVSxHQUFHO0lBQ2pCLE9BQU8sRUFBRSxVQUFVO0lBQ25CLFdBQVcsRUFBRSxLQUFLO0lBQ2xCLE9BQU8sRUFBRSxRQUFRO0lBQ2pCLFNBQVMsRUFBRSxLQUFLO0NBQ2pCLENBQUM7QUFFRix5REFBeUQ7QUFDekQsTUFBTSxPQUFPLEdBQUcsSUFBSSwrQkFBYSxDQUFDLEdBQUcsRUFBRSxHQUFHLFdBQVcsV0FBVyxFQUFFO0lBQ2hFLEdBQUc7SUFDSCxLQUFLO0lBQ0wsSUFBSSxFQUFFLFVBQVU7SUFDaEIsV0FBVyxFQUFFLG9DQUFvQyxLQUFLLEdBQUc7Q0FDMUQsQ0FBQyxDQUFDO0FBRUgsb0VBQW9FO0FBQ3BFLE1BQU0sU0FBUyxHQUFHLElBQUksbUNBQWUsQ0FBQyxHQUFHLEVBQUUsR0FBRyxXQUFXLE9B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VyxFQUFFLHFCQUFxQjtJQUNsQyxVQUFVLEVBQUUsR0FBRyxXQUFXLG9CQUFvQjtDQUMvQyxDQUFDLENBQUM7QUFFSCxJQUFJLEdBQUcsQ0FBQyxTQUFTLENBQUMsU0FBUyxFQUFFLGVBQWUsRUFBRTtJQUM1QyxLQUFLLEVBQUUsU0FBUyxDQUFDLFNBQVM7SUFDMUIsV0FBVyxFQUFFLDJCQUEyQjtJQUN4QyxVQUFVLEVBQUUsR0FBRyxXQUFXLGdCQUFnQjtDQUMzQyxDQUFDLENBQUM7QUFFSCxJQUFJLEdBQUcsQ0FBQyxTQUFTLENBQUMsZUFBZSxFQUFFLHdCQUF3QixFQUFFO0lBQzNELEtBQUssRUFBRSxlQUFlLENBQUMsWUFBWTtJQUNuQyxXQUFXLEVBQUUsMEJBQTBCO0lBQ3ZDLFVBQVUsRUFBRSxHQUFHLFdBQVcseUJBQXlCO0NBQ3BELENBQUMsQ0FBQztBQUVILHNDQUFzQztBQUN0QyxPQUFPLENBQUMsR0FBRyxDQUFDLHlDQUF5QyxLQUFLLGVBQWUsQ0FBQyxDQUFDO0FBQzNFLE9BQU8sQ0FBQyxHQUFHLENBQUMscUJBQXFCLE9BQU8sQ0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDO0FBQ3RELE9BQU8sQ0FBQyxHQUFHLENBQUMsaUJBQWlCLFNBQVMsQ0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDO0FBQ3BELE9BQU8sQ0FBQyxHQUFHLENBQUMsZ0JBQWdCLFFBQVEsQ0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDO0FBQ2xELE9BQU8sQ0FBQyxHQUFHLENBQUMsdUJBQXVCLGVBQWUsQ0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDO0FBQ2hFLE9BQU8sQ0FBQyxHQUFHLENBQUMsYUFBYSxNQUFNLEVBQUUsQ0FBQyxDQUFDO0FBQ25DLE9BQU8sQ0FBQyxHQUFHLENBQUMsY0FBYyxPQUFPLEVBQUUsQ0FBQyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiIyEvdXNyL2Jpbi9lbnYgbm9kZVxuaW1wb3J0ICdzb3VyY2UtbWFwLXN1cHBvcnQvcmVnaXN0ZXInO1xuaW1wb3J0ICogYXMgY2RrIGZyb20gJ2F3cy1jZGstbGliJztcbmltcG9ydCB7IExhbWJkYURiU3RhY2sgfSBmcm9tICcuLi9saWIvbGFtYmRhLWRiLXN0YWNrJztcbmltcG9ydCB7IExhbWJkYUFwaVN0YWNrIH0gZnJvbSAnLi4vbGliL2xhbWJkYS1hcGktc3RhY2snO1xuaW1wb3J0IHsgTGFtYmRhQXV0aFN0YWNrIH0gZnJvbSAnLi4vbGliL2xhbWJkYS1hdXRoLXN0YWNrJztcbmltcG9ydCB7IExhbWJkYU1vbml0b3JpbmdTdGFjayB9IGZyb20gJy4uL2xpYi9sYW1iZGEtbW9uaXRvcmluZy1zdGFjayc7XG5cbmNvbnN0IGFwcCA9IG5ldyBjZGsuQXBwKCk7XG5cbi8vIEdldCBzdGFnZSBmcm9tIGNvbnRleHQgKGRldi9wcm9kKVxuY29uc3Qgc3RhZ2UgPSBhcHAubm9kZS50cnlHZXRDb250ZXh0KCdzdGFnZScpIHx8ICdkZXYnO1xuY29uc3QgcmVnaW9uID0gJ3VzLWVhc3QtMSc7XG5jb25zdCBhY2NvdW50ID0gJzg5MTcwOTE1OTM0NCc7XG5cbi8vIEVudmlyb25tZW50IGNvbmZpZ3VyYXRpb25cbmNvbnN0IGVudiA9IHtcbiAgYWNjb3VudCxcbiAgcmVnaW9uLFxufTtcblxuLy8gU3RhY2sgbmFtZSBwcmVmaXhcbmNvbnN0IHN0YWNrUHJlZml4ID0gYEdhYmlZb2dhTGFtYmRhLSR7c3RhZ2V9YDtcblxuLy8gVGFncyBmb3IgYWxsIHN0YWNrc1xuY29uc3QgY29tbW9uVGFncyA9IHtcbiAgUHJvamVjdDogJ0dhYmlZb2dhJyxcbiAgRW52aXJvbm1lbnQ6IHN0YWdlLFxuICBTZXJ2aWNlOiAnTGFtYmRhJyxcbiAgTWFuYWdlZEJ5OiAnQ0RLJyxcbn07XG5cbi8vIERhdGFiYXNlIFN0YWNrIC0gRHluYW1vREIgdGFibGVzIGFuZCByZWxhdGVkIHJlc291cmNlc1xuY29uc3QgZGJTdGFjayA9IG5ldyBMYW1iZGFEYlN0YWNrKGFwcCwgYCR7c3RhY2tQcmVmaXh9LURhdGFiYXNlYCwge1xuICBlbnYsXG4gIHN0YWdlLFxuICB0YWdzOiBjb21tb25UYWdzLFxuICBkZXNjcmlwdGlvbjogYEdhYmkgWW9nYSBMYW1iZGEgRGF0YWJhc2UgU3RhY2sgKCR7c3RhZ2V9KWAsXG59KTtcblxuLy8gQXV0aGVudGljYXRpb24gU3RhY2sgLSBKV1Qgc2VjcmV0cywgdXNlciBhdXRoZW50aWNhdGlvbiByZXNvdXJjZXNcbmNvbnN0IGF1dGhTdGFjayA9IG5ldyBMYW1iZGFBdXRoU3RhY2soYXBwLCBgJHtzdGFja1ByZWZpeH0tQXV0aGAsIHtcbiAgZW52LFxuICBzdGFnZSxcbiAgdGFnczogY29tbW9uVGFncyxcbiAgZGVzY3JpcHRpb246IGBHYWJpIFlvZ2EgTGFtYmRhIEF1dGhlbnRpY2F0aW9uIFN0YWNrICgke3N0YWdlfSlgLFxuICAvLyBQYXNzIGRhdGFiYXNlIHJlZmVyZW5jZXNcbiAgdXNlcnNUYWJsZTogZGJTdGFjay51c2Vyc1RhYmxlLFxuICBqd3RCbGFja2xpc3RUYWJsZTogZGJTdGFjay5qd3RCbGFja2xpc3RUYWJsZSxcbn0pO1xuXG4vLyBBUEkgU3RhY2sgLSBMYW1iZGEgZnVuY3Rpb25zIGFuZCBBUEkgR2F0ZXdheVxuY29uc3QgYXBpU3RhY2sgPSBuZXcgTGFtYmRhQXBpU3RhY2soYXBwLCBgJHtzdGFja1ByZWZpeH0tQXBpYCwge1xuICBlbnYsXG4gIHN0YWdlLFxuICB0YWdzOiBjb21tb25UYWdzLFxuICBkZXNjcmlwdGlvbjogYEdhYmkgWW9nYSBMYW1iZGEgQVBJIFN0YWNrICgke3N0YWdlfSlgLFxuICAvLyBQYXNzIGRhdGFiYXNlIHRhYmxlIHJlZmVyZW5jZXNcbiAgdXNlcnNUYWJsZTogZGJTdGFjay51c2Vyc1RhYmxlLFxuICBibG9nUG9zdHNUYWJsZTogZGJTdGFjay5ibG9nUG9zdHNUYWJsZSxcbiAgY2xhc3Nlc1RhYmxlOiBkYlN0YWNrLmNsYXNzZXNUYWJsZSxcbiAgYm9va2luZ3NUYWJsZTogZGJTdGFjay5ib29raW5nc1RhYmxlLFxuICByZXRyZWF0c1RhYmxlOiBkYlN0YWNrLnJldHJlYXRzVGFibGUsXG4gIHdvcmtzaG9wc1RhYmxlOiBkYlN0YWNrLndvcmtzaG9wc1RhYmxlLFxuICBnYWxsZXJ5VGFibGU6IGRiU3RhY2suZ2FsbGVyeVRhYmxlLFxuICBzZXR0aW5nc1RhYmxlOiBkYlN0YWNrLnNldHRpbmdzVGFibGUsXG4gIGNvbW11bmljYXRpb25zVGFibGU6IGRiU3RhY2suY29tbXVuaWNhdGlvbnNUYWJsZSxcbiAgand0QmxhY2tsaXN0VGFibGU6IGRiU3RhY2suand0QmxhY2tsaXN0VGFibGUsXG4gIC8vIFBhc3MgYXV0aCByZXNvdXJjZXNcbiAgand0U2VjcmV0OiBhdXRoU3RhY2suand0U2VjcmV0LFxuICBzdHJpcGVTZWNyZXQ6IGF1dGhTdGFjay5zdHJpcGVTZWNyZXQsXG59KTtcblxuLy8gTW9uaXRvcmluZyBTdGFjayAtIENsb3VkV2F0Y2ggZGFzaGJvYXJkcywgYWxhcm1zLCBhbmQgbG9nc1xuY29uc3QgbW9uaXRvcmluZ1N0YWNrID0gbmV3IExhbWJkYU1vbml0b3JpbmdTdGFjayhhcHAsIGAke3N0YWNrUHJlZml4fS1Nb25pdG9yaW5nYCwge1xuICBlbnYsXG4gIHN0YWdlLFxuICB0YWdzOiBjb21tb25UYWdzLFxuICBkZXNjcmlwdGlvbjogYEdhYmkgWW9nYSBMYW1iZGEgTW9uaXRvcmluZyBTdGFjayAoJHtzdGFnZX0pYCxcbiAgLy8gUGFzcyBBUEkgR2F0ZXdheSBhbmQgTGFtYmRhIHJlZmVyZW5jZXMgZm9yIG1vbml0b3JpbmdcbiAgYXBpR2F0ZXdheTogYXBpU3RhY2suYXBpR2F0ZXdheSxcbiAgbGFtYmRhRnVuY3Rpb25zOiBhcGlTdGFjay5sYW1iZGFGdW5jdGlvbnMsXG4gIGR5bmFtb2RiVGFibGVzOiBkYlN0YWNrLmR5bmFtb2RiVGFibGVzLFxufSk7XG5cbi8vIFN0YWNrIGRlcGVuZGVuY2llc1xuYXBpU3RhY2suYWRkRGVwZW5kZW5jeShkYlN0YWNrKTtcbmFwaVN0YWNrLmFkZERlcGVuZGVuY3koYXV0aFN0YWNrKTtcbm1vbml0b3JpbmdTdGFjay5hZGREZXBlbmRlbmN5KGFwaVN0YWNrKTtcblxuLy8gT3V0cHV0IGtleSBpbmZvcm1hdGlvblxubmV3IGNkay5DZm5PdXRwdXQoYXBpU3RhY2ssICdBcGlHYXRld2F5VXJsJywge1xuICB2YWx1ZTogYXBpU3RhY2suYXBpR2F0ZXdheS51cmwsXG4gIGRlc2NyaXB0aW9uOiAnQVBJIEdhdGV3YXkgVVJMJyxcbiAgZXhwb3J0TmFtZTogYCR7c3RhY2tQcmVmaXh9LUFwaUdhdGV3YXlVcmxgLFxufSk7XG5cbm5ldyBjZGsuQ2ZuT3V0cHV0KGFwaVN0YWNrLCAnQXBpR2F0ZXdheUlkJywge1xuICB2YWx1ZTogYXBpU3RhY2suYXBpR2F0ZXdheS5yZXN0QXBpSWQsXG4gIGRlc2NyaXB0aW9uOiAnQVBJIEdhdGV3YXkgSUQnLFxuICBleHBvcnROYW1lOiBgJHtzdGFja1ByZWZpeH0tQXBpR2F0ZXdheUlkYCxcbn0pO1xuXG4vLyBDdXN0b20gZG9tYWluIG91dHB1dCBmb3IgcHJvZHVjdGlvblxuaWYgKHN0YWdlID09PSAncHJvZCcpIHtcbiAgbmV3IGNkay5DZm5PdXRwdXQoYXBpU3RhY2ssICdDdXN0b21Eb21haW5OYW1lJywge1xuICAgIHZhbHVlOiAnYXBpLmdhYmkueW9nYScsXG4gICAgZGVzY3JpcHRpb246ICdDdXN0b20gZG9tYWluIG5hbWUgZm9yIEFQSScsXG4gICAgZXhwb3J0TmFtZTogYCR7c3RhY2tQcmVmaXh9LUN1c3RvbURvbWFpbk5hbWVgLFxuICB9KTtcbn1cblxuLy8gRW52aXJvbm1lbnQtc3BlY2lmaWMgb3V0cHV0c1xubmV3IGNkay5DZm5PdXRwdXQoZGJTdGFjaywgJ0RhdGFiYXNlU3RhY2tOYW1lJywge1xuICB2YWx1ZTogZGJTdGFjay5zdGFja05hbWUsXG4gIGRlc2NyaXB0aW9uOiAnRGF0YWJhc2Ugc3RhY2sgbmFtZScsXG4gIGV4cG9ydE5hbWU6IGAke3N0YWNrUHJlZml4fS1EYXRhYmFzZVN0YWNrTmFtZWAsXG59KTtcblxubmV3IGNkay5DZm5PdXRwdXQoYXV0aFN0YWNrLCAnQXV0aFN0YWNrTmFtZScsIHtcbiAgdmFsdWU6IGF1dGhTdGFjay5zdGFja05hbWUsXG4gIGRlc2NyaXB0aW9uOiAnQXV0aGVudGljYXRpb24gc3RhY2sgbmFtZScsXG4gIGV4cG9ydE5hbWU6IGAke3N0YWNrUHJlZml4fS1BdXRoU3RhY2tOYW1lYCxcbn0pO1xuXG5uZXcgY2RrLkNmbk91dHB1dChtb25pdG9yaW5nU3RhY2ssICdNb25pdG9yaW5nRGFzaGJvYXJkVXJsJywge1xuICB2YWx1ZTogbW9uaXRvcmluZ1N0YWNrLmRhc2hib2FyZFVybCxcbiAgZGVzY3JpcHRpb246ICdDbG91ZFdhdGNoIERhc2hib2FyZCBVUkwnLFxuICBleHBvcnROYW1lOiBgJHtzdGFja1ByZWZpeH0tTW9uaXRvcmluZ0Rhc2hib2FyZFVybGAsXG59KTtcblxuLy8gQWRkIHN0YWNrIGluZm9ybWF0aW9uIGZvciBkZWJ1Z2dpbmdcbmNvbnNvbGUubG9nKGBEZXBsb3lpbmcgR2FiaSBZb2dhIExhbWJkYSBzdGFja3MgZm9yICR7c3RhZ2V9IGVudmlyb25tZW50OmApO1xuY29uc29sZS5sb2coYC0gRGF0YWJhc2UgU3RhY2s6ICR7ZGJTdGFjay5zdGFja05hbWV9YCk7XG5jb25zb2xlLmxvZyhgLSBBdXRoIFN0YWNrOiAke2F1dGhTdGFjay5zdGFja05hbWV9YCk7XG5jb25zb2xlLmxvZyhgLSBBUEkgU3RhY2s6ICR7YXBpU3RhY2suc3RhY2tOYW1lfWApO1xuY29uc29sZS5sb2coYC0gTW9uaXRvcmluZyBTdGFjazogJHttb25pdG9yaW5nU3RhY2suc3RhY2tOYW1lfWApO1xuY29uc29sZS5sb2coYC0gUmVnaW9uOiAke3JlZ2lvbn1gKTtcbmNvbnNvbGUubG9nKGAtIEFjY291bnQ6ICR7YWNjb3VudH1gKTtcbiJdfQ==