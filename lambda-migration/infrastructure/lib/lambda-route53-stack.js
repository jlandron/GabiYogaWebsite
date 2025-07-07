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
exports.LambdaRoute53Stack = void 0;
const cdk = __importStar(require("aws-cdk-lib"));
const route53 = __importStar(require("aws-cdk-lib/aws-route53"));
const targets = __importStar(require("aws-cdk-lib/aws-route53-targets"));
const apigateway = __importStar(require("aws-cdk-lib/aws-apigateway"));
const acm = __importStar(require("aws-cdk-lib/aws-certificatemanager"));
class LambdaRoute53Stack extends cdk.Stack {
    constructor(scope, id, props) {
        super(scope, id, props);
        const { stage, apiGateway, domainName } = props;
        const resourcePrefix = `GabiYoga-${stage}`;
        // Determine the appropriate subdomain based on stage
        this.customDomainName = stage === 'prod' ? domainName : `${stage}.${domainName}`;
        // Look up existing Route53 hosted zone - only the domain is managed manually
        this.hostedZone = route53.HostedZone.fromLookup(this, 'HostedZone', {
            domainName,
        });
        // Create Certificate for custom domain - managed by CDK
        this.certificate = new acm.Certificate(this, 'Certificate', {
            domainName: this.customDomainName,
            subjectAlternativeNames: stage === 'prod' ? [`www.${domainName}`] : [],
            validation: acm.CertificateValidation.fromDns(this.hostedZone),
        });
        // Create a custom domain name for API Gateway - managed by CDK
        const customDomain = new apigateway.DomainName(this, 'CustomDomainName', {
            domainName: this.customDomainName,
            certificate: this.certificate,
            endpointType: apigateway.EndpointType.EDGE,
            securityPolicy: apigateway.SecurityPolicy.TLS_1_2,
        });
        // Only create base path mapping if apiGateway is provided
        if (apiGateway) {
            // Add base path mapping to map the custom domain to API Gateway
            // Use BasePathMapping instead of CfnBasePathMapping for better conflict handling
            customDomain.addBasePathMapping(apiGateway, {
                basePath: '', // Empty string for root path
            });
        }
        // Create A record to point the subdomain to the API Gateway custom domain
        new route53.ARecord(this, 'ApiAliasRecord', {
            zone: this.hostedZone,
            recordName: stage === 'prod' ? undefined : stage,
            target: route53.RecordTarget.fromAlias(new targets.ApiGatewayDomain(customDomain)),
            ttl: cdk.Duration.minutes(5),
        });
        // Create a separate record for www subdomain in production
        if (stage === 'prod') {
            // Create a custom domain name for www subdomain
            const wwwCustomDomain = new apigateway.DomainName(this, 'WwwCustomDomainName', {
                domainName: `www.${domainName}`,
                certificate: this.certificate,
                endpointType: apigateway.EndpointType.EDGE,
                securityPolicy: apigateway.SecurityPolicy.TLS_1_2,
            });
            // Add base path mapping for www subdomain if API Gateway is provided
            if (apiGateway) {
                wwwCustomDomain.addBasePathMapping(apiGateway, {
                    basePath: '', // Empty string for root path
                });
            }
            // Create A record for www subdomain
            new route53.ARecord(this, 'WwwApiAliasRecord', {
                zone: this.hostedZone,
                recordName: 'www',
                target: route53.RecordTarget.fromAlias(new targets.ApiGatewayDomain(wwwCustomDomain)),
                ttl: cdk.Duration.minutes(5),
            });
        }
        // Outputs
        new cdk.CfnOutput(this, 'CustomDomainUrl', {
            value: `https://${this.customDomainName}`,
            description: 'Custom domain URL for the API',
            exportName: `${resourcePrefix}-CustomDomainUrl`,
        });
        new cdk.CfnOutput(this, 'HostedZoneId', {
            value: this.hostedZone.hostedZoneId,
            description: 'Route53 Hosted Zone ID',
            exportName: `${resourcePrefix}-HostedZoneId`,
        });
        new cdk.CfnOutput(this, 'CertificateArn', {
            value: this.certificate.certificateArn,
            description: 'ACM Certificate ARN',
            exportName: `${resourcePrefix}-CertificateArn`,
        });
    }
}
exports.LambdaRoute53Stack = LambdaRoute53Stack;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGFtYmRhLXJvdXRlNTMtc3RhY2suanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJsYW1iZGEtcm91dGU1My1zdGFjay50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLGlEQUFtQztBQUNuQyxpRUFBbUQ7QUFDbkQseUVBQTJEO0FBQzNELHVFQUF5RDtBQUN6RCx3RUFBMEQ7QUFTMUQsTUFBYSxrQkFBbUIsU0FBUSxHQUFHLENBQUMsS0FBSztJQUsvQyxZQUFZLEtBQWdCLEVBQUUsRUFBVSxFQUFFLEtBQThCO1FBQ3RFLEtBQUssQ0FBQyxLQUFLLEVBQUUsRUFBRSxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBRXhCLE1BQU0sRUFBRSxLQUFLLEVBQUUsVUFBVSxFQUFFLFVBQVUsRUFBRSxHQUFHLEtBQUssQ0FBQztRQUNoRCxNQUFNLGNBQWMsR0FBRyxZQUFZLEtBQUssRUFBRSxDQUFDO1FBRTNDLHFEQUFxRDtRQUNyRCxJQUFJLENBQUMsZ0JBQWdCLEdBQUcsS0FBSyxLQUFLLE1BQU0sQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxHQUFHLEtBQUssSUFBSSxVQUFVLEVBQUUsQ0FBQztRQUVqRiw2RUFBNkU7UUFDN0UsSUFBSSxDQUFDLFVBQVUsR0FBRyxPQUFPLENBQUMsVUFBVSxDQUFDLFVBQVUsQ0FBQyxJQUFJLEVBQUUsWUFBWSxFQUFFO1lBQ2xFLFVBQVU7U0FDWCxDQUFDLENBQUM7UUFFSCx3REFBd0Q7UUFDeEQsSUFBSSxDQUFDLFdBQVcsR0FBRyxJQUFJLEdBQUcsQ0FBQyxXQUFXLENBQUMsSUFBSSxFQUFFLGFBQWEsRUFBRTtZQUMxRCxVQUFVLEVBQUUsSUFBSSxDQUFDLGdCQUFnQjtZQUNqQyx1QkFBdUIsRUFBRSxLQUFLLEtBQUssTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sVUFBVSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRTtZQUN0RSxVQUFVLEVB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QUFHLGNBQWMsZUFBZTtTQUM3QyxDQUFDLENBQUM7UUFFSCxJQUFJLEdBQUcsQ0FBQyxTQUFTLENBQUMsSUFBSSxFQUFFLGdCQUFnQixFQUFFO1lBQ3hDLEtBQUssRUFBRSxJQUFJLENBQUMsV0FBVyxDQUFDLGNBQWM7WUFDdEMsV0FBVyxFQUFFLHFCQUFxQjtZQUNsQyxVQUFVLEVBQUUsR0FBRyxjQUFjLGlCQUFpQjtTQUMvQyxDQUFDLENBQUM7SUFDTCxDQUFDO0NBQ0Y7QUFoR0QsZ0RBZ0dDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgY2RrIGZyb20gJ2F3cy1jZGstbGliJztcbmltcG9ydCAqIGFzIHJvdXRlNTMgZnJvbSAnYXdzLWNkay1saWIvYXdzLXJvdXRlNTMnO1xuaW1wb3J0ICogYXMgdGFyZ2V0cyBmcm9tICdhd3MtY2RrLWxpYi9hd3Mtcm91dGU1My10YXJnZXRzJztcbmltcG9ydCAqIGFzIGFwaWdhdGV3YXkgZnJvbSAnYXdzLWNkay1saWIvYXdzLWFwaWdhdGV3YXknO1xuaW1wb3J0ICogYXMgYWNtIGZyb20gJ2F3cy1jZGstbGliL2F3cy1jZXJ0aWZpY2F0ZW1hbmFnZXInO1xuaW1wb3J0IHsgQ29uc3RydWN0IH0gZnJvbSAnY29uc3RydWN0cyc7XG5cbmV4cG9ydCBpbnRlcmZhY2UgTGFtYmRhUm91dGU1M1N0YWNrUHJvcHMgZXh0ZW5kcyBjZGsuU3RhY2tQcm9wcyB7XG4gIHN0YWdlOiBzdHJpbmc7XG4gIGFwaUdhdGV3YXk/OiBhbnk7IC8vIE9wdGlvbmFsIHRvIGF2b2lkIGNpcmN1bGFyIGRlcGVuZGVuY2llc1xuICBkb21haW5OYW1lOiBzdHJpbmc7IC8vIGUuZy4sIGdhYmkueW9nYVxufVxuXG5leHBvcnQgY2xhc3MgTGFtYmRhUm91dGU1M1N0YWNrIGV4dGVuZHMgY2RrLlN0YWNrIHtcbiAgcHVibGljIHJlYWRvbmx5IGN1c3RvbURvbWFpbk5hbWU6IHN0cmluZztcbiAgcHVibGljIHJlYWRvbmx5IGhvc3RlZFpvbmU6IHJvdXRlNTMuSUhvc3RlZFpvbmU7XG4gIHB1YmxpYyByZWFkb25seSBjZXJ0aWZpY2F0ZTogYWNtLklDZXJ0aWZpY2F0ZTtcblxuICBjb25zdHJ1Y3RvcihzY29wZTogQ29uc3RydWN0LCBpZDogc3RyaW5nLCBwcm9wczogTGFtYmRhUm91dGU1M1N0YWNrUHJvcHMpIHtcbiAgICBzdXBlcihzY29wZSwgaWQsIHByb3BzKTtcblxuICAgIGNvbnN0IHsgc3RhZ2UsIGFwaUdhdGV3YXksIGRvbWFpbk5hbWUgfSA9IHByb3BzO1xuICAgIGNvbnN0IHJlc291cmNlUHJlZml4ID0gYEdhYmlZb2dhLSR7c3RhZ2V9YDtcbiAgICBcbiAgICAvLyBEZXRlcm1pbmUgdGhlIGFwcHJvcHJpYXRlIHN1YmRvbWFpbiBiYXNlZCBvbiBzdGFnZVxuICAgIHRoaXMuY3VzdG9tRG9tYWluTmFtZSA9IHN0YWdlID09PSAncHJvZCcgPyBkb21haW5OYW1lIDogYCR7c3RhZ2V9LiR7ZG9tYWluTmFtZX1gO1xuICAgIFxuICAgIC8vIExvb2sgdXAgZXhpc3RpbmcgUm91dGU1MyBob3N0ZWQgem9uZSAtIG9ubHkgdGhlIGRvbWFpbiBpcyBtYW5hZ2VkIG1hbnVhbGx5XG4gICAgdGhpcy5ob3N0ZWRab25lID0gcm91dGU1My5Ib3N0ZWRab25lLmZyb21Mb29rdXAodGhpcywgJ0hvc3RlZFpvbmUnLCB7XG4gICAgICBkb21haW5OYW1lLFxuICAgIH0pO1xuICAgIFxuICAgIC8vIENyZWF0ZSBDZXJ0aWZpY2F0ZSBmb3IgY3VzdG9tIGRvbWFpbiAtIG1hbmFnZWQgYnkgQ0RLXG4gICAgdGhpcy5jZXJ0aWZpY2F0ZSA9IG5ldyBhY20uQ2VydGlmaWNhdGUodGhpcywgJ0NlcnRpZmljYXRlJywge1xuICAgICAgZG9tYWluTmFtZTogdGhpcy5jdXN0b21Eb21haW5OYW1lLFxuICAgICAgc3ViamVjdEFsdGVybmF0aXZlTmFtZXM6IHN0YWdlID09PSAncHJvZCcgPyBbYHd3dy4ke2RvbWFpbk5hbWV9YF0gOiBbXSxcbiAgICAgIHZhbGlkYXRpb246IGFjbS5DZXJ0aWZpY2F0ZVZhbGlkYXRpb24uZnJvbURucyh0aGlzLmhvc3RlZFpvbmUpLFxuICAgIH0pO1xuICAgIFxuICAgIC8vIENyZWF0ZSBhIGN1c3RvbSBkb21haW4gbmFtZSBmb3IgQVBJIEdhdGV3YXkgLSBtYW5hZ2VkIGJ5IENES1xuICAgIGNvbnN0IGN1c3RvbURvbWFpbiA9IG5ldyBhcGlnYXRld2F5LkRvbWFpbk5hbWUodGhpcywgJ0N1c3RvbURvbWFpbk5hbWUnLCB7XG4gICAgICBkb21haW5OYW1lOiB0aGlzLmN1c3RvbURvbWFpbk5hbWUsXG4gICAgICBjZXJ0aWZpY2F0ZTogdGhpcy5jZXJ0aWZpY2F0ZSxcbiAgICAgIGVuZHBvaW50VHlwZTogYXBpZ2F0ZXdheS5FbmRwb2ludFR5cGUuRURHRSxcbiAgICAgIHNlY3VyaXR5UG9saWN5OiBhcGlnYXRld2F5LlNlY3VyaXR5UG9saWN5LlRMU18xXzIsXG4gICAgfSk7XG5cbiAgICAvLyBPbmx5IGNyZWF0ZSBiYXNlIHBhdGggbWFwcGluZyBpZiBhcGlHYXRld2F5IGlzIHByb3ZpZGVkXG4gICAgaWYgKGFwaUdhdGV3YXkpIHtcbiAgICAgIC8vIEFkZCBiYXNlIHBhdGggbWFwcGluZyB0byBtYXAgdGhlIGN1c3RvbSBkb21haW4gdG8gQVBJIEdhdGV3YXlcbiAgICAgIC8vIFVzZSBCYXNlUGF0aE1hcHBpbmcgaW5zdGVhZCBvZiBDZm5CYXNlUGF0aE1hcHBpbmcgZm9yIGJldHRlciBjb25mbGljdCBoYW5kbGluZ1xuICAgICAgY3VzdG9tRG9tYWluLmFkZEJhc2VQYXRoTWFwcGluZyhhcGlHYXRld2F5LCB7XG4gICAgICAgIGJhc2VQYXRoOiAnJywgIC8vIEVtcHR5IHN0cmluZyBmb3Igcm9vdCBwYXRoXG4gICAgICB9KTtcbiAgICB9XG4gICAgXG4gICAgLy8gQ3JlYXRlIEEgcmVjb3JkIHRvIHBvaW50IHRoZSBzdWJkb21haW4gdG8gdGhlIEFQSSBHYXRld2F5IGN1c3RvbSBkb21haW5cbiAgICBuZXcgcm91dGU1My5BUmVjb3JkKHRoaXMsICdBcGlBbGlhc1JlY29yZCcsIHtcbiAgICAgIHpvbmU6IHRoaXMuaG9zdGVkWm9uZSxcbiAgICAgIHJlY29yZE5hbWU6IHN0YWdlID09PSAncHJvZCcgPyB1bmRlZmluZWQgOiBzdGFnZSwgLy8gT21pdCByZWNvcmROYW1lIGZvciByb290IGRvbWFpbiBpbiBwcm9kXG4gICAgICB0YXJnZXQ6IHJvdXRlNTMuUmVjb3JkVGFyZ2V0LmZyb21BbGlhcyhuZXcgdGFyZ2V0cy5BcGlHYXRld2F5RG9tYWluKGN1c3RvbURvbWFpbikpLFxuICAgICAgdHRsOiBjZGsuRHVyYXRpb24ubWludXRlcyg1KSxcbiAgICB9KTtcbiAgICBcbiAgICAvLyBDcmVhdGUgYSBzZXBhcmF0ZSByZWNvcmQgZm9yIHd3dyBzdWJkb21haW4gaW4gcHJvZHVjdGlvblxuICAgIGlmIChzdGFnZSA9PT0gJ3Byb2QnKSB7XG4gICAgICAvLyBDcmVhdGUgYSBjdXN0b20gZG9tYWluIG5hbWUgZm9yIHd3dyBzdWJkb21haW5cbiAgICAgIGNvbnN0IHd3d0N1c3RvbURvbWFpbiA9IG5ldyBhcGlnYXRld2F5LkRvbWFpbk5hbWUodGhpcywgJ1d3d0N1c3RvbURvbWFpbk5hbWUnLCB7XG4gICAgICAgIGRvbWFpbk5hbWU6IGB3d3cuJHtkb21haW5OYW1lfWAsXG4gICAgICAgIGNlcnRpZmljYXRlOiB0aGlzLmNlcnRpZmljYXRlLFxuICAgICAgICBlbmRwb2ludFR5cGU6IGFwaWdhdGV3YXkuRW5kcG9pbnRUeXBlLkVER0UsXG4gICAgICAgIHNlY3VyaXR5UG9saWN5OiBhcGlnYXRld2F5LlNlY3VyaXR5UG9saWN5LlRMU18xXzIsXG4gICAgICB9KTtcbiAgICAgIFxuICAgICAgLy8gQWRkIGJhc2UgcGF0aCBtYXBwaW5nIGZvciB3d3cgc3ViZG9tYWluIGlmIEFQSSBHYXRld2F5IGlzIHByb3ZpZGVkXG4gICAgICBpZiAoYXBpR2F0ZXdheSkge1xuICAgICAgICB3d3dDdXN0b21Eb21haW4uYWRkQmFzZVBhdGhNYXBwaW5nKGFwaUdhdGV3YXksIHtcbiAgICAgICAgICBiYXNlUGF0aDogJycsICAvLyBFbXB0eSBzdHJpbmcgZm9yIHJvb3QgcGF0aFxuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICAgIFxuICAgICAgLy8gQ3JlYXRlIEEgcmVjb3JkIGZvciB3d3cgc3ViZG9tYWluXG4gICAgICBuZXcgcm91dGU1My5BUmVjb3JkKHRoaXMsICdXd3dBcGlBbGlhc1JlY29yZCcsIHtcbiAgICAgICAgem9uZTogdGhpcy5ob3N0ZWRab25lLFxuICAgICAgICByZWNvcmROYW1lOiAnd3d3JyxcbiAgICAgICAgdGFyZ2V0OiByb3V0ZTUzLlJlY29yZFRhcmdldC5mcm9tQWxpYXMobmV3IHRhcmdldHMuQXBpR2F0ZXdheURvbWFpbih3d3dDdXN0b21Eb21haW4pKSxcbiAgICAgICAgdHRsOiBjZGsuRHVyYXRpb24ubWludXRlcyg1KSxcbiAgICAgIH0pO1xuICAgIH1cbiAgICBcbiAgICAvLyBPdXRwdXRzXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ0N1c3RvbURvbWFpblVybCcsIHtcbiAgICAgIHZhbHVlOiBgaHR0cHM6Ly8ke3RoaXMuY3VzdG9tRG9tYWluTmFtZX1gLFxuICAgICAgZGVzY3JpcHRpb246ICdDdXN0b20gZG9tYWluIFVSTCBmb3IgdGhlIEFQSScsXG4gICAgICBleHBvcnROYW1lOiBgJHtyZXNvdXJjZVByZWZpeH0tQ3VzdG9tRG9tYWluVXJsYCxcbiAgICB9KTtcbiAgICBcbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnSG9zdGVkWm9uZUlkJywge1xuICAgICAgdmFsdWU6IHRoaXMuaG9zdGVkWm9uZS5ob3N0ZWRab25lSWQsXG4gICAgICBkZXNjcmlwdGlvbjogJ1JvdXRlNTMgSG9zdGVkIFpvbmUgSUQnLFxuICAgICAgZXhwb3J0TmFtZTogYCR7cmVzb3VyY2VQcmVmaXh9LUhvc3RlZFpvbmVJZGAsXG4gICAgfSk7XG4gICAgXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ0NlcnRpZmljYXRlQXJuJywge1xuICAgICAgdmFsdWU6IHRoaXMuY2VydGlmaWNhdGUuY2VydGlmaWNhdGVBcm4sXG4gICAgICBkZXNjcmlwdGlvbjogJ0FDTSBDZXJ0aWZpY2F0ZSBBUk4nLFxuICAgICAgZXhwb3J0TmFtZTogYCR7cmVzb3VyY2VQcmVmaXh9LUNlcnRpZmljYXRlQXJuYCxcbiAgICB9KTtcbiAgfVxufVxuIl19