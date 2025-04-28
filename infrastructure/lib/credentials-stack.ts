import { Stack, StackProps, CfnOutput } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { Secret } from 'aws-cdk-lib/aws-secretsmanager';

export interface CredentialsStackProps extends StackProps {}

/**
 * Stack to manage credentials and secrets that would otherwise
 * create circular dependencies between stacks
 */
export class CredentialsStack extends Stack {
  public readonly databaseSecret: Secret;

  constructor(scope: Construct, id: string, props: CredentialsStackProps = {}) {
    super(scope, id, props);

    // Create a secret for database credentials
    this.databaseSecret = new Secret(this, 'DatabaseCredentials', {
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
    new CfnOutput(this, 'DatabaseSecretArn', {
      value: this.databaseSecret.secretArn,
      description: 'Database credentials secret ARN',
    });
  }
}
