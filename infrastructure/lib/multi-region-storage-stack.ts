import { Stack, StackProps, Duration, RemovalPolicy, CfnOutput, Environment } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { 
  Bucket, 
  IBucket, 
  ObjectOwnership, 
  CfnBucketPolicy,
  StorageClass,
  CfnBucket
} from 'aws-cdk-lib/aws-s3';
import { 
  Distribution, 
  CfnDistribution, 
  CfnOriginAccessControl,
  AllowedMethods,
  ViewerProtocolPolicy,
  CachedMethods,
  CachePolicy,
  PriceClass,
  SecurityPolicyProtocol,
  OriginRequestPolicy,
  HeadersFrameOption,
  HeadersReferrerPolicy,
  ResponseHeadersPolicy
} from 'aws-cdk-lib/aws-cloudfront';
import { S3Origin } from 'aws-cdk-lib/aws-cloudfront-origins';
import { Role, ServicePrincipal, PolicyStatement, Effect } from 'aws-cdk-lib/aws-iam';

export interface MultiRegionStorageStackProps extends StackProps {
  readonly primaryRegion: string;
  readonly secondaryRegion: string;
  readonly primaryBucketName: string;
}

export class MultiRegionStorageStack extends Stack {
  public readonly primaryBucket: IBucket;
  public readonly secondaryBucket: Bucket;
  public readonly globalDistribution: Distribution;
  public readonly replicationRole: Role;

