import { Stack, StackProps, Duration, RemovalPolicy, CfnOutput } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { Bucket, IBucket, ObjectOwnership, CfnBucketPolicy } from 'aws-cdk-lib/aws-s3';
import { 
  Distribution, 
  CfnDistribution, 
  CfnOriginAccessControl,
  AllowedMethods,
  ViewerProtocolPolicy,
  CachedMethods,
  CachePolicy,
  PriceClass,
  SecurityPolicyProtocol
} from 'aws-cdk-lib/aws-cloudfront';
import { S3Origin } from 'aws-cdk-lib/aws-cloudfront-origins';

export interface StorageStackProps extends StackProps {}

export class StorageStack extends Stack {
  public readonly storageBucket: IBucket;
  public readonly distribution: Distribution;

  constructor(scope: Construct, id: string, props?: StorageStackProps) {
    super(scope, id, props);

    // Reference the existing S3 bucket
    this.storageBucket = Bucket.fromBucketName(
      this,
      'StorageBucket', 
      'gabi-yoga-uploads'
    );

    // Create Origin Access Control (OAC) - modern replacement for OAI
    const cfnOriginAccessControl = new CfnOriginAccessControl(this, 'OriginAccessControl', {
      originAccessControlConfig: {
        name: 'GabiYogaS3Access',
        originAccessControlOriginType: 's3',
        signingBehavior: 'always',
        signingProtocol: 'sigv4',
        description: 'Access control for Gabi Yoga S3 bucket',
      }
    });
    
    // Create a separate policy for the bucket (since we can't use addToResourcePolicy on imported bucket)
    new CfnBucketPolicy(this, 'BucketPolicy', {
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
    this.distribution = new Distribution(this, 'Distribution', {
      defaultBehavior: {
        origin: new S3Origin(this.storageBucket),
        allowedMethods: AllowedMethods.ALLOW_GET_HEAD,
        viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachedMethods: CachedMethods.CACHE_GET_HEAD,
        compress: true,
        cachePolicy: CachePolicy.CACHING_OPTIMIZED,
      },
      defaultRootObject: 'index.html',
      errorResponses: [
        {
          httpStatus: 403,
          responseHttpStatus: 404,
          responsePagePath: '/404.html',
          ttl: Duration.minutes(5),
        },
      ],
      priceClass: PriceClass.PRICE_CLASS_100, // Use US, Canada, Europe, & Israel - lowest cost option
      enableLogging: true,
      logBucket: new Bucket(this, 'LogBucket', {
        removalPolicy: RemovalPolicy.DESTROY,
        autoDeleteObjects: true,
        objectOwnership: ObjectOwnership.OBJECT_WRITER, // Enable ACL access for CloudFront logging
        lifecycleRules: [
          {
            expiration: Duration.days(7), // Reduced from 30 days to save storage costs
          },
        ],
      }),
      logFilePrefix: 'cloudfront-logs/',
      minimumProtocolVersion: SecurityPolicyProtocol.TLS_V1_2_2021,
    });

    // Attach the Origin Access Control to the CloudFront distribution
    // This needs to be done at the CloudFormation level since the CDK high-level construct doesn't support OAC directly
    const cfnDistribution = this.distribution.node.defaultChild as CfnDistribution;
    const cfnDistributionConfig = cfnDistribution.distributionConfig as any;
    
    // Get the S3 origin configuration (this assumes it's the first/default origin)
    if (cfnDistributionConfig.origins && cfnDistributionConfig.origins.items && cfnDistributionConfig.origins.items.length > 0) {
      // Set the origin access control ID on the S3 origin and remove any existing origin access identity
      const s3Origin = cfnDistributionConfig.origins.items[0];
      s3Origin.originAccessControlId = cfnOriginAccessControl.attrId;
      delete s3Origin.s3OriginConfig.originAccessIdentity;
    }

    // Outputs
    new CfnOutput(this, 'BucketName', {
      value: this.storageBucket.bucketName,
      description: 'S3 bucket name for uploads',
    });

    new CfnOutput(this, 'CloudFrontURL', {
      value: `https://${this.distribution.distributionDomainName}`,
      description: 'CloudFront URL for assets',
    });

    new CfnOutput(this, 'CloudFrontDistributionId', {
      value: this.distribution.distributionId,
      description: 'CloudFront distribution ID',
    });
  }
}
