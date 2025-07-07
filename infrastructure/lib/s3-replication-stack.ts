import { Stack, StackProps, CfnOutput } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { CfnBucket } from 'aws-cdk-lib/aws-s3';
import { Role } from 'aws-cdk-lib/aws-iam';

export interface S3ReplicationStackProps extends StackProps {
  readonly primaryBucketName: string;
  readonly secondaryBucketName: string;
  readonly secondaryRegion: string;
  readonly replicationRole: Role;
}

export class S3ReplicationStack extends Stack {
  constructor(scope: Construct, id: string, props: S3ReplicationStackProps) {
    super(scope, id, props);

    const { primaryBucketName, secondaryBucketName, secondaryRegion, replicationRole } = props;

    // Configure replication on the primary bucket using CfnBucket
    // This requires enabling versioning and setting up replication configuration
    const replicationConfig = {
      role: replicationRole.roleArn,
      rules: [
        {
          id: 'ReplicateGalleryToEU',
          status: 'Enabled',
          prefix: 'gallery/', // Replicate gallery images
          destination: {
            bucket: `arn:aws:s3:::${secondaryBucketName}`,
            storageClass: 'STANDARD_IA', // Use Infrequent Access in destination for cost savings
          },
        },
        {
          id: 'ReplicateImagesToEU',
          status: 'Enabled',
          prefix: 'images/', // Replicate hero and other static images
          destination: {
            bucket: `arn:aws:s3:::${secondaryBucketName}`,
            storageClass: 'STANDARD_IA', // Use Infrequent Access in destination for cost savings
          },
        },
      ],
    };

    // Note: Since we're referencing an existing bucket, we need to handle replication configuration
    // through AWS CLI or Console manually, or create a Custom Resource
    // For now, we'll output the configuration needed

    new CfnOutput(this, 'ReplicationConfiguration', {
      value: JSON.stringify(replicationConfig, null, 2),
      description: 'S3 replication configuration to apply to primary bucket',
    });

    new CfnOutput(this, 'PrimaryBucketArn', {
      value: `arn:aws:s3:::${primaryBucketName}`,
      description: 'Primary bucket ARN for replication setup',
    });

    new CfnOutput(this, 'SecondaryBucketArn', {
      value: `arn:aws:s3:::${secondaryBucketName}`,
      description: 'Secondary bucket ARN for replication destination',
    });

    new CfnOutput(this, 'ReplicationSetupCommand', {
      value: `aws s3api put-bucket-replication --bucket ${primaryBucketName} --replication-configuration '${JSON.stringify(replicationConfig)}'`,
      description: 'AWS CLI command to configure S3 replication',
    });
  }
}
