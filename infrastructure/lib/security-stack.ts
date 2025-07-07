import { Stack, StackProps, CfnOutput } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { SecurityGroup, Port } from 'aws-cdk-lib/aws-ec2';

export interface SecurityStackProps extends StackProps {
  webSecurityGroup: SecurityGroup;
  databaseSecurityGroup: SecurityGroup;
}

/**
 * Stack to manage security group rules between dependent stacks
 * This resolves circular dependencies between WebApp and Database stacks
 */
export class SecurityStack extends Stack {
  constructor(scope: Construct, id: string, props: SecurityStackProps) {
    super(scope, id, props);

    // Allow web servers to connect to database
    props.databaseSecurityGroup.addIngressRule(
      props.webSecurityGroup,
      Port.tcp(3306),
      'Allow MySQL connections from web servers'
    );

    // Outputs
    new CfnOutput(this, 'SecurityGroupConfiguration', {
      value: 'Security rules configured successfully',
      description: 'Status of security rules configuration',
    });
  }
}
