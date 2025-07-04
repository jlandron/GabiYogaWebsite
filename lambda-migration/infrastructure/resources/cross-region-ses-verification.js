"use strict";

const AWS = require('aws-sdk');

/**
 * This Lambda function handles cross-region SES domain verification
 * It's used when the SES domain is verified in one region (us-west-2)
 * but needs to be used in another region (us-east-1)
 */
exports.handler = async function(event) {
  console.log('Event:', JSON.stringify(event, null, 2));
  
  const { DomainName, SourceRegion, TargetRegion } = event.ResourceProperties;
  
  // Response preparation
  const response = {
    Status: 'SUCCESS',
    PhysicalResourceId: `${DomainName}-${TargetRegion}`,
    StackId: event.StackId,
    RequestId: event.RequestId,
    LogicalResourceId: event.LogicalResourceId,
    Data: {},
  };

  try {
    // Handle different CloudFormation operations
    switch (event.RequestType) {
      case 'Create':
      case 'Update':
        await verifyCrossRegion(DomainName, SourceRegion, TargetRegion);
        break;
        
      case 'Delete':
        // We don't need to do any cleanup for deletion
        // SES domain identities will be removed when the stack is deleted
        console.log(`Deletion request for ${DomainName} in ${TargetRegion}, no action needed`);
        break;
        
      default:
        throw new Error(`Unsupported request type: ${event.RequestType}`);
    }
  } catch (error) {
    console.error('Error:', error);
    response.Status = 'FAILED';
    response.Reason = error.message || 'Unknown error occurred';
  }

  console.log('Response:', JSON.stringify(response, null, 2));
  return response;
};

/**
 * Verifies a domain in the target region based on verification settings in the source region
 */
async function verifyCrossRegion(domainName, sourceRegion, targetRegion) {
  console.log(`Verifying domain ${domainName} in ${targetRegion} based on settings in ${sourceRegion}`);
  
  // Create SES clients for both regions
  const sourceSES = new AWS.SES({ region: sourceRegion });
  const targetSES = new AWS.SES({ region: targetRegion });

  // Get verification settings from source region
  const verificationAttrs = await sourceSES.getIdentityVerificationAttributes({
    Identities: [domainName]
  }).promise();
  
  const domainAttrs = verificationAttrs.VerificationAttributes[domainName];
  
  if (!domainAttrs || domainAttrs.VerificationStatus !== 'Success') {
    throw new Error(`Domain ${domainName} is not verified in the source region ${sourceRegion}`);
  }

  // Verify the domain exists in the target region
  const identities = await targetSES.listIdentities({
    IdentityType: 'Domain'
  }).promise();
  
  if (!identities.Identities.includes(domainName)) {
    // If domain doesn't exist in target region, verify it
    console.log(`Domain ${domainName} not found in target region ${targetRegion}, verifying it`);
    await targetSES.verifyDomainIdentity({
      Domain: domainName
    }).promise();
  }

  // Verify DKIM settings
  await syncDkimSettings(domainName, sourceSES, targetSES);
  
  // Verify MAIL FROM domain settings
  await syncMailFromDomain(domainName, sourceSES, targetSES);
  
  console.log(`Successfully verified domain ${domainName} in ${targetRegion}`);
}

/**
 * Syncs DKIM settings from source to target region
 */
async function syncDkimSettings(domainName, sourceSES, targetSES) {
  const dkimAttrs = await sourceSES.getIdentityDkimAttributes({
    Identities: [domainName]
  }).promise();
  
  const sourceDkimEnabled = dkimAttrs.DkimAttributes[domainName]?.DkimEnabled || false;
  
  if (sourceDkimEnabled) {
    await targetSES.setIdentityDkimEnabled({
      Identity: domainName,
      DkimEnabled: true
    }).promise();
    console.log(`DKIM enabled for ${domainName} in target region`);
  }
}

/**
 * Syncs MAIL FROM domain settings from source to target region
 */
async function syncMailFromDomain(domainName, sourceSES, targetSES) {
  const mailFromAttrs = await sourceSES.getIdentityMailFromDomainAttributes({
    Identities: [domainName]
  }).promise();
  
  const mailFromDomain = mailFromAttrs.MailFromDomainAttributes[domainName]?.MailFromDomain;
  const mailFromPolicy = mailFromAttrs.MailFromDomainAttributes[domainName]?.MailFromDomainStatus;
  
  if (mailFromDomain) {
    await targetSES.setIdentityMailFromDomain({
      Identity: domainName,
      MailFromDomain: mailFromDomain,
      BehaviorOnMXFailure: 'UseDefaultValue'
    }).promise();
    console.log(`MAIL FROM domain set to ${mailFromDomain} for ${domainName} in target region`);
  }
}
