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
  public readonly jwtSecret: Secret;

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

    // Create a secret for JWT authentication
    this.jwtSecret = new Secret(this, 'JwtSecret', {
      secretName: 'gabi-yoga-jwt-secret',
      generateSecretString: {
        secretStringTemplate: JSON.stringify({ description: 'JWT secret for authentication' }),
        generateStringKey: 'secret',
        excludePunctuation: true,
        includeSpace: false,
        passwordLength: 64, // 64 characters for strong JWT secret
      },
    });

    // Outputs
    new CfnOutput(this, 'DatabaseSecretArn', {
      value: this.databaseSecret.secretArn,
      description: 'Database credentials secret ARN',
    });

    new CfnOutput(this, 'JwtSecretArn', {
      value: this.jwtSecret.secretArn,
      description: 'JWT authentication secret ARN',
    });
  }
}
