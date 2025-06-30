import * as cdk from 'aws-cdk-lib';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import { Construct } from 'constructs';
export interface LambdaMonitoringStackProps extends cdk.StackProps {
    stage: string;
    apiGateway: apigateway.RestApi;
    lambdaFunctions: lambda.Function[];
    dynamodbTables: dynamodb.Table[];
}
export declare class LambdaMonitoringStack extends cdk.Stack {
    readonly dashboardUrl: string;
    readonly dashboard: cloudwatch.Dashboard;
    constructor(scope: Construct, id: string, props: LambdaMonitoringStackProps);
}
