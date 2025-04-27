import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';

export interface CredentialsStackProps extends cdk.StackProps {}

/**
 * Stack to manage credentials and secrets that would otherwise
 * create circular dependencies between stacks
 */
export class CredentialsStack extends cdk.Stack {
  public readonly databaseSecret: secretsmanager.Secret;

  constructor(scope: Construct, id: string, props: CredentialsStackProps = {}) {
    super(scope, id, props);

    // Create a secret for database credentials
    this.databaseSecret = new secretsmanager.Secret(this, 'DatabaseCredentials', {
      secretName: 'gabi-yoga-db-credentials',
      generateSecretString: {
        secretStringTemplate: JSON.stringify({ username: 'admin' }),
        generateStringKey: 'password',
        excludePunctuation: true,
        includeSpace: false,
        passwordLength: 16,
      },
    });

    // Outputs
    new cdk.CfnOutput(this, 'DatabaseSecretArn', {
      value: this.databaseSecret.secretArn,
      description: 'Database credentials secret ARN',
    });
  }
}
