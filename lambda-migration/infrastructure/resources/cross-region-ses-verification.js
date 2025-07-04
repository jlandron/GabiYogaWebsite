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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY3Jvc3MtcmVnaW9uLXNlcy12ZXJpZmljYXRpb24uanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJjcm9zcy1yZWdpb24tc2VzLXZlcmlmaWNhdGlvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLDZDQUErQjtBQWlDL0I7Ozs7R0FJRztBQUNJLEtBQUssVUFBVSxPQUFPLENBQUMsS0FBd0M7SUFDcEUsT0FBTyxDQUFDLEdBQUcsQ0FBQyxRQUFRLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxLQUFLLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFFdEQsTUFBTSxFQUFFLFVBQVUsRUFBRSxZQUFZLEVBQUUsWUFBWSxFQUFFLEdBQUcsS0FBSyxDQUFDLGtCQUFrQixDQUFDO0lBRTVFLHVCQUF1QjtJQUN2QixNQUFNLFFBQVEsR0FBeUM7UUFDckQsTUFBTSxFQUFFLFNBQVM7UUFDakIsa0JBQWtCLEVBQUUsR0FBRyxVQUFVLElBQUksWUFBWSxFQUFFO1FBQ25ELE9BQU8sRUFBRSxLQUFLLENBQUMsT0FBTztRQUN0QixTQUFTLEVBQUUsS0FBSyxDQUFDLFNBQVM7UUFDMUIsaUJBQWlCLEVBQUUsS0FBSyxDQUFDLGlCQUFpQjtRQUMxQyxJQUFJLEVBQUUsRUFBRTtLQUNULENBQUM7SUFFRixJQUFJO1FBQ0YsNkNBQTZDO1FBQzdDLFFBQVEsS0FBSyxDQUFDLFdBQVcsRUFBRTtZQUN6QixLQUFLLFFBQVEsQ0FBQztZQUNkLEtBQUssUUFBUTtnQkFDWCxNQUFNLGlCQUFpQixDQUFDLFVBQVUsRUFBRSxZQUFZLEVBQUUsWUFBWSxDQUFDLENBQUM7Z0JBQ2hFLE1BQU07WUFFUixLQUFLLFFBQVE7Z0JBQ1gsK0NBQStDO2dCQUMvQyxrRUFBa0U7Z0JBQ2xFLE9BQU8sQ0FBQyxHQUFHLENBQUMsd0JBQXdCLFVBQVUsT0FBTyxZQUFZLG9CQUFvQixDQUFDLENBQUM7Z0JBQ3ZGLE1BQU07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LEVBQUUsV0FBVyxJQUFJLEtBQUssQ0FBQztJQUVyRixJQUFJLGlCQUFpQixFQUFFO1FBQ3JCLE1BQU0sU0FBUyxDQUFDLHNCQUFzQixDQUFDO1lBQ3JDLFFBQVEsRUFBRSxVQUFVO1lBQ3BCLFdBQVcsRUFBRSxJQUFJO1NBQ2xCLENBQUMsQ0FBQyxPQUFPLEVBQUUsQ0FBQztRQUNiLE9BQU8sQ0FBQyxHQUFHLENBQUMsb0JBQW9CLFVBQVUsbUJBQW1CLENBQUMsQ0FBQztLQUNoRTtBQUNILENBQUM7QUFFRDs7R0FFRztBQUNILEtBQUssVUFBVSxrQkFBa0IsQ0FDL0IsVUFBa0IsRUFDbEIsU0FBa0IsRUFDbEIsU0FBa0I7SUFFbEIsTUFBTSxhQUFhLEdBQUcsTUFBTSxTQUFTLENBQUMsbUNBQW1DLENBQUM7UUFDeEUsVUFBVSxFQUFFLENBQUMsVUFBVSxDQUFDO0tBQ3pCLENBQUMsQ0FBQyxPQUFPLEVBQUUsQ0FBQztJQUViLE1BQU0sY0FBYyxHQUFHLGFBQWEsQ0FBQyx3QkFBd0IsQ0FBQyxVQUFVLENBQUMsRUFBRSxjQUFjLENBQUM7SUFDMUYsTUFBTSxjQUFjLEdBQUcsYUFBYSxDQUFDLHdCQUF3QixDQUFDLFVBQVUsQ0FBQyxFQUFFLG9CQUFvQixDQUFDO0lBRWhHLElBQUksY0FBYyxFQUFFO1FBQ2xCLE1BQU0sU0FBUyxDQUFDLHlCQUF5QixDQUFDO1lBQ3hDLFFBQVEsRUFBRSxVQUFVO1lBQ3BCLGNBQWMsRUFBRSxjQUFjO1lBQzlCLG1CQUFtQixFQUFFLGlCQUFpQjtTQUN2QyxDQUFDLENBQUMsT0FBTyxFQUFFLENBQUM7UUFDYixPQUFPLENBQUMsR0FBRyxDQUFDLDJCQUEyQixjQUFjLFFBQVEsVUFBVSxtQkFBbUIsQ0FBQyxDQUFDO0tBQzdGO0FBQ0gsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIEFXUyBmcm9tICdhd3Mtc2RrJztcblxuLy8gRGVmaW5lIHRoZSBDbG91ZEZvcm1hdGlvbiBldmVudCBhbmQgcmVzcG9uc2UgdHlwZXMgdW50aWwgQHR5cGVzL2F3cy1sYW1iZGEgaXMgaW5zdGFsbGVkXG5pbnRlcmZhY2UgQ2xvdWRGb3JtYXRpb25DdXN0b21SZXNvdXJjZUV2ZW50IHtcbiAgUmVxdWVzdFR5cGU6ICdDcmVhdGUnIHwgJ1VwZGF0ZScgfCAnRGVsZXRlJztcbiAgU2VydmljZVRva2VuOiBzdHJpbmc7XG4gIFJlc3BvbnNlVVJMOiBzdHJpbmc7XG4gIFN0YWNrSWQ6IHN0cmluZztcbiAgUmVxdWVzdElkOiBzdHJpbmc7XG4gIExvZ2ljYWxSZXNvdXJjZUlkOiBzdHJpbmc7XG4gIFBoeXNpY2FsUmVzb3VyY2VJZD86IHN0cmluZztcbiAgUmVzb3VyY2VUeXBlOiBzdHJpbmc7XG4gIFJlc291cmNlUHJvcGVydGllczoge1xuICAgIFNlcnZpY2VUb2tlbjogc3RyaW5nO1xuICAgIFtrZXk6IHN0cmluZ106IGFueTtcbiAgfTtcbiAgT2xkUmVzb3VyY2VQcm9wZXJ0aWVzPzoge1xuICAgIFtrZXk6IHN0cmluZ106IGFueTtcbiAgfTtcbn1cblxuaW50ZXJmYWNlIENsb3VkRm9ybWF0aW9uQ3VzdG9tUmVzb3VyY2VSZXNwb25zZSB7XG4gIFN0YXR1czogJ1NVQ0NFU1MnIHwgJ0ZBSUxFRCc7XG4gIFJlYXNvbj86IHN0cmluZztcbiAgUGh5c2ljYWxSZXNvdXJjZUlkOiBzdHJpbmc7XG4gIFN0YWNrSWQ6IHN0cmluZztcbiAgUmVxdWVzdElkOiBzdHJpbmc7XG4gIExvZ2ljYWxSZXNvdXJjZUlkOiBzdHJpbmc7XG4gIERhdGE/OiB7XG4gICAgW2tleTogc3RyaW5nXTogYW55O1xuICB9O1xufVxuXG4vKipcbiAqIFRoaXMgTGFtYmRhIGZ1bmN0aW9uIGhhbmRsZXMgY3Jvc3MtcmVnaW9uIFNFUyBkb21haW4gdmVyaWZpY2F0aW9uXG4gKiBJdCdzIHVzZWQgd2hlbiB0aGUgU0VTIGRvbWFpbiBpcyB2ZXJpZmllZCBpbiBvbmUgcmVnaW9uICh1cy13ZXN0LTIpXG4gKiBidXQgbmVlZHMgdG8gYmUgdXNlZCBpbiBhbm90aGVyIHJlZ2lvbiAodXMtZWFzdC0xKVxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gaGFuZGxlcihldmVudDogQ2xvdWRGb3JtYXRpb25DdXN0b21SZXNvdXJjZUV2ZW50KTogUHJvbWlzZTxDbG91ZEZvcm1hdGlvbkN1c3RvbVJlc291cmNlUmVzcG9uc2U+IHtcbiAgY29uc29sZS5sb2coJ0V2ZW50OicsIEpTT04uc3RyaW5naWZ5KGV2ZW50LCBudWxsLCAyKSk7XG4gIFxuICBjb25zdCB7IERvbWFpbk5hbWUsIFNvdXJjZVJlZ2lvbiwgVGFyZ2V0UmVnaW9uIH0gPSBldmVudC5SZXNvdXJjZVByb3BlcnRpZXM7XG4gIFxuICAvLyBSZXNwb25zZSBwcmVwYXJhdGlvblxuICBjb25zdCByZXNwb25zZTogQ2xvdWRGb3JtYXRpb25DdXN0b21SZXNvdXJjZVJlc3BvbnNlID0ge1xuICAgIFN0YXR1czogJ1NVQ0NFU1MnLFxuICAgIFBoeXNpY2FsUmVzb3VyY2VJZDogYCR7RG9tYWluTmFtZX0tJHtUYXJnZXRSZWdpb259YCxcbiAgICBTdGFja0lkOiBldmVudC5TdGFja0lkLFxuICAgIFJlcXVlc3RJZDogZXZlbnQuUmVxdWVzdElkLFxuICAgIExvZ2ljYWxSZXNvdXJjZUlkOiBldmVudC5Mb2dpY2FsUmVzb3VyY2VJZCxcbiAgICBEYXRhOiB7fSxcbiAgfTtcblxuICB0cnkge1xuICAgIC8vIEhhbmRsZSBkaWZmZXJlbnQgQ2xvdWRGb3JtYXRpb24gb3BlcmF0aW9uc1xuICAgIHN3aXRjaCAoZXZlbnQuUmVxdWVzdFR5cGUpIHtcbiAgICAgIGNhc2UgJ0NyZWF0ZSc6XG4gICAgICBjYXNlICdVcGRhdGUnOlxuICAgICAgICBhd2FpdCB2ZXJpZnlDcm9zc1JlZ2lvbihEb21haW5OYW1lLCBTb3VyY2VSZWdpb24sIFRhcmdldFJlZ2lvbik7XG4gICAgICAgIGJyZWFrO1xuICAgICAgICBcbiAgICAgIGNhc2UgJ0RlbGV0ZSc6XG4gICAgICAgIC8vIFdlIGRvbid0IG5lZWQgdG8gZG8gYW55IGNsZWFudXAgZm9yIGRlbGV0aW9uXG4gICAgICAgIC8vIFNFUyBkb21haW4gaWRlbnRpdGllcyB3aWxsIGJlIHJlbW92ZWQgd2hlbiB0aGUgc3RhY2sgaXMgZGVsZXRlZFxuICAgICAgICBjb25zb2xlLmxvZyhgRGVsZXRpb24gcmVxdWVzdCBmb3IgJHtEb21haW5OYW1lfSBpbiAke1RhcmdldFJlZ2lvbn0sIG5vIGFjdGlvbiBuZWVkZWRgKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICAgIFxuICAgICAgZGVmYXVsdDpcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBVbnN1cHBvcnRlZCByZXF1ZXN0IHR5cGU6ICR7ZXZlbnQuUmVxdWVzdFR5cGV9YCk7XG4gICAgfVxuICB9IGNhdGNoIChlcnJvcjogYW55KSB7XG4gICAgY29uc29sZS5lcnJvcignRXJyb3I6JywgZXJyb3IpO1xuICAgIHJlc3BvbnNlLlN0YXR1cyA9ICdGQUlMRUQnO1xuICAgIHJlc3BvbnNlLlJlYXNvbiA9IGVycm9yLm1lc3NhZ2UgfHwgJ1Vua25vd24gZXJyb3Igb2NjdXJyZWQnO1xuICB9XG5cbiAgY29uc29sZS5sb2coJ1Jlc3BvbnNlOicsIEpTT04uc3RyaW5naWZ5KHJlc3BvbnNlLCBudWxsLCAyKSk7XG4gIHJldHVybiByZXNwb25zZTtcbn1cblxuLyoqXG4gKiBWZXJpZmllcyBhIGRvbWFpbiBpbiB0aGUgdGFyZ2V0IHJlZ2lvbiBiYXNlZCBvbiB2ZXJpZmljYXRpb24gc2V0dGluZ3MgaW4gdGhlIHNvdXJjZSByZWdpb25cbiAqL1xuYXN5bmMgZnVuY3Rpb24gdmVyaWZ5Q3Jvc3NSZWdpb24oZG9tYWluTmFtZTogc3RyaW5nLCBzb3VyY2VSZWdpb246IHN0cmluZywgdGFyZ2V0UmVnaW9uOiBzdHJpbmcpOiBQcm9taXNlPHZvaWQ+IHtcbiAgY29uc29sZS5sb2coYFZlcmlmeWluZyBkb21haW4gJHtkb21haW5OYW1lfSBpbiAke3RhcmdldFJlZ2lvbn0gYmFzZWQgb24gc2V0dGluZ3MgaW4gJHtzb3VyY2VSZWdpb259YCk7XG4gIFxuICAvLyBDcmVhdGUgU0VTIGNsaWVudHMgZm9yIGJvdGggcmVnaW9uc1xuICBjb25zdCBzb3VyY2VTRVMgPSBuZXcgQVdTLlNFUyh7IHJlZ2lvbjogc291cmNlUmVnaW9uIH0pO1xuICBjb25zdCB0YXJnZXRTRVMgPSBuZXcgQVdTLlNFUyh7IHJlZ2lvbjogdGFyZ2V0UmVnaW9uIH0pO1xuXG4gIC8vIEdldCB2ZXJpZmljYXRpb24gc2V0dGluZ3MgZnJvbSBzb3VyY2UgcmVnaW9uXG4gIGNvbnN0IHZlcmlmaWNhdGlvbkF0dHJzID0gYXdhaXQgc291cmNlU0VTLmdldElkZW50aXR5VmVyaWZpY2F0aW9uQXR0cmlidXRlcyh7XG4gICAgSWRlbnRpdGllczogW2RvbWFpbk5hbWVdXG4gIH0pLnByb21pc2UoKTtcbiAgXG4gIGNvbnN0IGRvbWFpbkF0dHJzID0gdmVyaWZpY2F0aW9uQXR0cnMuVmVyaWZpY2F0aW9uQXR0cmlidXRlc1tkb21haW5OYW1lXTtcbiAgXG4gIGlmICghZG9tYWluQXR0cnMgfHwgZG9tYWluQXR0cnMuVmVyaWZpY2F0aW9uU3RhdHVzICE9PSAnU3VjY2VzcycpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYERvbWFpbiAke2RvbWFpbk5hbWV9IGlzIG5vdCB2ZXJpZmllZCBpbiB0aGUgc291cmNlIHJlZ2lvbiAke3NvdXJjZVJlZ2lvbn1gKTtcbiAgfVxuXG4gIC8vIFZlcmlmeSB0aGUgZG9tYWluIGV4aXN0cyBpbiB0aGUgdGFyZ2V0IHJlZ2lvblxuICBjb25zdCBpZGVudGl0aWVzID0gYXdhaXQgdGFyZ2V0U0VTLmxpc3RJZGVudGl0aWVzKHtcbiAgICBJZGVudGl0eVR5cGU6ICdEb21haW4nXG4gIH0pLnByb21pc2UoKTtcbiAgXG4gIGlmICghaWRlbnRpdGllcy5JZGVudGl0aWVzLmluY2x1ZGVzKGRvbWFpbk5hbWUpKSB7XG4gICAgLy8gSWYgZG9tYWluIGRvZXNuJ3QgZXhpc3QgaW4gdGFyZ2V0IHJlZ2lvbiwgdmVyaWZ5IGl0XG4gICAgY29uc29sZS5sb2coYERvbWFpbiAke2RvbWFpbk5hbWV9IG5vdCBmb3VuZCBpbiB0YXJnZXQgcmVnaW9uICR7dGFyZ2V0UmVnaW9ufSwgdmVyaWZ5aW5nIGl0YCk7XG4gICAgYXdhaXQgdGFyZ2V0U0VTLnZlcmlmeURvbWFpbklkZW50aXR5KHtcbiAgICAgIERvbWFpbjogZG9tYWluTmFtZVxuICAgIH0pLnByb21pc2UoKTtcbiAgfVxuXG4gIC8vIFZlcmlmeSBES0lNIHNldHRpbmdzXG4gIGF3YWl0IHN5bmNEa2ltU2V0dGluZ3MoZG9tYWluTmFtZSwgc291cmNlU0VTLCB0YXJnZXRTRVMpO1xuICBcbiAgLy8gVmVyaWZ5IE1BSUwgRlJPTSBkb21haW4gc2V0dGluZ3NcbiAgYXdhaXQgc3luY01haWxGcm9tRG9tYWluKGRvbWFpbk5hbWUsIHNvdXJjZVNFUywgdGFyZ2V0U0VTKTtcbiAgXG4gIGNvbnNvbGUubG9nKGBTdWNjZXNzZnVsbHkgdmVyaWZpZWQgZG9tYWluICR7ZG9tYWluTmFtZX0gaW4gJHt0YXJnZXRSZWdpb259YCk7XG59XG5cbi8qKlxuICogU3luY3MgREtJTSBzZXR0aW5ncyBmcm9tIHNvdXJjZSB0byB0YXJnZXQgcmVnaW9uXG4gKi9cbmFzeW5jIGZ1bmN0aW9uIHN5bmNEa2ltU2V0dGluZ3MoXG4gIGRvbWFpbk5hbWU6IHN0cmluZywgXG4gIHNvdXJjZVNFUzogQVdTLlNFUywgXG4gIHRhcmdldFNFUzogQVdTLlNFU1xuKTogUHJvbWlzZTx2b2lkPiB7XG4gIGNvbnN0IGRraW1BdHRycyA9IGF3YWl0IHNvdXJjZVNFUy5nZXRJZGVudGl0eURraW1BdHRyaWJ1dGVzKHtcbiAgICBJZGVudGl0aWVzOiBbZG9tYWluTmFtZV1cbiAgfSkucHJvbWlzZSgpO1xuICBcbiAgY29uc3Qgc291cmNlRGtpbUVuYWJsZWQgPSBka2ltQXR0cnMuRGtpbUF0dHJpYnV0ZXNbZG9tYWluTmFtZV0/LkRraW1FbmFibGVkIHx8IGZhbHNlO1xuICBcbiAgaWYgKHNvdXJjZURraW1FbmFibGVkKSB7XG4gICAgYXdhaXQgdGFyZ2V0U0VTLnNldElkZW50aXR5RGtpbUVuYWJsZWQoe1xuICAgICAgSWRlbnRpdHk6IGRvbWFpbk5hbWUsXG4gICAgICBEa2ltRW5hYmxlZDogdHJ1ZVxuICAgIH0pLnByb21pc2UoKTtcbiAgICBjb25zb2xlLmxvZyhgREtJTSBlbmFibGVkIGZvciAke2RvbWFpbk5hbWV9IGluIHRhcmdldCByZWdpb25gKTtcbiAgfVxufVxuXG4vKipcbiAqIFN5bmNzIE1BSUwgRlJPTSBkb21haW4gc2V0dGluZ3MgZnJvbSBzb3VyY2UgdG8gdGFyZ2V0IHJlZ2lvblxuICovXG5hc3luYyBmdW5jdGlvbiBzeW5jTWFpbEZyb21Eb21haW4oXG4gIGRvbWFpbk5hbWU6IHN0cmluZywgXG4gIHNvdXJjZVNFUzogQVdTLlNFUywgXG4gIHRhcmdldFNFUzogQVdTLlNFU1xuKTogUHJvbWlzZTx2b2lkPiB7XG4gIGNvbnN0IG1haWxGcm9tQXR0cnMgPSBhd2FpdCBzb3VyY2VTRVMuZ2V0SWRlbnRpdHlNYWlsRnJvbURvbWFpbkF0dHJpYnV0ZXMoe1xuICAgIElkZW50aXRpZXM6IFtkb21haW5OYW1lXVxuICB9KS5wcm9taXNlKCk7XG4gIFxuICBjb25zdCBtYWlsRnJvbURvbWFpbiA9IG1haWxGcm9tQXR0cnMuTWFpbEZyb21Eb21haW5BdHRyaWJ1dGVzW2RvbWFpbk5hbWVdPy5NYWlsRnJvbURvbWFpbjtcbiAgY29uc3QgbWFpbEZyb21Qb2xpY3kgPSBtYWlsRnJvbUF0dHJzLk1haWxGcm9tRG9tYWluQXR0cmlidXRlc1tkb21haW5OYW1lXT8uTWFpbEZyb21Eb21haW5TdGF0dXM7XG4gIFxuICBpZiAobWFpbEZyb21Eb21haW4pIHtcbiAgICBhd2FpdCB0YXJnZXRTRVMuc2V0SWRlbnRpdHlNYWlsRnJvbURvbWFpbih7XG4gICAgICBJZGVudGl0eTogZG9tYWluTmFtZSxcbiAgICAgIE1haWxGcm9tRG9tYWluOiBtYWlsRnJvbURvbWFpbixcbiAgICAgIEJlaGF2aW9yT25NWEZhaWx1cmU6ICdVc2VEZWZhdWx0VmFsdWUnXG4gICAgfSkucHJvbWlzZSgpO1xuICAgIGNvbnNvbGUubG9nKGBNQUlMIEZST00gZG9tYWluIHNldCB0byAke21haWxGcm9tRG9tYWlufSBmb3IgJHtkb21haW5OYW1lfSBpbiB0YXJnZXQgcmVnaW9uYCk7XG4gIH1cbn1cbiJdfQ==