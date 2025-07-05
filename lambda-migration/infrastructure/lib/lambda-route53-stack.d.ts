import * as cdk from 'aws-cdk-lib';
import * as route53 from 'aws-cdk-lib/aws-route53';
import { Construct } from 'constructs';
export interface LambdaRoute53StackProps extends cdk.StackProps {
    stage: string;
    apiGateway?: any;
    domainName: string;
}
export declare class LambdaRoute53Stack extends cdk.Stack {
    readonly customDomainName: string;
    readonly hostedZone: route53.IHostedZone;
    constructor(scope: Construct, id: string, props: LambdaRoute53StackProps);
}
