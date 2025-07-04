import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
/**
 * Properties for the SESCrossRegionVerification construct
 */
export interface SESCrossRegionVerificationProps {
    /**
     * The domain name to verify
     */
    domainName: string;
    /**
     * The source region where the domain is already verified
     */
    sourceRegion: string;
    /**
     * The target region where we want to use the domain
     */
    targetRegion: string;
}
/**
 * A construct to handle cross-region verification of SES domains
 */
export declare class SESCrossRegionVerification extends Construct {
    readonly customResource: cdk.CustomResource;
    constructor(scope: Construct, id: string, props: SESCrossRegionVerificationProps);
}
