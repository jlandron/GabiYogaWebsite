import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import { Construct } from 'constructs';
export interface LambdaDbStackProps extends cdk.StackProps {
    stage: string;
}
export declare class LambdaDbStack extends cdk.Stack {
    readonly usersTable: dynamodb.Table;
    readonly blogPostsTable: dynamodb.Table;
    readonly classesTable: dynamodb.Table;
    readonly bookingsTable: dynamodb.Table;
    readonly retreatsTable: dynamodb.Table;
    readonly workshopsTable: dynamodb.Table;
    readonly galleryTable: dynamodb.Table;
    readonly settingsTable: dynamodb.Table;
    readonly communicationsTable: dynamodb.Table;
    readonly jwtBlacklistTable: dynamodb.Table;
    readonly dynamodbTables: dynamodb.Table[];
    constructor(scope: Construct, id: string, props: LambdaDbStackProps);
}
