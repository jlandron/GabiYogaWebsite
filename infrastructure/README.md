# GabiYoga Infrastructure Guide

This directory contains AWS CDK (Cloud Development Kit) code for deploying the infrastructure for the Gabi Yoga website.

## Components

The infrastructure consists of several stacks:

1. **GabiYogaNetwork**: VPC and networking components
2. **GabiYogaStorage**: S3 bucket and CloudFront distribution
3. **GabiYogaDatabase**: RDS MySQL database
4. **GabiYogaWebApp**: EC2 instances with Auto Scaling and Load Balancer
5. **GabiYogaDns**: Route53 hosted zone and DNS records

## Deployment Instructions

### Prerequisites

- AWS CLI configured with appropriate credentials
- Node.js and npm installed
- AWS CDK installed (`npm install -g aws-cdk`)

### Steps

1. Install dependencies:
   ```
   npm install
   ```

2. Deploy the stacks:
   ```
   cdk deploy --all
   ```

3. For individual stack deployment:
   ```
   cdk deploy GabiYogaNetwork
   cdk deploy GabiYogaStorage
   cdk deploy GabiYogaDatabase
   cdk deploy GabiYogaWebApp
   cdk deploy GabiYogaDns
   ```

## DNS Configuration Steps

### IMPORTANT: Duplicate Hosted Zones Issue

We've identified that there are two hosted zones for the same domain name "gabi.yoga":

1. **Registrar-created zone** (Z0858162FM97J2FO2QJU):
   - Created by the Route53 domain registrar
   - Has nameservers:
     - ns-1840.awsdns-38.co.uk
     - ns-1021.awsdns-63.net
     - ns-472.awsdns-59.com
     - ns-1408.awsdns-48.org

2. **CDK-created zone** (Z014284916RF6IYZT6XTQ):
   - Created by the GabiYogaDns stack
   - Has nameservers:
     - ns-1446.awsdns-52.org
     - ns-56.awsdns-07.com
     - ns-689.awsdns-22.net
     - ns-1636.awsdns-12.co.uk

Having two hosted zones for the same domain will cause DNS issues. Here's how to resolve this:

1. **Determine which zone to keep**:
   - The registrar-created zone (recommended if domain was registered through Route53)
   - OR the CDK-created zone (if you prefer to use this one)

2. **Delete the unused hosted zone**:
   ```
   # To delete the CDK-created zone (recommended)
   aws route53 delete-hosted-zone --id Z014284916RF6IYZT6XTQ

   # OR to delete the registrar-created zone
   aws route53 delete-hosted-zone --id Z0858162FM97J2FO2QJU
   ```

3. **Update the CDK code** to use the existing hosted zone:
   - Modify `infrastructure/lib/dns-stack.ts` to import the existing hosted zone rather than creating a new one:
   ```typescript
   // Replace the hosted zone creation with:
   this.hostedZone = route53.HostedZone.fromHostedZoneAttributes(this, 'ImportedHostedZone', {
     zoneName: props.domainName,
     hostedZoneId: 'Z0858162FM97J2FO2QJU', // Use the ID of the zone you want to keep
   });
   ```

### DNS Configuration After Resolving Duplicate Zones

Once you've resolved the duplicate zones issue, follow these steps:

1. **Get the Hosted Zone ID and Nameservers**:
   ```
   aws route53 get-hosted-zone --id Z0858162FM97J2FO2QJU --query "DelegationSet.NameServers" --output text
   ```

2. **Domain Registration** (if not already registered):
   ```
   # Create contact information JSON
   CONTACT='{
     "FirstName": "Your-First-Name",
     "LastName": "Your-Last-Name",
     "ContactType": "PERSON",
     "OrganizationName": "Gabi Yoga",
     "AddressLine1": "Your Address",
     "City": "Your City",
     "State": "Your State",
     "CountryCode": "US",
     "ZipCode": "Your ZIP",
     "PhoneNumber": "+1.1234567890",
     "Email": "your-email@example.com"
   }'

   # Register the domain - IMPORTANT: This must run in us-east-1 region
   aws --region us-east-1 route53domains register-domain \
       --domain-name gabi.yoga \
       --admin-contact "$CONTACT" \
       --registrant-contact "$CONTACT" \
       --tech-contact "$CONTACT" \
       --duration-in-years 1 \
       --auto-renew
   ```

3. **Update Nameservers** (if registered elsewhere):
   Use the nameservers from step 1 to configure at your domain registrar.

4. **Create/Update DNS Records**:
   ```
   # Use correct hosted zone ID
   aws route53 change-resource-record-sets \
        --hosted-zone-id Z0858162FM97J2FO2QJU \
        --change-batch '{
          "Changes": [{
            "Action": "CREATE",
            "ResourceRecordSet": {
              "Name": "www.gabi.yoga",
              "Type": "CNAME",
              "TTL": 300,
              "ResourceRecords": [{
                "Value": "gabi.yoga"
              }]
            }
          }]
        }'
   ```

5. **Validate ACM Certificate**:
   If your certificate is in the other hosted zone, you'll need to create new validation records:
   ```
   aws acm describe-certificate --certificate-arn <CERTIFICATE_ARN> --query "Certificate.DomainValidationOptions[].ResourceRecord"
   ```

   Then create those records in your chosen hosted zone.

6. **Add HTTPS Listener to Load Balancer**:
   This might require updating the WebAppStack to include an HTTPS listener using the certificate.

## Important Notes

- Having two hosted zones for the same domain causes DNS resolution issues and certificate validation problems.
- After cleaning up the duplicate hosted zone, DNS propagation can take 24-48 hours to complete globally.
- The AdminCDKUser IAM user needs appropriate Route53 permissions to manage DNS records.
- If using the registrar-created hosted zone, you may need to request a new ACM certificate or move the validation records.
