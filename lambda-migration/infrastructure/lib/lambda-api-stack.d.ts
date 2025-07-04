import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as s3 from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';
export interface LambdaApiStackProps extends cdk.StackProps {
    stage: string;
    usersTable: dynamodb.Table;
    blogPostsTable: dynamodb.Table;
    classesTable: dynamodb.Table;
    bookingsTable: dynamodb.Table;
    retreatsTable: dynamodb.Table;
    workshopsTable: dynamodb.Table;
    galleryTable: dynamodb.Table;
    settingsTable: dynamodb.Table;
    communicationsTable: dynamodb.Table;
    jwtBlacklistTable: dynamodb.Table;
    jwtSecret: secretsmanager.Secret;
    stripeSecret: secretsmanager.Secret;
}
export declare class LambdaApiStack extends cdk.Stack {
    readonly apiGateway: apigateway.RestApi;
    readonly lambdaFunctions: lambda.Function[];
    readonly assetsBucket: s3.Bucket;
    constructor(scope: Construct, id: string, props: LambdaApiStackProps);
    private grantSESPermissions;
    private createLambdaFunction;
}
