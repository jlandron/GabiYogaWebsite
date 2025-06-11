import { Stack, StackProps, CfnOutput } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { 
  Bucket, 
  IBucket, 
  CfnBucketPolicy
} from 'aws-cdk-lib/aws-s3';

export interface PrimaryBucketPolicyStackProps extends StackProps {
  readonly primaryBucketName: string;
}

export class PrimaryBucketPolicyStack extends Stack {
  public readonly primaryBucket: IBucket;

  constructor(scope: Construct, id: string, props: PrimaryBucketPolicyStackProps) {
    super(scope, id, props);

    const { primaryBucketName } = props;

    // Reference the existing primary S3 bucket (us-west-2)
    this.primaryBucket = Bucket.fromBucketName(
      this,
      'PrimaryBucket', 
      primaryBucketName
    );

    // Create bucket policy for CloudFront access on the primary bucket
    // This must be created in the same region as the bucket (us-west-2)
    new CfnBucketPolicy(this, 'PrimaryBucketPolicy', {
      bucket: this.primaryBucket.bucketName,
      policyDocument: {
        Version: '2012-10-17',
        Statement: [
          {
            Action: ['s3:GetObject'],
            Effect: 'Allow',
            Principal: { Service: 'cloudfront.amazonaws.com' },
            Resource: `${this.primaryBucket.bucketArn}/*`,
            Condition: {
              StringEquals: {
                'AWS:SourceArn': `arn:aws:cloudfront::${this.account}:distribution/*`
              }
            }
          },
          {
            Action: [
              's3:GetObject',
              's3:PutObject',
              's3:DeleteObject',
              's3:ListBucket'
            ],
            Effect: 'Allow',
            Principal: { Service: 'ec2.amazonaws.com' },
            Resource: [
              `${this.primaryBucket.bucketArn}/*`,
              `${this.primaryBucket.bucketArn}`
            ]
          }
        ]
      }
    });

    // Outputs
    new CfnOutput(this, 'PrimaryBucketArn', {
      value: this.primaryBucket.bucketArn,
      description: 'Primary S3 bucket ARN with updated policy',
    });

    new CfnOutput(this, 'PrimaryBucketName', {
      value: this.primaryBucket.bucketName,
      description: 'Primary S3 bucket name',
    });
  }
}
