import * as cdk from 'aws-cdk-lib';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';
export interface LambdaAuthStackProps extends cdk.StackProps {
    stage: string;
    usersTable: dynamodb.Table;
    jwtBlacklistTable: dynamodb.Table;
}
export declare class LambdaAuthStack extends cdk.Stack {
    readonly jwtSecret: secretsmanager.Secret;
    readonly stripeSecret: secretsmanager.Secret;
    readonly lambdaExecutionRole: iam.Role;
    constructor(scope: Construct, id: string, props: LambdaAuthStackProps);
}
