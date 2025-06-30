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
exports.LambdaAuthStack = void 0;
const cdk = __importStar(require("aws-cdk-lib"));
const secretsmanager = __importStar(require("aws-cdk-lib/aws-secretsmanager"));
const iam = __importStar(require("aws-cdk-lib/aws-iam"));
class LambdaAuthStack extends cdk.Stack {
    constructor(scope, id, props) {
        super(scope, id, props);
        const { stage, usersTable, jwtBlacklistTable } = props;
        const resourcePrefix = `GabiYoga-${stage}`;
        // JWT Secret for token signing and verification
        this.jwtSecret = new secretsmanager.Secret(this, 'JWTSecret', {
            secretName: `${resourcePrefix}-JWT-Secret`,
            description: `JWT secret for Gabi Yoga Lambda ${stage} environment`,
            generateSecretString: {
                secretStringTemplate: JSON.stringify({}),
                generateStringKey: 'secret',
                excludeCharacters: '"@/\\\'',
                includeSpace: false,
                passwordLength: 64,
            },
            removalPolicy: stage === 'prod' ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
        });
        // Stripe Secret for payment processing
        this.stripeSecret = new secretsmanager.Secret(this, 'StripeSecret', {
            secretName: `${resourcePrefix}-Stripe-Secret`,
            description: `Stripe API keys for Gabi Yoga Lambda ${stage} environment`,
            secretObjectValue: {
                publishableKey: cdk.SecretValue.unsafePlainText(stage === 'prod'
                    ? 'pk_live_your_live_publishable_key_here'
                    : 'pk_test_51RIECgFvIUQZU80GkNvPQBmwpbKhf0LiFCh4Rv5EPxArapsnz6f3C4CWenkiPrZshZCJW3ghjfvveCpdou1bAJkC00b1TlmLo9'),
                secretKey: cdk.SecretValue.unsafePlainText(stage === 'prod'
                    ? 'sk_live_your_live_secret_key_here'
                    : 'sk_test_your_test_secret_key_here'),
                webhookSecret: cdk.SecretValue.unsafePlainText(stage === 'prod'
                    ? 'whsec_your_live_webhook_secret_here'
                    : 'whsec_your_test_webhook_secret_here'),
            },
            removalPolicy: stage === 'prod' ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
        });
        // IAM Role for Lambda functions with authentication permissions
        this.lambdaExecutionRole = new iam.Role(this, 'LambdaExecutionRole', {
            roleName: `${resourcePrefix}-Lambda-Execution-Role`,
            assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
            managedPolicies: [
                iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole'),
                iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaVPCAccessExecutionRole'),
            ],
        });
        // Grant Lambda role access to DynamoDB tables
        usersTable.grantReadWriteData(this.lambdaExecutionRole);
        jwtBlacklistTable.grantReadWriteData(this.lambdaExecutionRole);
        // Grant Lambda role access to secrets
        this.jwtSecret.grantRead(this.lambdaExecutionRole);
        this.stripeSecret.grantRead(this.lambdaExecutionRole);
        // Grant additional permissions for authentication operations
        this.lambdaExecutionRole.addToPolicy(new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: [
                'ses:SendEmail',
                'ses:SendRawEmail',
                'ses:GetSendQuota',
            ],
            resources: ['*'],
        }));
        // Grant S3 permissions for file uploads
        this.lambdaExecutionRole.addToPolicy(new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: [
                's3:GetObject',
                's3:PutObject',
                's3:DeleteObject',
                's3:GetObjectAcl',
                's3:PutObjectAcl',
                's3:GetSignedUrl',
            ],
            resources: [
                `arn:aws:s3:::gabi-yoga-${stage}-assets-*/*`,
                `arn:aws:s3:::gabi-yoga-${stage}-assets-*`,
            ],
        }));
        // Grant CloudWatch Logs permissions
        this.lambdaExecutionRole.addToPolicy(new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: [
                'logs:CreateLogGroup',
                'logs:CreateLogStream',
                'logs:PutLogEvents',
                'logs:DescribeLogStreams',
                'logs:DescribeLogGroups',
            ],
            resources: [
                `arn:aws:logs:${this.region}:${this.account}:log-group:/aws/lambda/${resourcePrefix}-*`,
                `arn:aws:logs:${this.region}:${this.account}:log-group:/aws/lambda/${resourcePrefix}-*:*`,
            ],
        }));
        // Grant X-Ray tracing permissions
        this.lambdaExecutionRole.addToPolicy(new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: [
                'xray:PutTraceSegments',
                'xray:PutTelemetryRecords',
            ],
            resources: ['*'],
        }));
        // Tags
        cdk.Tags.of(this.jwtSecret).add('Service', 'GabiYogaLambda');
        cdk.Tags.of(this.jwtSecret).add('Environment', stage);
        cdk.Tags.of(this.jwtSecret).add('Purpose', 'JWT-Authentication');
        cdk.Tags.of(this.stripeSecret).add('Service', 'GabiYogaLambda');
        cdk.Tags.of(this.stripeSecret).add('Environment', stage);
        cdk.Tags.of(this.stripeSecret).add('Purpose', 'Payment-Processing');
        cdk.Tags.of(this.lambdaExecutionRole).add('Service', 'GabiYogaLambda');
        cdk.Tags.of(this.lambdaExecutionRole).add('Environment', stage);
        cdk.Tags.of(this.lambdaExecutionRole).add('Purpose', 'Lambda-Execution');
        // Outputs
        new cdk.CfnOutput(this, 'JWTSecretArn', {
            value: this.jwtSecret.secretArn,
            description: 'JWT Secret ARN',
            exportName: `${resourcePrefix}-JWTSecretArn`,
        });
        new cdk.CfnOutput(this, 'StripeSecretArn', {
            value: this.stripeSecret.secretArn,
            description: 'Stripe Secret ARN',
            exportName: `${resourcePrefix}-StripeSecretArn`,
        });
        new cdk.CfnOutput(this, 'LambdaExecutionRoleArn', {
            value: this.lambdaExecutionRole.roleArn,
            description: 'Lambda Execution Role ARN',
            exportName: `${resourcePrefix}-LambdaExecutionRoleArn`,
        });
        new cdk.CfnOutput(this, 'JWTSecretName', {
            value: this.jwtSecret.secretName,
            description: 'JWT Secret Name',
            exportName: `${resourcePrefix}-JWTSecretName`,
        });
        new cdk.CfnOutput(this, 'StripeSecretName', {
            value: this.stripeSecret.secretName,
            description: 'Stripe Secret Name',
            exportName: `${resourcePrefix}-StripeSecretName`,
        });
    }
}
exports.LambdaAuthStack = LambdaAuthStack;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGFtYmRhLWF1dGgtc3RhY2suanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJsYW1iZGEtYXV0aC1zdGFjay50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLGlEQUFtQztBQUNuQywrRUFBaUU7QUFFakUseURBQTJDO0FBUzNDLE1BQWEsZUFBZ0IsU0FBUSxHQUFHLENBQUMsS0FBSztJQUs1QyxZQUFZLEtBQWdCLEVBQUUsRUFBVSxFQUFFLEtBQTJCO1FBQ25FLEtBQUssQ0FBQyxLQUFLLEVBQUUsRUFBRSxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBRXhCLE1BQU0sRUFBRSxLQUFLLEVBQUUsVUFBVSxFQUFFLGlCQUFpQixFQUFFLEdBQUcsS0FBSyxDQUFDO1FBQ3ZELE1BQU0sY0FBYyxHQUFHLFlBQVksS0FBSyxFQUFFLENBQUM7UUFFM0MsZ0RBQWdEO1FBQ2hELElBQUksQ0FBQyxTQUFTLEdBQUcsSUFBSSxjQUFjLENBQUMsTUFBTSxDQUFDLElBQUksRUFBRSxXQUFXLEVBQUU7WUFDNUQsVUFBVSxFQUFFLEdBQUcsY0FBYyxhQUFhO1lBQzFDLFdBQVcsRUFBRSxtQ0FBbUMsS0FBSyxjQUFjO1lBQ25FLG9CQUFvQixFQUFFO2dCQUNwQixvQkFBb0IsRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDLEVBQUUsQ0FBQztnQkFDeEMsaUJBQWlCLEVBQUUsUUFBUTtnQkFDM0IsaUJBQWlCLEVBQUUsU0FBUztnQkFDNUIsWUFBWSxFQUFFLEtBQUs7Z0JBQ25CLGNBQWMsRUFBRSxFQUFFO2FBQ25CO1lBQ0QsYUFBYSxFQUFFLEtBQUssS0FBSyxNQUFNLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxhQUFhLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsYUFBYSxDQUFDLE9BQU87U0FDdkYsQ0FBQyxDQUFDO1FBRUgsdUNBQXVDO1FBQ3ZDLElBQUksQ0FBQyxZQUFZLEdBQUcsSUFBSSxjQUFjLENB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QyxtQkFBbUIsQ0FBQyxPQUFPO1lBQ3ZDLFdBQVcsRUFBRSwyQkFBMkI7WUFDeEMsVUFBVSxFQUFFLEdBQUcsY0FBYyx5QkFBeUI7U0FDdkQsQ0FBQyxDQUFDO1FBRUgsSUFBSSxHQUFHLENBQUMsU0FBUyxDQUFDLElBQUksRUFBRSxlQUFlLEVBQUU7WUFDdkMsS0FBSyxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUMsVUFBVTtZQUNoQyxXQUFXLEVBQUUsaUJBQWlCO1lBQzlCLFVBQVUsRUFBRSxHQUFHLGNBQWMsZ0JBQWdCO1NBQzlDLENBQUMsQ0FBQztRQUVILElBQUksR0FBRyxDQUFDLFNBQVMsQ0FBQyxJQUFJLEVBQUUsa0JBQWtCLEVBQUU7WUFDMUMsS0FBSyxFQUFFLElBQUksQ0FBQyxZQUFZLENBQUMsVUFBVTtZQUNuQyxXQUFXLEVBQUUsb0JBQW9CO1lBQ2pDLFVBQVUsRUFBRSxHQUFHLGNBQWMsbUJBQW1CO1NBQ2pELENBQUMsQ0FBQztJQUNMLENBQUM7Q0FDRjtBQXJLRCwwQ0FxS0MiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyBjZGsgZnJvbSAnYXdzLWNkay1saWInO1xuaW1wb3J0ICogYXMgc2VjcmV0c21hbmFnZXIgZnJvbSAnYXdzLWNkay1saWIvYXdzLXNlY3JldHNtYW5hZ2VyJztcbmltcG9ydCAqIGFzIGR5bmFtb2RiIGZyb20gJ2F3cy1jZGstbGliL2F3cy1keW5hbW9kYic7XG5pbXBvcnQgKiBhcyBpYW0gZnJvbSAnYXdzLWNkay1saWIvYXdzLWlhbSc7XG5pbXBvcnQgeyBDb25zdHJ1Y3QgfSBmcm9tICdjb25zdHJ1Y3RzJztcblxuZXhwb3J0IGludGVyZmFjZSBMYW1iZGFBdXRoU3RhY2tQcm9wcyBleHRlbmRzIGNkay5TdGFja1Byb3BzIHtcbiAgc3RhZ2U6IHN0cmluZztcbiAgdXNlcnNUYWJsZTogZHluYW1vZGIuVGFibGU7XG4gIGp3dEJsYWNrbGlzdFRhYmxlOiBkeW5hbW9kYi5UYWJsZTtcbn1cblxuZXhwb3J0IGNsYXNzIExhbWJkYUF1dGhTdGFjayBleHRlbmRzIGNkay5TdGFjayB7XG4gIHB1YmxpYyByZWFkb25seSBqd3RTZWNyZXQ6IHNlY3JldHNtYW5hZ2VyLlNlY3JldDtcbiAgcHVibGljIHJlYWRvbmx5IHN0cmlwZVNlY3JldDogc2VjcmV0c21hbmFnZXIuU2VjcmV0O1xuICBwdWJsaWMgcmVhZG9ubHkgbGFtYmRhRXhlY3V0aW9uUm9sZTogaWFtLlJvbGU7XG5cbiAgY29uc3RydWN0b3Ioc2NvcGU6IENvbnN0cnVjdCwgaWQ6IHN0cmluZywgcHJvcHM6IExhbWJkYUF1dGhTdGFja1Byb3BzKSB7XG4gICAgc3VwZXIoc2NvcGUsIGlkLCBwcm9wcyk7XG5cbiAgICBjb25zdCB7IHN0YWdlLCB1c2Vyc1RhYmxlLCBqd3RCbGFja2xpc3RUYWJsZSB9ID0gcHJvcHM7XG4gICAgY29uc3QgcmVzb3VyY2VQcmVmaXggPSBgR2FiaVlvZ2EtJHtzdGFnZX1gO1xuXG4gICAgLy8gSldUIFNlY3JldCBmb3IgdG9rZW4gc2lnbmluZyBhbmQgdmVyaWZpY2F0aW9uXG4gICAgdGhpcy5qd3RTZWNyZXQgPSBuZXcgc2VjcmV0c21hbmFnZXIuU2VjcmV0KHRoaXMsICdKV1RTZWNyZXQnLCB7XG4gICAgICBzZWNyZXROYW1lOiBgJHtyZXNvdXJjZVByZWZpeH0tSldULVNlY3JldGAsXG4gICAgICBkZXNjcmlwdGlvbjogYEpXVCBzZWNyZXQgZm9yIEdhYmkgWW9nYSBMYW1iZGEgJHtzdGFnZX0gZW52aXJvbm1lbnRgLFxuICAgICAgZ2VuZXJhdGVTZWNyZXRTdHJpbmc6IHtcbiAgICAgICAgc2VjcmV0U3RyaW5nVGVtcGxhdGU6IEpTT04uc3RyaW5naWZ5KHt9KSxcbiAgICAgICAgZ2VuZXJhdGVTdHJpbmdLZXk6ICdzZWNyZXQnLFxuICAgICAgICBleGNsdWRlQ2hhcmFjdGVyczogJ1wiQC9cXFxcXFwnJyxcbiAgICAgICAgaW5jbHVkZVNwYWNlOiBmYWxzZSxcbiAgICAgICAgcGFzc3dvcmRMZW5ndGg6IDY0LFxuICAgICAgfSxcbiAgICAgIHJlbW92YWxQb2xpY3k6IHN0YWdlID09PSAncHJvZCcgPyBjZGsuUmVtb3ZhbFBvbGljeS5SRVRBSU4gOiBjZGsuUmVtb3ZhbFBvbGljeS5ERVNUUk9ZLFxuICAgIH0pO1xuXG4gICAgLy8gU3RyaXBlIFNlY3JldCBmb3IgcGF5bWVudCBwcm9jZXNzaW5nXG4gICAgdGhpcy5zdHJpcGVTZWNyZXQgPSBuZXcgc2VjcmV0c21hbmFnZXIuU2VjcmV0KHRoaXMsICdTdHJpcGVTZWNyZXQnLCB7XG4gICAgICBzZWNyZXROYW1lOiBgJHtyZXNvdXJjZVByZWZpeH0tU3RyaXBlLVNlY3JldGAsXG4gICAgICBkZXNjcmlwdGlvbjogYFN0cmlwZSBBUEkga2V5cyBmb3IgR2FiaSBZb2dhIExhbWJkYSAke3N0YWdlfSBlbnZpcm9ubWVudGAsXG4gICAgICBzZWNyZXRPYmplY3RWYWx1ZToge1xuICAgICAgICBwdWJsaXNoYWJsZUtleTogY2RrLlNlY3JldFZhbHVlLnVuc2FmZVBsYWluVGV4dChcbiAgICAgICAgICBzdGFnZSA9PT0gJ3Byb2QnIFxuICAgICAgICAgICAgPyAncGtfbGl2ZV95b3VyX2xpdmVfcHVibGlzaGFibGVfa2V5X2hlcmUnIFxuICAgICAgICAgICAgOiAncGtfdGVzdF81MVJJRUNnRnZJVVFaVTgwR2tOdlBRQm13cGJLaGYwTGlGQ2g0UnY1RVB4QXJhcHNuejZmM0M0Q1dlbmtpUHJac2haQ0pXM2doamZ2dmVDcGRvdTFiQUprQzAwYjFUbG1MbzknXG4gICAgICAgICksXG4gICAgICAgIHNlY3JldEtleTogY2RrLlNlY3JldFZhbHVlLnVuc2FmZVBsYWluVGV4dChcbiAgICAgICAgICBzdGFnZSA9PT0gJ3Byb2QnIFxuICAgICAgICAgICAgPyAnc2tfbGl2ZV95b3VyX2xpdmVfc2VjcmV0X2tleV9oZXJlJyBcbiAgICAgICAgICAgIDogJ3NrX3Rlc3RfeW91cl90ZXN0X3NlY3JldF9rZXlfaGVyZSdcbiAgICAgICAgKSxcbiAgICAgICAgd2ViaG9va1NlY3JldDogY2RrLlNlY3JldFZhbHVlLnVuc2FmZVBsYWluVGV4dChcbiAgICAgICAgICBzdGFnZSA9PT0gJ3Byb2QnIFxuICAgICAgICAgICAgPyAnd2hzZWNfeW91cl9saXZlX3dlYmhvb2tfc2VjcmV0X2hlcmUnIFxuICAgICAgICAgICAgOiAnd2hzZWNfeW91cl90ZXN0X3dlYmhvb2tfc2VjcmV0X2hlcmUnXG4gICAgICAgICksXG4gICAgICB9LFxuICAgICAgcmVtb3ZhbFBvbGljeTogc3RhZ2UgPT09ICdwcm9kJyA/IGNkay5SZW1vdmFsUG9saWN5LlJFVEFJTiA6IGNkay5SZW1vdmFsUG9saWN5LkRFU1RST1ksXG4gICAgfSk7XG5cbiAgICAvLyBJQU0gUm9sZSBmb3IgTGFtYmRhIGZ1bmN0aW9ucyB3aXRoIGF1dGhlbnRpY2F0aW9uIHBlcm1pc3Npb25zXG4gICAgdGhpcy5sYW1iZGFFeGVjdXRpb25Sb2xlID0gbmV3IGlhbS5Sb2xlKHRoaXMsICdMYW1iZGFFeGVjdXRpb25Sb2xlJywge1xuICAgICAgcm9sZU5hbWU6IGAke3Jlc291cmNlUHJlZml4fS1MYW1iZGEtRXhlY3V0aW9uLVJvbGVgLFxuICAgICAgYXNzdW1lZEJ5OiBuZXcgaWFtLlNlcnZpY2VQcmluY2lwYWwoJ2xhbWJkYS5hbWF6b25hd3MuY29tJyksXG4gICAgICBtYW5hZ2VkUG9saWNpZXM6IFtcbiAgICAgICAgaWFtLk1hbmFnZWRQb2xpY3kuZnJvbUF3c01hbmFnZWRQb2xpY3lOYW1lKCdzZXJ2aWNlLXJvbGUvQVdTTGFtYmRhQmFzaWNFeGVjdXRpb25Sb2xlJyksXG4gICAgICAgIGlhbS5NYW5hZ2VkUG9saWN5LmZyb21Bd3NNYW5hZ2VkUG9saWN5TmFtZSgnc2VydmljZS1yb2xlL0FXU0xhbWJkYVZQQ0FjY2Vzc0V4ZWN1dGlvblJvbGUnKSxcbiAgICAgIF0sXG4gICAgfSk7XG5cbiAgICAvLyBHcmFudCBMYW1iZGEgcm9sZSBhY2Nlc3MgdG8gRHluYW1vREIgdGFibGVzXG4gICAgdXNlcnNUYWJsZS5ncmFudFJlYWRXcml0ZURhdGEodGhpcy5sYW1iZGFFeGVjdXRpb25Sb2xlKTtcbiAgICBqd3RCbGFja2xpc3RUYWJsZS5ncmFudFJlYWRXcml0ZURhdGEodGhpcy5sYW1iZGFFeGVjdXRpb25Sb2xlKTtcblxuICAgIC8vIEdyYW50IExhbWJkYSByb2xlIGFjY2VzcyB0byBzZWNyZXRzXG4gICAgdGhpcy5qd3RTZWNyZXQuZ3JhbnRSZWFkKHRoaXMubGFtYmRhRXhlY3V0aW9uUm9sZSk7XG4gICAgdGhpcy5zdHJpcGVTZWNyZXQuZ3JhbnRSZWFkKHRoaXMubGFtYmRhRXhlY3V0aW9uUm9sZSk7XG5cbiAgICAvLyBHcmFudCBhZGRpdGlvbmFsIHBlcm1pc3Npb25zIGZvciBhdXRoZW50aWNhdGlvbiBvcGVyYXRpb25zXG4gICAgdGhpcy5sYW1iZGFFeGVjdXRpb25Sb2xlLmFkZFRvUG9saWN5KG5ldyBpYW0uUG9saWN5U3RhdGVtZW50KHtcbiAgICAgIGVmZmVjdDogaWFtLkVmZmVjdC5BTExPVyxcbiAgICAgIGFjdGlvbnM6IFtcbiAgICAgICAgJ3NlczpTZW5kRW1haWwnLFxuICAgICAgICAnc2VzOlNlbmRSYXdFbWFpbCcsXG4gICAgICAgICdzZXM6R2V0U2VuZFF1b3RhJyxcbiAgICAgIF0sXG4gICAgICByZXNvdXJjZXM6IFsnKiddLFxuICAgIH0pKTtcblxuICAgIC8vIEdyYW50IFMzIHBlcm1pc3Npb25zIGZvciBmaWxlIHVwbG9hZHNcbiAgICB0aGlzLmxhbWJkYUV4ZWN1dGlvblJvbGUuYWRkVG9Qb2xpY3kobmV3IGlhbS5Qb2xpY3lTdGF0ZW1lbnQoe1xuICAgICAgZWZmZWN0OiBpYW0uRWZmZWN0LkFMTE9XLFxuICAgICAgYWN0aW9uczogW1xuICAgICAgICAnczM6R2V0T2JqZWN0JyxcbiAgICAgICAgJ3MzOlB1dE9iamVjdCcsXG4gICAgICAgICdzMzpEZWxldGVPYmplY3QnLFxuICAgICAgICAnczM6R2V0T2JqZWN0QWNsJyxcbiAgICAgICAgJ3MzOlB1dE9iamVjdEFjbCcsXG4gICAgICAgICdzMzpHZXRTaWduZWRVcmwnLFxuICAgICAgXSxcbiAgICAgIHJlc291cmNlczogW1xuICAgICAgICBgYXJuOmF3czpzMzo6OmdhYmkteW9nYS0ke3N0YWdlfS1hc3NldHMtKi8qYCxcbiAgICAgICAgYGFybjphd3M6czM6OjpnYWJpLXlvZ2EtJHtzdGFnZX0tYXNzZXRzLSpgLFxuICAgICAgXSxcbiAgICB9KSk7XG5cbiAgICAvLyBHcmFudCBDbG91ZFdhdGNoIExvZ3MgcGVybWlzc2lvbnNcbiAgICB0aGlzLmxhbWJkYUV4ZWN1dGlvblJvbGUuYWRkVG9Qb2xpY3kobmV3IGlhbS5Qb2xpY3lTdGF0ZW1lbnQoe1xuICAgICAgZWZmZWN0OiBpYW0uRWZmZWN0LkFMTE9XLFxuICAgICAgYWN0aW9uczogW1xuICAgICAgICAnbG9nczpDcmVhdGVMb2dHcm91cCcsXG4gICAgICAgICdsb2dzOkNyZWF0ZUxvZ1N0cmVhbScsXG4gICAgICAgICdsb2dzOlB1dExvZ0V2ZW50cycsXG4gICAgICAgICdsb2dzOkRlc2NyaWJlTG9nU3RyZWFtcycsXG4gICAgICAgICdsb2dzOkRlc2NyaWJlTG9nR3JvdXBzJyxcbiAgICAgIF0sXG4gICAgICByZXNvdXJjZXM6IFtcbiAgICAgICAgYGFybjphd3M6bG9nczoke3RoaXMucmVnaW9ufToke3RoaXMuYWNjb3VudH06bG9nLWdyb3VwOi9hd3MvbGFtYmRhLyR7cmVzb3VyY2VQcmVmaXh9LSpgLFxuICAgICAgICBgYXJuOmF3czpsb2dzOiR7dGhpcy5yZWdpb259OiR7dGhpcy5hY2NvdW50fTpsb2ctZ3JvdXA6L2F3cy9sYW1iZGEvJHtyZXNvdXJjZVByZWZpeH0tKjoqYCxcbiAgICAgIF0sXG4gICAgfSkpO1xuXG4gICAgLy8gR3JhbnQgWC1SYXkgdHJhY2luZyBwZXJtaXNzaW9uc1xuICAgIHRoaXMubGFtYmRhRXhlY3V0aW9uUm9sZS5hZGRUb1BvbGljeShuZXcgaWFtLlBvbGljeVN0YXRlbWVudCh7XG4gICAgICBlZmZlY3Q6IGlhbS5FZmZlY3QuQUxMT1csXG4gICAgICBhY3Rpb25zOiBbXG4gICAgICAgICd4cmF5OlB1dFRyYWNlU2VnbWVudHMnLFxuICAgICAgICAneHJheTpQdXRUZWxlbWV0cnlSZWNvcmRzJyxcbiAgICAgIF0sXG4gICAgICByZXNvdXJjZXM6IFsnKiddLFxuICAgIH0pKTtcblxuICAgIC8vIFRhZ3NcbiAgICBjZGsuVGFncy5vZih0aGlzLmp3dFNlY3JldCkuYWRkKCdTZXJ2aWNlJywgJ0dhYmlZb2dhTGFtYmRhJyk7XG4gICAgY2RrLlRhZ3Mub2YodGhpcy5qd3RTZWNyZXQpLmFkZCgnRW52aXJvbm1lbnQnLCBzdGFnZSk7XG4gICAgY2RrLlRhZ3Mub2YodGhpcy5qd3RTZWNyZXQpLmFkZCgnUHVycG9zZScsICdKV1QtQXV0aGVudGljYXRpb24nKTtcblxuICAgIGNkay5UYWdzLm9mKHRoaXMuc3RyaXBlU2VjcmV0KS5hZGQoJ1NlcnZpY2UnLCAnR2FiaVlvZ2FMYW1iZGEnKTtcbiAgICBjZGsuVGFncy5vZih0aGlzLnN0cmlwZVNlY3JldCkuYWRkKCdFbnZpcm9ubWVudCcsIHN0YWdlKTtcbiAgICBjZGsuVGFncy5vZih0aGlzLnN0cmlwZVNlY3JldCkuYWRkKCdQdXJwb3NlJywgJ1BheW1lbnQtUHJvY2Vzc2luZycpO1xuXG4gICAgY2RrLlRhZ3Mub2YodGhpcy5sYW1iZGFFeGVjdXRpb25Sb2xlKS5hZGQoJ1NlcnZpY2UnLCAnR2FiaVlvZ2FMYW1iZGEnKTtcbiAgICBjZGsuVGFncy5vZih0aGlzLmxhbWJkYUV4ZWN1dGlvblJvbGUpLmFkZCgnRW52aXJvbm1lbnQnLCBzdGFnZSk7XG4gICAgY2RrLlRhZ3Mub2YodGhpcy5sYW1iZGFFeGVjdXRpb25Sb2xlKS5hZGQoJ1B1cnBvc2UnLCAnTGFtYmRhLUV4ZWN1dGlvbicpO1xuXG4gICAgLy8gT3V0cHV0c1xuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdKV1RTZWNyZXRBcm4nLCB7XG4gICAgICB2YWx1ZTogdGhpcy5qd3RTZWNyZXQuc2VjcmV0QXJuLFxuICAgICAgZGVzY3JpcHRpb246ICdKV1QgU2VjcmV0IEFSTicsXG4gICAgICBleHBvcnROYW1lOiBgJHtyZXNvdXJjZVByZWZpeH0tSldUU2VjcmV0QXJuYCxcbiAgICB9KTtcblxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdTdHJpcGVTZWNyZXRBcm4nLCB7XG4gICAgICB2YWx1ZTogdGhpcy5zdHJpcGVTZWNyZXQuc2VjcmV0QXJuLFxuICAgICAgZGVzY3JpcHRpb246ICdTdHJpcGUgU2VjcmV0IEFSTicsXG4gICAgICBleHBvcnROYW1lOiBgJHtyZXNvdXJjZVByZWZpeH0tU3RyaXBlU2VjcmV0QXJuYCxcbiAgICB9KTtcblxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdMYW1iZGFFeGVjdXRpb25Sb2xlQXJuJywge1xuICAgICAgdmFsdWU6IHRoaXMubGFtYmRhRXhlY3V0aW9uUm9sZS5yb2xlQXJuLFxuICAgICAgZGVzY3JpcHRpb246ICdMYW1iZGEgRXhlY3V0aW9uIFJvbGUgQVJOJyxcbiAgICAgIGV4cG9ydE5hbWU6IGAke3Jlc291cmNlUHJlZml4fS1MYW1iZGFFeGVjdXRpb25Sb2xlQXJuYCxcbiAgICB9KTtcblxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdKV1RTZWNyZXROYW1lJywge1xuICAgICAgdmFsdWU6IHRoaXMuand0U2VjcmV0LnNlY3JldE5hbWUsXG4gICAgICBkZXNjcmlwdGlvbjogJ0pXVCBTZWNyZXQgTmFtZScsXG4gICAgICBleHBvcnROYW1lOiBgJHtyZXNvdXJjZVByZWZpeH0tSldUU2VjcmV0TmFtZWAsXG4gICAgfSk7XG5cbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnU3RyaXBlU2VjcmV0TmFtZScsIHtcbiAgICAgIHZhbHVlOiB0aGlzLnN0cmlwZVNlY3JldC5zZWNyZXROYW1lLFxuICAgICAgZGVzY3JpcHRpb246ICdTdHJpcGUgU2VjcmV0IE5hbWUnLFxuICAgICAgZXhwb3J0TmFtZTogYCR7cmVzb3VyY2VQcmVmaXh9LVN0cmlwZVNlY3JldE5hbWVgLFxuICAgIH0pO1xuICB9XG59XG4iXX0=