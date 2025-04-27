import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as cloudfront_origins from 'aws-cdk-lib/aws-cloudfront-origins';

export interface StorageStackProps extends cdk.StackProps {}

export class StorageStack extends cdk.Stack {
  public readonly storageBucket: s3.IBucket;
  public readonly distribution: cloudfront.Distribution;

  constructor(scope: Construct, id: string, props?: StorageStackProps) {
    super(scope, id, props);

    // Reference the existing S3 bucket
    this.storageBucket = s3.Bucket.fromBucketName(
      this,
      'StorageBucket', 
      'gabi-yoga-uploads'
    );

    // Create Origin Access Control (OAC) - modern replacement for OAI
    const cfnOriginAccessControl = new cloudfront.CfnOriginAccessControl(this, 'OriginAccessControl', {
      originAccessControlConfig: {
        name: 'GabiYogaS3Access',
        originAccessControlOriginType: 's3',
        signingBehavior: 'always',
        signingProtocol: 'sigv4',
        description: 'Access control for Gabi Yoga S3 bucket',
      }
    });
    
    // Create a separate policy for the bucket (since we can't use addToResourcePolicy on imported bucket)
    new s3.CfnBucketPolicy(this, 'BucketPolicy', {
      bucket: this.storageBucket.bucketName,
      policyDocument: {
        Version: '2012-10-17',
        Statement: [
          {
            Action: ['s3:GetObject'],
            Effect: 'Allow',
            Principal: { Service: 'cloudfront.amazonaws.com' },
            Resource: `${this.storageBucket.bucketArn}/*`,
            Condition: {
              StringEquals: {
                'AWS:SourceArn': `arn:aws:cloudfront::${this.account}:distribution/*`
              }
            }
          }
        ]
      }
    });

    // Create CloudFront distribution for the S3 bucket
    this.distribution = new cloudfront.Distribution(this, 'Distribution', {
      defaultBehavior: {
        origin: new origins.S3Origin(this.storageBucket),
        allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD,
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachedMethods: cloudfront.CachedMethods.CACHE_GET_HEAD,
        compress: true,
        cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
      },
      defaultRootObject: 'index.html',
      errorResponses: [
        {
          httpStatus: 403,
          responseHttpStatus: 404,
          responsePagePath: '/404.html',
          ttl: cdk.Duration.minutes(5),
        },
      ],
      priceClass: cloudfront.PriceClass.PRICE_CLASS_100, // Use US, Canada, Europe, & Israel
      enableLogging: true,
      logBucket: new s3.Bucket(this, 'LogBucket', {
        removalPolicy: cdk.RemovalPolicy.DESTROY,
        autoDeleteObjects: true,
        objectOwnership: s3.ObjectOwnership.OBJECT_WRITER, // Enable ACL access for CloudFront logging
        lifecycleRules: [
          {
            expiration: cdk.Duration.days(30),
          },
        ],
      }),
      logFilePrefix: 'cloudfront-logs/',
      minimumProtocolVersion: cloudfront.SecurityPolicyProtocol.TLS_V1_2_2021,
    });

    // Attach the Origin Access Control to the CloudFront distribution
    // This needs to be done at the CloudFormation level since the CDK high-level construct doesn't support OAC directly
    const cfnDistribution = this.distribution.node.defaultChild as cloudfront.CfnDistribution;
    const cfnDistributionConfig = cfnDistribution.distributionConfig as any;
    
    // Get the S3 origin configuration (this assumes it's the first/default origin)
    if (cfnDistributionConfig.origins && cfnDistributionConfig.origins.items && cfnDistributionConfig.origins.items.length > 0) {
      // Set the origin access control ID on the S3 origin and remove any existing origin access identity
      const s3Origin = cfnDistributionConfig.origins.items[0];
      s3Origin.originAccessControlId = cfnOriginAccessControl.attrId;
      delete s3Origin.s3OriginConfig.originAccessIdentity;
    }

    // Outputs
    new cdk.CfnOutput(this, 'BucketName', {
      value: this.storageBucket.bucketName,
      description: 'S3 bucket name for uploads',
    });

    new cdk.CfnOutput(this, 'CloudFrontURL', {
      value: `https://${this.distribution.distributionDomainName}`,
      description: 'CloudFront URL for assets',
    });

    new cdk.CfnOutput(this, 'CloudFrontDistributionId', {
      value: this.distribution.distributionId,
      description: 'CloudFront distribution ID',
    });
  }
}
