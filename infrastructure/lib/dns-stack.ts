import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as targets from 'aws-cdk-lib/aws-route53-targets';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';

export interface DnsStackProps extends cdk.StackProps {
  loadBalancer: elbv2.ApplicationLoadBalancer;
  domainName: string;
}

export class DnsStack extends cdk.Stack {
  public readonly hostedZone: route53.HostedZone;
  public readonly certificate: acm.Certificate;

  constructor(scope: Construct, id: string, props: DnsStackProps) {
    super(scope, id, props);

    // Create a hosted zone for the domain
    this.hostedZone = new route53.HostedZone(this, 'HostedZone', {
      zoneName: props.domainName,
      comment: `Hosted zone for ${props.domainName}`,
    });

    // Create an ACM certificate for the domain and www subdomain
    this.certificate = new acm.Certificate(this, 'Certificate', {
      domainName: props.domainName,
      subjectAlternativeNames: [`www.${props.domainName}`],
      validation: acm.CertificateValidation.fromDns(this.hostedZone),
    });
    
    // Note: We don't create target groups or HTTPS listeners here to avoid circular dependencies
    // Instead, we should pass the certificate back to WebAppStack to configure HTTPS

    // Create an A record for the apex domain (gabi.yoga)
    new route53.ARecord(this, 'ApexRecord', {
      zone: this.hostedZone,
      target: route53.RecordTarget.fromAlias(
        new targets.LoadBalancerTarget(props.loadBalancer)
      ),
      recordName: props.domainName,
    });

    // Create a CNAME record for the www subdomain
    new route53.CnameRecord(this, 'WwwRecord', {
      zone: this.hostedZone,
      domainName: props.domainName,
      recordName: `www.${props.domainName}`,
    });

    // Output the nameservers
    new cdk.CfnOutput(this, 'Nameservers', {
      value: cdk.Fn.join('\n', this.hostedZone.hostedZoneNameServers || []),
      description: 'Nameservers for domain registration',
    });

    new cdk.CfnOutput(this, 'HostedZoneId', {
      value: this.hostedZone.hostedZoneId,
      description: 'Route53 Hosted Zone ID',
    });

    new cdk.CfnOutput(this, 'CertificateArn', {
      value: this.certificate.certificateArn,
      description: 'ACM Certificate ARN',
    });

    new cdk.CfnOutput(this, 'DomainRegistrationInstructions', {
      value: `
        Use these nameservers to register ${props.domainName} with your domain registrar:
        ${cdk.Fn.join('\n', this.hostedZone.hostedZoneNameServers || [])}

        If registering through AWS Route53, run:
        aws route53domains register-domain --domain-name ${props.domainName} --admin-contact ... --registrant-contact ... --tech-contact ... --years 1 --auto-renew
      `,
      description: 'Instructions for domain registration',
    });
  }
}
