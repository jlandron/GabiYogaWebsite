import { Stack, CfnOutput, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { Vpc, IpAddresses, SubnetType, SecurityGroup, Peer, Port } from 'aws-cdk-lib/aws-ec2';

export interface NetworkStackProps extends StackProps {}

export class NetworkStack extends Stack {
  public readonly vpc: Vpc;

  constructor(scope: Construct, id: string, props?: NetworkStackProps) {
    super(scope, id, props);

    // Create a new VPC with specific CIDR ranges to avoid conflicts
    this.vpc = new Vpc(this, 'GabiYogaFreeVpc', { // Renamed to create new resource
      ipAddresses: IpAddresses.cidr('10.1.0.0/16'), // Using a completely new CIDR range
      maxAzs: 2,
      natGateways: 0, // No NAT gateways for free tier
      subnetConfiguration: [
        {
          name: 'public',
          subnetType: SubnetType.PUBLIC,
          cidrMask: 24,
        },
        {
          name: 'isolated',
          subnetType: SubnetType.PRIVATE_ISOLATED,
          cidrMask: 24,
        }
      ]
    });
    
    // Create security group for web traffic
    const webSecurityGroup = new SecurityGroup(this, 'WebSecurityGroup', {
      vpc: this.vpc,
      description: 'Allow web traffic',
      allowAllOutbound: true,
    });
    
    webSecurityGroup.addIngressRule(
      Peer.anyIpv4(),
      Port.tcp(80),
      'Allow HTTP traffic'
    );
    
    webSecurityGroup.addIngressRule(
      Peer.anyIpv4(),
      Port.tcp(443),
      'Allow HTTPS traffic'
    );
    
    // Create outputs
    new CfnOutput(this, 'VpcId', {
      value: this.vpc.vpcId,
      description: 'VPC ID for Gabi Yoga application',
    });
  }
}
