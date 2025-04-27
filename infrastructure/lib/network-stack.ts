import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';

export interface NetworkStackProps extends cdk.StackProps {}

export class NetworkStack extends cdk.Stack {
  public readonly vpc: ec2.Vpc;

  constructor(scope: Construct, id: string, props?: NetworkStackProps) {
    super(scope, id, props);

    // Create a new VPC with specific CIDR ranges to avoid conflicts
    this.vpc = new ec2.Vpc(this, 'GabiYogaFreeVpc', { // Renamed to create new resource
      ipAddresses: ec2.IpAddresses.cidr('10.1.0.0/16'), // Using a completely new CIDR range
      maxAzs: 2,
      natGateways: 0, // No NAT gateways for free tier
      subnetConfiguration: [
        {
          name: 'public',
          subnetType: ec2.SubnetType.PUBLIC,
          cidrMask: 24,
        },
        {
          name: 'isolated',
          subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
          cidrMask: 24,
        }
      ]
    });
    
    // Create security group for web traffic
    const webSecurityGroup = new ec2.SecurityGroup(this, 'WebSecurityGroup', {
      vpc: this.vpc,
      description: 'Allow web traffic',
      allowAllOutbound: true,
    });
    
    webSecurityGroup.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(80),
      'Allow HTTP traffic'
    );
    
    webSecurityGroup.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(443),
      'Allow HTTPS traffic'
    );
    
    // Create outputs
    new cdk.CfnOutput(this, 'VpcId', {
      value: this.vpc.vpcId,
      description: 'VPC ID for Gabi Yoga application',
    });
  }
}