  constructor(scope: Construct, id: string, props: MultiRegionStorageStackProps) {
    super(scope, id, props);

    const { primaryRegion, secondaryRegion, primaryBucketName } = props;

    // Reference the existing primary S3 bucket (us-west-2)
    this.primaryBucket = Bucket.fromBucketName(
      this,
      'PrimaryStorageBucket', 
      primaryBucketName
    );

    // Create IAM role for cross-region replication
    this.replicationRole = new Role(this, 'ReplicationRole', {
      roleName: `GabiYoga-S3-Replication-Role-${primaryBucketName}`,
      assumedBy: new ServicePrincipal('s3.amazonaws.com'),
      description: 'Role for S3 cross-region replication',
    });

    // Create secondary S3 bucket in EU region
    this.secondaryBucket = new Bucket(this, 'SecondaryStorageBucket', {
      bucketName: `${primaryBucketName}-eu`,
      versioned: true, // Required for replication
      objectOwnership: ObjectOwnership.BUCKET_OWNER_ENFORCED,
      removalPolicy: RemovalPolicy.RETAIN, // Keep data on stack deletion
      lifecycleRules: [
        {
          id: 'OptimizeStorage',
          enabled: true,
          transitions: [
            {
              storageClass: StorageClass.INFREQUENT_ACCESS,
              transitionAfter: Duration.days(30),
            },
            {
              storageClass: StorageClass.GLACIER,
              transitionAfter: Duration.days(90),
            },
          ],
        },
      ],
    });

    // Grant replication permissions
    this.replicationRole.addToPolicy(new PolicyStatement({
      effect: Effect.ALLOW,
      actions: [
        's3:GetObjectVersionForReplication',
        's3:GetObjectVersionAcl',
        's3:GetObjectVersionTagging',
      ],
      resources: [`${this.primaryBucket.bucketArn}/*`],
    }));

    this.replicationRole.addToPolicy(new PolicyStatement({
      effect: Effect.ALLOW,
      actions: [
        's3:ListBucket',
        's3:GetBucketVersioning',
      ],
      resources: [this.primaryBucket.bucketArn],
    }));

    this.replicationRole.addToPolicy(new PolicyStatement({
      effect: Effect.ALLOW,
      actions: [
        's3:ReplicateObject',
        's3:ReplicateDelete',
        's3:ReplicateTags',
      ],
      resources: [`${this.secondaryBucket.bucketArn}/*`],
    }));

    // Create Origin Access Control for both buckets
    const primaryOAC = new CfnOriginAccessControl(this, 'PrimaryOriginAccessControl', {
      originAccessControlConfig: {
        name: 'GabiYogaS3AccessPrimary',
        originAccessControlOriginType: 's3',
        signingBehavior: 'always',
        signingProtocol: 'sigv4',
        description: 'Access control for primary Gabi Yoga S3 bucket',
      }
    });

    const secondaryOAC = new CfnOriginAccessControl(this, 'SecondaryOriginAccessControl', {
      originAccessControlConfig: {
        name: 'GabiYogaS3AccessSecondary',
        originAccessControlOriginType: 's3',
        signingBehavior: 'always',
        signingProtocol: 'sigv4',
        description: 'Access control for secondary Gabi Yoga S3 bucket',
      }
    });

    // Create bucket policy for the secondary (EU) bucket only
    // Note: Primary bucket policy should be managed in the primary region (us-west-2)
    new CfnBucketPolicy(this, 'SecondaryBucketPolicy', {
      bucket: this.secondaryBucket.bucketName,
      policyDocument: {
        Version: '2012-10-17',
        Statement: [
          {
            Action: ['s3:GetObject'],
            Effect: 'Allow',
            Principal: { Service: 'cloudfront.amazonaws.com' },
            Resource: `${this.secondaryBucket.bucketArn}/*`,
            Condition: {
              StringEquals: {
                'AWS:SourceArn': `arn:aws:cloudfront::${this.account}:distribution/*`
              }
            }
          }
        ]
      }
    });

    // Create response headers policy for security
    const responseHeadersPolicy = new ResponseHeadersPolicy(this, 'SecurityHeaders', {
      responseHeadersPolicyName: 'GabiYogaSecurityHeaders',
      securityHeadersBehavior: {
        contentTypeOptions: { override: true },
        frameOptions: { frameOption: HeadersFrameOption.DENY, override: true },
        referrerPolicy: { referrerPolicy: HeadersReferrerPolicy.STRICT_ORIGIN_WHEN_CROSS_ORIGIN, override: true },
        strictTransportSecurity: { 
          accessControlMaxAge: Duration.seconds(31536000), 
          includeSubdomains: true, 
          override: true 
        },
      },
    });

    // Create global CloudFront distribution with multiple origins
    this.globalDistribution = new Distribution(this, 'GlobalDistribution', {
      comment: 'Multi-region distribution for Gabi Yoga images',
      defaultBehavior: {
        origin: new S3Origin(this.primaryBucket),
        allowedMethods: AllowedMethods.ALLOW_GET_HEAD,
        viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachedMethods: CachedMethods.CACHE_GET_HEAD,
        compress: true,
        cachePolicy: CachePolicy.CACHING_OPTIMIZED,
        originRequestPolicy: OriginRequestPolicy.CORS_S3_ORIGIN,
        responseHeadersPolicy,
      },
      additionalBehaviors: {
        // EU users get routed to secondary bucket
        'eu/*': {
          origin: new S3Origin(this.secondaryBucket),
          allowedMethods: AllowedMethods.ALLOW_GET_HEAD,
          viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          cachedMethods: CachedMethods.CACHE_GET_HEAD,
          compress: true,
          cachePolicy: CachePolicy.CACHING_OPTIMIZED,
          originRequestPolicy: OriginRequestPolicy.CORS_S3_ORIGIN,
          responseHeadersPolicy,
        },
      },
      defaultRootObject: 'index.html',
      errorResponses: [
        {
          httpStatus: 403,
          responseHttpStatus: 404,
          responsePagePath: '/404.html',
          ttl: Duration.minutes(5),
        },
        {
          httpStatus: 404,
          responseHttpStatus: 404,
          responsePagePath: '/404.html',
          ttl: Duration.minutes(5),
        },
      ],
      priceClass: PriceClass.PRICE_CLASS_ALL, // Global distribution for best performance
      enableLogging: true,
      logBucket: new Bucket(this, 'GlobalLogBucket', {
        bucketName: `${primaryBucketName}-global-logs`,
        removalPolicy: RemovalPolicy.DESTROY,
        autoDeleteObjects: true,
        objectOwnership: ObjectOwnership.OBJECT_WRITER,
        lifecycleRules: [
          {
            expiration: Duration.days(7),
          },
        ],
      }),
      logFilePrefix: 'global-cloudfront-logs/',
      minimumProtocolVersion: SecurityPolicyProtocol.TLS_V1_2_2021,
    });

    // Configure Origin Access Control at CloudFormation level
    const cfnDistribution = this.globalDistribution.node.defaultChild as CfnDistribution;
    const cfnDistributionConfig = cfnDistribution.distributionConfig as any;
    
    if (cfnDistributionConfig.origins && cfnDistributionConfig.origins.items) {
      // Primary origin (US)
      const primaryOrigin = cfnDistributionConfig.origins.items[0];
      primaryOrigin.originAccessControlId = primaryOAC.attrId;
      delete primaryOrigin.s3OriginConfig?.originAccessIdentity;
      
      // Secondary origin (EU) 
      if (cfnDistributionConfig.origins.items[1]) {
        const secondaryOrigin = cfnDistributionConfig.origins.items[1];
        secondaryOrigin.originAccessControlId = secondaryOAC.attrId;
        delete secondaryOrigin.s3OriginConfig?.originAccessIdentity;
      }
    }

    // Outputs
    new CfnOutput(this, 'PrimaryBucketName', {
      value: this.primaryBucket.bucketName,
      description: 'Primary S3 bucket name (US)',
    });

    new CfnOutput(this, 'SecondaryBucketName', {
      value: this.secondaryBucket.bucketName,
      description: 'Secondary S3 bucket name (EU)',
    });

    new CfnOutput(this, 'GlobalCloudFrontURL', {
      value: `https://${this.globalDistribution.distributionDomainName}`,
      description: 'Global CloudFront URL for optimized image delivery',
    });

    new CfnOutput(this, 'GlobalDistributionId', {
      value: this.globalDistribution.distributionId,
      description: 'Global CloudFront distribution ID',
    });

    new CfnOutput(this, 'ReplicationRoleArn', {
      value: this.replicationRole.roleArn,
      description: 'IAM role ARN for cross-region replication',
    });
  }
}
