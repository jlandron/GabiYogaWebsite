import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
export interface LambdaSesStackProps extends cdk.StackProps {
    stage: string;
    domainName: string;
    hostedZoneId?: string;
}
/**
 * Stack for SES email sending infrastructure
 * Handles email domain verification and necessary IAM permissions
 */
export declare class LambdaSesStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props: LambdaSesStackProps);
}
