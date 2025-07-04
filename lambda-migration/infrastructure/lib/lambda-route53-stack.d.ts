import * as cdk from 'aws-cdk-lib';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import { Construct } from 'constructs';
export interface LambdaRoute53StackProps extends cdk.StackProps {
    stage: string;
    apiGateway: apigateway.RestApi;
    domainName: string;
}
export declare class LambdaRoute53Stack extends cdk.Stack {
    readonly customDomainName: string;
    constructor(scope: Construct, id: string, props: LambdaRoute53StackProps);
}
