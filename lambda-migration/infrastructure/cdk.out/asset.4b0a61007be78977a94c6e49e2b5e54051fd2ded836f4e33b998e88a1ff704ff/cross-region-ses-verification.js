"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const AWS = __importStar(require("aws-sdk"));
/**
 * This Lambda function handles cross-region SES domain verification
 * It's used when the SES domain is verified in one region (us-west-2)
 * but needs to be used in another region (us-east-1)
 */
async function handler(event) {
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
    }
    catch (error) {
        console.error('Error:', error);
        response.Status = 'FAILED';
        response.Reason = error.message || 'Unknown error occurred';
    }
    console.log('Response:', JSON.stringify(response, null, 2));
    return response;
}
exports.handler = handler;
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
    // Get the mail from domain status if needed in the future
    // const mailFromStatus = mailFromAttrs.MailFromDomainAttributes[domainName]?.MailFromDomainStatus;
    if (mailFromDomain) {
        await targetSES.setIdentityMailFromDomain({
            Identity: domainName,
            MailFromDomain: mailFromDomain,
            BehaviorOnMXFailure: 'UseDefaultValue'
        }).promise();
        console.log(`MAIL FROM domain set to ${mailFromDomain} for ${domainName} in target region`);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY3Jvc3MtcmVnaW9uLXNlcy12ZXJpZmljYXRpb24uanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJjcm9zcy1yZWdpb24tc2VzLXZlcmlmaWNhdGlvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLDZDQUErQjtBQWlDL0I7Ozs7R0FJRztBQUNJLEtBQUssVUFBVSxPQUFPLENBQUMsS0FBd0M7SUFDcEUsT0FBTyxDQUFDLEdBQUcsQ0FBQyxRQUFRLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxLQUFLLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFFdEQsTUFBTSxFQUFFLFVBQVUsRUFBRSxZQUFZLEVBQUUsWUFBWSxFQUFFLEdBQUcsS0FBSyxDQUFDLGtCQUFrQixDQUFDO0lBRTVFLHVCQUF1QjtJQUN2QixNQUFNLFFBQVEsR0FBeUM7UUFDckQsTUFBTSxFQUFFLFNBQVM7UUFDakIsa0JBQWtCLEVBQUUsR0FBRyxVQUFVLElBQUksWUFBWSxFQUFFO1FBQ25ELE9BQU8sRUFBRSxLQUFLLENBQUMsT0FBTztRQUN0QixTQUFTLEVBQUUsS0FBSyxDQUFDLFNBQVM7UUFDMUIsaUJBQWlCLEVBQUUsS0FBSyxDQUFDLGlCQUFpQjtRQUMxQyxJQUFJLEVBQUUsRUFBRTtLQUNULENBQUM7SUFFRixJQUFJO1FBQ0YsNkNBQTZDO1FBQzdDLFFBQVEsS0FBSyxDQUFDLFdBQVcsRUFBRTtZQUN6QixLQUFLLFFBQVEsQ0FBQztZQUNkLEtBQUssUUFBUTtnQkFDWCxNQUFNLGlCQUFpQixDQUFDLFVBQVUsRUFBRSxZQUFZLEVBQUUsWUFBWSxDQUFDLENBQUM7Z0JBQ2hFLE1BQU07WUFFUixLQUFLLFFBQVE7Z0JBQ1gsK0NBQStDO2dCQUMvQyxrRUFBa0U7Z0JBQ2xFLE9BQU8sQ0FBQyxHQUFHLENBQUMsd0JBQXdCLFVBQVUsT0FBTyxZQUFZLG9CQUFvQixDQUFDLENBQUM7Z0JBQ3ZGLE1BQU07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LEVBQUUsV0FBVyxJQUFJLEtBQUssQ0FBQztJQUVyRixJQUFJLGlCQUFpQixFQUFFO1FBQ3JCLE1BQU0sU0FBUyxDQUFDLHNCQUFzQixDQUFDO1lBQ3JDLFFBQVEsRUFBRSxVQUFVO1lBQ3BCLFdBQVcsRUFBRSxJQUFJO1NBQ2xCLENBQUMsQ0FBQyxPQUFPLEVBQUUsQ0FBQztRQUNiLE9BQU8sQ0FBQyxHQUFHLENBQUMsb0JBQW9CLFVBQVUsbUJBQW1CLENBQUMsQ0FBQztLQUNoRTtBQUNILENBQUM7QUFFRDs7R0FFRztBQUNILEtBQUssVUFBVSxrQkFBa0IsQ0FDL0IsVUFBa0IsRUFDbEIsU0FBa0IsRUFDbEIsU0FBa0I7SUFFbEIsTUFBTSxhQUFhLEdBQUcsTUFBTSxTQUFTLENBQUMsbUNBQW1DLENBQUM7UUFDeEUsVUFBVSxFQUFFLENBQUMsVUFBVSxDQUFDO0tBQ3pCLENBQUMsQ0FBQyxPQUFPLEVBQUUsQ0FBQztJQUViLE1BQU0sY0FBYyxHQUFHLGFBQWEsQ0FBQyx3QkFBd0IsQ0FBQyxVQUFVLENBQUMsRUFBRSxjQUFjLENBQUM7SUFDMUYsMERBQTBEO0lBQzFELG1HQUFtRztJQUVuRyxJQUFJLGNBQWMsRUFBRTtRQUNsQixNQUFNLFNBQVMsQ0FBQyx5QkFBeUIsQ0FBQztZQUN4QyxRQUFRLEVBQUUsVUFBVTtZQUNwQixjQUFjLEVBQUUsY0FBYztZQUM5QixtQkFBbUIsRUFBRSxpQkFBaUI7U0FDdkMsQ0FBQyxDQUFDLE9BQU8sRUFBRSxDQUFDO1FBQ2IsT0FBTyxDQUFDLEdBQUcsQ0FBQywyQkFBMkIsY0FBYyxRQUFRLFVBQVUsbUJBQW1CLENBQUMsQ0FBQztLQUM3RjtBQUNILENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyBBV1MgZnJvbSAnYXdzLXNkayc7XG5cbi8vIERlZmluZSB0aGUgQ2xvdWRGb3JtYXRpb24gZXZlbnQgYW5kIHJlc3BvbnNlIHR5cGVzIHVudGlsIEB0eXBlcy9hd3MtbGFtYmRhIGlzIGluc3RhbGxlZFxuaW50ZXJmYWNlIENsb3VkRm9ybWF0aW9uQ3VzdG9tUmVzb3VyY2VFdmVudCB7XG4gIFJlcXVlc3RUeXBlOiAnQ3JlYXRlJyB8ICdVcGRhdGUnIHwgJ0RlbGV0ZSc7XG4gIFNlcnZpY2VUb2tlbjogc3RyaW5nO1xuICBSZXNwb25zZVVSTDogc3RyaW5nO1xuICBTdGFja0lkOiBzdHJpbmc7XG4gIFJlcXVlc3RJZDogc3RyaW5nO1xuICBMb2dpY2FsUmVzb3VyY2VJZDogc3RyaW5nO1xuICBQaHlzaWNhbFJlc291cmNlSWQ/OiBzdHJpbmc7XG4gIFJlc291cmNlVHlwZTogc3RyaW5nO1xuICBSZXNvdXJjZVByb3BlcnRpZXM6IHtcbiAgICBTZXJ2aWNlVG9rZW46IHN0cmluZztcbiAgICBba2V5OiBzdHJpbmddOiBhbnk7XG4gIH07XG4gIE9sZFJlc291cmNlUHJvcGVydGllcz86IHtcbiAgICBba2V5OiBzdHJpbmddOiBhbnk7XG4gIH07XG59XG5cbmludGVyZmFjZSBDbG91ZEZvcm1hdGlvbkN1c3RvbVJlc291cmNlUmVzcG9uc2Uge1xuICBTdGF0dXM6ICdTVUNDRVNTJyB8ICdGQUlMRUQnO1xuICBSZWFzb24/OiBzdHJpbmc7XG4gIFBoeXNpY2FsUmVzb3VyY2VJZDogc3RyaW5nO1xuICBTdGFja0lkOiBzdHJpbmc7XG4gIFJlcXVlc3RJZDogc3RyaW5nO1xuICBMb2dpY2FsUmVzb3VyY2VJZDogc3RyaW5nO1xuICBEYXRhPzoge1xuICAgIFtrZXk6IHN0cmluZ106IGFueTtcbiAgfTtcbn1cblxuLyoqXG4gKiBUaGlzIExhbWJkYSBmdW5jdGlvbiBoYW5kbGVzIGNyb3NzLXJlZ2lvbiBTRVMgZG9tYWluIHZlcmlmaWNhdGlvblxuICogSXQncyB1c2VkIHdoZW4gdGhlIFNFUyBkb21haW4gaXMgdmVyaWZpZWQgaW4gb25lIHJlZ2lvbiAodXMtd2VzdC0yKVxuICogYnV0IG5lZWRzIHRvIGJlIHVzZWQgaW4gYW5vdGhlciByZWdpb24gKHVzLWVhc3QtMSlcbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGhhbmRsZXIoZXZlbnQ6IENsb3VkRm9ybWF0aW9uQ3VzdG9tUmVzb3VyY2VFdmVudCk6IFByb21pc2U8Q2xvdWRGb3JtYXRpb25DdXN0b21SZXNvdXJjZVJlc3BvbnNlPiB7XG4gIGNvbnNvbGUubG9nKCdFdmVudDonLCBKU09OLnN0cmluZ2lmeShldmVudCwgbnVsbCwgMikpO1xuICBcbiAgY29uc3QgeyBEb21haW5OYW1lLCBTb3VyY2VSZWdpb24sIFRhcmdldFJlZ2lvbiB9ID0gZXZlbnQuUmVzb3VyY2VQcm9wZXJ0aWVzO1xuICBcbiAgLy8gUmVzcG9uc2UgcHJlcGFyYXRpb25cbiAgY29uc3QgcmVzcG9uc2U6IENsb3VkRm9ybWF0aW9uQ3VzdG9tUmVzb3VyY2VSZXNwb25zZSA9IHtcbiAgICBTdGF0dXM6ICdTVUNDRVNTJyxcbiAgICBQaHlzaWNhbFJlc291cmNlSWQ6IGAke0RvbWFpbk5hbWV9LSR7VGFyZ2V0UmVnaW9ufWAsXG4gICAgU3RhY2tJZDogZXZlbnQuU3RhY2tJZCxcbiAgICBSZXF1ZXN0SWQ6IGV2ZW50LlJlcXVlc3RJZCxcbiAgICBMb2dpY2FsUmVzb3VyY2VJZDogZXZlbnQuTG9naWNhbFJlc291cmNlSWQsXG4gICAgRGF0YToge30sXG4gIH07XG5cbiAgdHJ5IHtcbiAgICAvLyBIYW5kbGUgZGlmZmVyZW50IENsb3VkRm9ybWF0aW9uIG9wZXJhdGlvbnNcbiAgICBzd2l0Y2ggKGV2ZW50LlJlcXVlc3RUeXBlKSB7XG4gICAgICBjYXNlICdDcmVhdGUnOlxuICAgICAgY2FzZSAnVXBkYXRlJzpcbiAgICAgICAgYXdhaXQgdmVyaWZ5Q3Jvc3NSZWdpb24oRG9tYWluTmFtZSwgU291cmNlUmVnaW9uLCBUYXJnZXRSZWdpb24pO1xuICAgICAgICBicmVhaztcbiAgICAgICAgXG4gICAgICBjYXNlICdEZWxldGUnOlxuICAgICAgICAvLyBXZSBkb24ndCBuZWVkIHRvIGRvIGFueSBjbGVhbnVwIGZvciBkZWxldGlvblxuICAgICAgICAvLyBTRVMgZG9tYWluIGlkZW50aXRpZXMgd2lsbCBiZSByZW1vdmVkIHdoZW4gdGhlIHN0YWNrIGlzIGRlbGV0ZWRcbiAgICAgICAgY29uc29sZS5sb2coYERlbGV0aW9uIHJlcXVlc3QgZm9yICR7RG9tYWluTmFtZX0gaW4gJHtUYXJnZXRSZWdpb259LCBubyBhY3Rpb24gbmVlZGVkYCk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgICBcbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgVW5zdXBwb3J0ZWQgcmVxdWVzdCB0eXBlOiAke2V2ZW50LlJlcXVlc3RUeXBlfWApO1xuICAgIH1cbiAgfSBjYXRjaCAoZXJyb3I6IGFueSkge1xuICAgIGNvbnNvbGUuZXJyb3IoJ0Vycm9yOicsIGVycm9yKTtcbiAgICByZXNwb25zZS5TdGF0dXMgPSAnRkFJTEVEJztcbiAgICByZXNwb25zZS5SZWFzb24gPSBlcnJvci5tZXNzYWdlIHx8ICdVbmtub3duIGVycm9yIG9jY3VycmVkJztcbiAgfVxuXG4gIGNvbnNvbGUubG9nKCdSZXNwb25zZTonLCBKU09OLnN0cmluZ2lmeShyZXNwb25zZSwgbnVsbCwgMikpO1xuICByZXR1cm4gcmVzcG9uc2U7XG59XG5cbi8qKlxuICogVmVyaWZpZXMgYSBkb21haW4gaW4gdGhlIHRhcmdldCByZWdpb24gYmFzZWQgb24gdmVyaWZpY2F0aW9uIHNldHRpbmdzIGluIHRoZSBzb3VyY2UgcmVnaW9uXG4gKi9cbmFzeW5jIGZ1bmN0aW9uIHZlcmlmeUNyb3NzUmVnaW9uKGRvbWFpbk5hbWU6IHN0cmluZywgc291cmNlUmVnaW9uOiBzdHJpbmcsIHRhcmdldFJlZ2lvbjogc3RyaW5nKTogUHJvbWlzZTx2b2lkPiB7XG4gIGNvbnNvbGUubG9nKGBWZXJpZnlpbmcgZG9tYWluICR7ZG9tYWluTmFtZX0gaW4gJHt0YXJnZXRSZWdpb259IGJhc2VkIG9uIHNldHRpbmdzIGluICR7c291cmNlUmVnaW9ufWApO1xuICBcbiAgLy8gQ3JlYXRlIFNFUyBjbGllbnRzIGZvciBib3RoIHJlZ2lvbnNcbiAgY29uc3Qgc291cmNlU0VTID0gbmV3IEFXUy5TRVMoeyByZWdpb246IHNvdXJjZVJlZ2lvbiB9KTtcbiAgY29uc3QgdGFyZ2V0U0VTID0gbmV3IEFXUy5TRVMoeyByZWdpb246IHRhcmdldFJlZ2lvbiB9KTtcblxuICAvLyBHZXQgdmVyaWZpY2F0aW9uIHNldHRpbmdzIGZyb20gc291cmNlIHJlZ2lvblxuICBjb25zdCB2ZXJpZmljYXRpb25BdHRycyA9IGF3YWl0IHNvdXJjZVNFUy5nZXRJZGVudGl0eVZlcmlmaWNhdGlvbkF0dHJpYnV0ZXMoe1xuICAgIElkZW50aXRpZXM6IFtkb21haW5OYW1lXVxuICB9KS5wcm9taXNlKCk7XG4gIFxuICBjb25zdCBkb21haW5BdHRycyA9IHZlcmlmaWNhdGlvbkF0dHJzLlZlcmlmaWNhdGlvbkF0dHJpYnV0ZXNbZG9tYWluTmFtZV07XG4gIFxuICBpZiAoIWRvbWFpbkF0dHJzIHx8IGRvbWFpbkF0dHJzLlZlcmlmaWNhdGlvblN0YXR1cyAhPT0gJ1N1Y2Nlc3MnKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBEb21haW4gJHtkb21haW5OYW1lfSBpcyBub3QgdmVyaWZpZWQgaW4gdGhlIHNvdXJjZSByZWdpb24gJHtzb3VyY2VSZWdpb259YCk7XG4gIH1cblxuICAvLyBWZXJpZnkgdGhlIGRvbWFpbiBleGlzdHMgaW4gdGhlIHRhcmdldCByZWdpb25cbiAgY29uc3QgaWRlbnRpdGllcyA9IGF3YWl0IHRhcmdldFNFUy5saXN0SWRlbnRpdGllcyh7XG4gICAgSWRlbnRpdHlUeXBlOiAnRG9tYWluJ1xuICB9KS5wcm9taXNlKCk7XG4gIFxuICBpZiAoIWlkZW50aXRpZXMuSWRlbnRpdGllcy5pbmNsdWRlcyhkb21haW5OYW1lKSkge1xuICAgIC8vIElmIGRvbWFpbiBkb2Vzbid0IGV4aXN0IGluIHRhcmdldCByZWdpb24sIHZlcmlmeSBpdFxuICAgIGNvbnNvbGUubG9nKGBEb21haW4gJHtkb21haW5OYW1lfSBub3QgZm91bmQgaW4gdGFyZ2V0IHJlZ2lvbiAke3RhcmdldFJlZ2lvbn0sIHZlcmlmeWluZyBpdGApO1xuICAgIGF3YWl0IHRhcmdldFNFUy52ZXJpZnlEb21haW5JZGVudGl0eSh7XG4gICAgICBEb21haW46IGRvbWFpbk5hbWVcbiAgICB9KS5wcm9taXNlKCk7XG4gIH1cblxuICAvLyBWZXJpZnkgREtJTSBzZXR0aW5nc1xuICBhd2FpdCBzeW5jRGtpbVNldHRpbmdzKGRvbWFpbk5hbWUsIHNvdXJjZVNFUywgdGFyZ2V0U0VTKTtcbiAgXG4gIC8vIFZlcmlmeSBNQUlMIEZST00gZG9tYWluIHNldHRpbmdzXG4gIGF3YWl0IHN5bmNNYWlsRnJvbURvbWFpbihkb21haW5OYW1lLCBzb3VyY2VTRVMsIHRhcmdldFNFUyk7XG4gIFxuICBjb25zb2xlLmxvZyhgU3VjY2Vzc2Z1bGx5IHZlcmlmaWVkIGRvbWFpbiAke2RvbWFpbk5hbWV9IGluICR7dGFyZ2V0UmVnaW9ufWApO1xufVxuXG4vKipcbiAqIFN5bmNzIERLSU0gc2V0dGluZ3MgZnJvbSBzb3VyY2UgdG8gdGFyZ2V0IHJlZ2lvblxuICovXG5hc3luYyBmdW5jdGlvbiBzeW5jRGtpbVNldHRpbmdzKFxuICBkb21haW5OYW1lOiBzdHJpbmcsIFxuICBzb3VyY2VTRVM6IEFXUy5TRVMsIFxuICB0YXJnZXRTRVM6IEFXUy5TRVNcbik6IFByb21pc2U8dm9pZD4ge1xuICBjb25zdCBka2ltQXR0cnMgPSBhd2FpdCBzb3VyY2VTRVMuZ2V0SWRlbnRpdHlEa2ltQXR0cmlidXRlcyh7XG4gICAgSWRlbnRpdGllczogW2RvbWFpbk5hbWVdXG4gIH0pLnByb21pc2UoKTtcbiAgXG4gIGNvbnN0IHNvdXJjZURraW1FbmFibGVkID0gZGtpbUF0dHJzLkRraW1BdHRyaWJ1dGVzW2RvbWFpbk5hbWVdPy5Ea2ltRW5hYmxlZCB8fCBmYWxzZTtcbiAgXG4gIGlmIChzb3VyY2VEa2ltRW5hYmxlZCkge1xuICAgIGF3YWl0IHRhcmdldFNFUy5zZXRJZGVudGl0eURraW1FbmFibGVkKHtcbiAgICAgIElkZW50aXR5OiBkb21haW5OYW1lLFxuICAgICAgRGtpbUVuYWJsZWQ6IHRydWVcbiAgICB9KS5wcm9taXNlKCk7XG4gICAgY29uc29sZS5sb2coYERLSU0gZW5hYmxlZCBmb3IgJHtkb21haW5OYW1lfSBpbiB0YXJnZXQgcmVnaW9uYCk7XG4gIH1cbn1cblxuLyoqXG4gKiBTeW5jcyBNQUlMIEZST00gZG9tYWluIHNldHRpbmdzIGZyb20gc291cmNlIHRvIHRhcmdldCByZWdpb25cbiAqL1xuYXN5bmMgZnVuY3Rpb24gc3luY01haWxGcm9tRG9tYWluKFxuICBkb21haW5OYW1lOiBzdHJpbmcsIFxuICBzb3VyY2VTRVM6IEFXUy5TRVMsIFxuICB0YXJnZXRTRVM6IEFXUy5TRVNcbik6IFByb21pc2U8dm9pZD4ge1xuICBjb25zdCBtYWlsRnJvbUF0dHJzID0gYXdhaXQgc291cmNlU0VTLmdldElkZW50aXR5TWFpbEZyb21Eb21haW5BdHRyaWJ1dGVzKHtcbiAgICBJZGVudGl0aWVzOiBbZG9tYWluTmFtZV1cbiAgfSkucHJvbWlzZSgpO1xuICBcbiAgY29uc3QgbWFpbEZyb21Eb21haW4gPSBtYWlsRnJvbUF0dHJzLk1haWxGcm9tRG9tYWluQXR0cmlidXRlc1tkb21haW5OYW1lXT8uTWFpbEZyb21Eb21haW47XG4gIC8vIEdldCB0aGUgbWFpbCBmcm9tIGRvbWFpbiBzdGF0dXMgaWYgbmVlZGVkIGluIHRoZSBmdXR1cmVcbiAgLy8gY29uc3QgbWFpbEZyb21TdGF0dXMgPSBtYWlsRnJvbUF0dHJzLk1haWxGcm9tRG9tYWluQXR0cmlidXRlc1tkb21haW5OYW1lXT8uTWFpbEZyb21Eb21haW5TdGF0dXM7XG4gIFxuICBpZiAobWFpbEZyb21Eb21haW4pIHtcbiAgICBhd2FpdCB0YXJnZXRTRVMuc2V0SWRlbnRpdHlNYWlsRnJvbURvbWFpbih7XG4gICAgICBJZGVudGl0eTogZG9tYWluTmFtZSxcbiAgICAgIE1haWxGcm9tRG9tYWluOiBtYWlsRnJvbURvbWFpbixcbiAgICAgIEJlaGF2aW9yT25NWEZhaWx1cmU6ICdVc2VEZWZhdWx0VmFsdWUnXG4gICAgfSkucHJvbWlzZSgpO1xuICAgIGNvbnNvbGUubG9nKGBNQUlMIEZST00gZG9tYWluIHNldCB0byAke21haWxGcm9tRG9tYWlufSBmb3IgJHtkb21haW5OYW1lfSBpbiB0YXJnZXQgcmVnaW9uYCk7XG4gIH1cbn1cbiJdfQ==