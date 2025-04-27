import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';

export interface SecurityStackProps extends cdk.StackProps {
  webSecurityGroup: ec2.SecurityGroup;
  databaseSecurityGroup: ec2.SecurityGroup;
}

/**
 * Stack to manage security group rules between dependent stacks
 * This resolves circular dependencies between WebApp and Database stacks
 */
export class SecurityStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: SecurityStackProps) {
    super(scope, id, props);

    // Allow web servers to connect to database
    props.databaseSecurityGroup.addIngressRule(
      props.webSecurityGroup,
      ec2.Port.tcp(3306),
      'Allow MySQL connections from web servers'
    );

    // Outputs
    new cdk.CfnOutput(this, 'SecurityGroupConfiguration', {
      value: 'Security rules configured successfully',
      description: 'Status of security rules configuration',
    });
  }
}
