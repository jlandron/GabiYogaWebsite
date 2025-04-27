# Adding HTTPS Listener to the Web Application

To enable HTTPS for your web application, you need to update the `webapp-stack.ts` file to add an HTTPS listener to the load balancer. Here's how to modify the WebAppStack to support HTTPS:

## 1. Update app.ts to Pass the Certificate

First, update the `app.ts` file to pass the certificate from the DnsStack to the WebAppStack:

```typescript
// in app.ts
// Create WebApp stack and store a reference to it
const webAppStack = new WebAppStack(app, 'GabiYogaWebApp', {
  env,
  vpc: networkStack.vpc,
  database: databaseStack.database,
  databaseSecurityGroup: databaseStack.databaseSecurityGroup,
  bucket: storageStack.storageBucket,
  distribution: storageStack.distribution
});

// Create DNS stack with Route53 configuration
const dnsStack = new DnsStack(app, 'GabiYogaDns', {
  env,
  domainName: domainName,
  loadBalancer: webAppStack.loadBalancer
});

// Add a dependency to ensure the certificate is created before being used
webAppStack.addDependency(dnsStack);

// Now pass the certificate to the WebAppStack
webAppStack.addHttpsListener(dnsStack.certificate);
```

## 2. Add Method to WebAppStack for HTTPS Listener

Then, add a method to the WebAppStack class to add an HTTPS listener:

```typescript
// in webapp-stack.ts
import * as acm from 'aws-cdk-lib/aws-certificatemanager';

export class WebAppStack extends cdk.Stack {
  // ... existing code ...
  
  // Add a method to enable HTTPS with the certificate
  public addHttpsListener(certificate: acm.ICertificate) {
    // Add HTTPS listener
    const httpsListener = this.loadBalancer.addListener('HttpsListener', {
      port: 443,
      certificates: [certificate],
      open: true,
      sslPolicy: elbv2.SslPolicy.RECOMMENDED
    });

    // Add target group to the HTTPS listener
    httpsListener.addTargets('HttpsWebTarget', {
      port: 5001,
      protocol: elbv2.ApplicationProtocol.HTTP,
      targets: [this.asg], // You'll need to make asg a class property
      healthCheck: {
        path: '/api/health',
        interval: cdk.Duration.seconds(30),
        timeout: cdk.Duration.seconds(5),
        healthyThresholdCount: 2,
        unhealthyThresholdCount: 5,
      }
    });
    
    // Add a redirect from HTTP to HTTPS (optional but recommended)
    this.httpListener.addAction('HttpToHttpsRedirect', {
      action: elbv2.ListenerAction.redirect({
        protocol: 'HTTPS',
        port: '443',
        permanent: true
      })
    });
  }
}
```

## 3. Make ASG a Class Property

Update the ASG definition to make it a class property:

```typescript
export class WebAppStack extends cdk.Stack {
  public readonly loadBalancer: elbv2.ApplicationLoadBalancer;
  public readonly webSecurityGroup: ec2.SecurityGroup;
  public readonly asg: autoscaling.AutoScalingGroup; // Add this line
  
  // ... rest of the code ...
  
  // When creating the ASG:
  this.asg = new autoscaling.AutoScalingGroup(this, 'WebServerASG', {
    // ... same parameters as before ...
  });
}
```

## 4. Deploy the Updates

After making these changes, you can deploy the updates:

```bash
cd infrastructure
cdk deploy --all
```

This will:
1. Deploy the DNS stack with the certificate
2. Deploy the WebApp stack with the HTTPS listener
3. Set up HTTP to HTTPS redirection

## Note on Deployment Process

You may need to deploy this in two steps:

1. First deploy the DnsStack to create the certificate
2. Then deploy the WebAppStack to add the HTTPS listener

This is because the certificate needs to be validated first, which can take a few minutes.
