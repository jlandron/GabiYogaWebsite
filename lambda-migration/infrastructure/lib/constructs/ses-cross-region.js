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
exports.SESCrossRegionVerification = void 0;
const cdk = __importStar(require("aws-cdk-lib"));
const iam = __importStar(require("aws-cdk-lib/aws-iam"));
const lambda = __importStar(require("aws-cdk-lib/aws-lambda"));
const cr = __importStar(require("aws-cdk-lib/custom-resources"));
const path = __importStar(require("path"));
const constructs_1 = require("constructs");
/**
 * A construct to handle cross-region verification of SES domains
 */
class SESCrossRegionVerification extends constructs_1.Construct {
    constructor(scope, id, props) {
        super(scope, id);
        // Create a Lambda function for the custom resource
        const verificationLambda = new lambda.Function(this, 'VerificationFunction', {
            runtime: lambda.Runtime.NODEJS_16_X,
            handler: 'index.handler',
            code: lambda.Code.fromAsset(path.join(__dirname, '../../resources')),
            timeout: cdk.Duration.minutes(5),
            description: 'Lambda function to handle cross-region SES domain verification',
        });
        // Grant permissions to the Lambda function
        verificationLambda.addToRolePolicy(new iam.PolicyStatement({
            actions: [
                'ses:GetIdentityVerificationAttributes',
                'ses:GetIdentityDkimAttributes',
                'ses:GetIdentityMailFromDomainAttributes',
                'ses:ListIdentities',
                'ses:VerifyDomainIdentity',
                'ses:SetIdentityDkimEnabled',
                'ses:SetIdentityMailFromDomain'
            ],
            resources: ['*'],
            effect: iam.Effect.ALLOW,
        }));
        // Create a provider for the custom resource
        const provider = new cr.Provider(this, 'Provider', {
            onEventHandler: verificationLambda,
        });
        // Create the custom resource
        this.customResource = new cdk.CustomResource(this, 'Resource', {
            serviceToken: provider.serviceToken,
            properties: {
                DomainName: props.domainName,
                SourceRegion: props.sourceRegion,
                TargetRegion: props.targetRegion,
            },
        });
    }
}
exports.SESCrossRegionVerification = SESCrossRegionVerification;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VzLWNyb3NzLXJlZ2lvbi5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbInNlcy1jcm9zcy1yZWdpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSxpREFBbUM7QUFDbkMseURBQTJDO0FBQzNDLCtEQUFpRDtBQUNqRCxpRUFBbUQ7QUFDbkQsMkNBQTZCO0FBQzdCLDJDQUF1QztBQXNCdkM7O0dBRUc7QUFDSCxNQUFhLDBCQUEyQixTQUFRLHNCQUFTO0lBR3ZELFlBQVksS0FBZ0IsRUFBRSxFQUFVLEVBQUUsS0FBc0M7UUFDOUUsS0FBSyxDQUFDLEtBQUssRUFBRSxFQUFFLENBQUMsQ0FBQztRQUVqQixtREFBbUQ7UUFDbkQsTUFBTSxrQkFBa0IsR0FBRyxJQUFJLE1BQU0sQ0FBQyxRQUFRLENBQUMsSUFBSSxFQUFFLHNCQUFzQixFQUFFO1lBQzNFLE9BQU8sRUFBRSxNQUFNLENBQUMsT0FBTyxDQUFDLFdBQVc7WUFDbkMsT0FBTyxFQUFFLGVBQWU7WUFDeEIsSUFBSSxFQUFFLE1BQU0sQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsU0FBUyxFQUFFLGlCQUFpQixDQUFDLENBQUM7WUFDcEUsT0FBTyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQztZQUNoQyxXQUFXLEVBQUUsZ0VBQWdFO1NBQzlFLENBQUMsQ0FBQztRQUVILDJDQUEyQztRQUMzQyxrQkFBa0IsQ0FBQyxlQUFlLENBQUMsSUFBSSxHQUFHLENBQUMsZUFBZSxDQUFDO1lBQ3pELE9BQU8sRUFBRTtnQkFDUCx1Q0FBdUM7Z0JBQ3ZDLCtCQUErQjtnQkFDL0IseUNBQXlDO2dCQUN6QyxvQkFBb0I7Z0JBQ3BCLDBCQUEwQjtnQkFDMUIsNEJBQTRCO2dCQUM1QiwrQkFBK0I7YUFDaEM7WUFDRCxTQUFTLEVBQUUsQ0FBQyxHQUFHLENBQUM7WUFDaEIsTUFBTSxFQUFFLEdBQUcsQ0FBQyxNQUFNLENBQUMsS0FBSztTQUN6QixDQUFDLENBQUMsQ0FBQztRQUVKLDRDQUE0QztRQUM1QyxNQUFNLFFBQVEsR0FBRyxJQUFJLEVBQUUsQ0FBQyxRQUFRLENBQUMsSUFBSSxFQUFFLFVBQVUsRUFBRTtZQUNqRCxjQUFjLEVBQUUsa0JBQWtCO1NBQ25DLENBQUMsQ0FBQztRQUVILDZCQUE2QjtRQUM3QixJQUFJLENBQUMsY0FBYyxHQUFHLElBQUksR0FBRyxDQUFDLGNBQWMsQ0FBQyxJQUFJLEVBQUUsVUFBVSxFQUFFO1lBQzdELFlBQVksRUFBRSxRQUFRLENBQUMsWUFBWTtZQUNuQyxVQUFVLEVBQUU7Z0JBQ1YsVUFBVSxFQUFFLEtBQUssQ0FBQyxVQUFVO2dCQUM1QixZQUFZLEVBQUUsS0FBSyxDQUFDLFlBQVk7Z0JBQ2hDLFlBQVksRUFBRSxLQUFLLENBQUMsWUFBWTthQUNqQztTQUNGLENBQUMsQ0FBQztJQUNMLENBQUM7Q0FDRjtBQTdDRCxnRUE2Q0MiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyBjZGsgZnJvbSAnYXdzLWNkay1saWInO1xuaW1wb3J0ICogYXMgaWFtIGZyb20gJ2F3cy1jZGstbGliL2F3cy1pYW0nO1xuaW1wb3J0ICogYXMgbGFtYmRhIGZyb20gJ2F3cy1jZGstbGliL2F3cy1sYW1iZGEnO1xuaW1wb3J0ICogYXMgY3IgZnJvbSAnYXdzLWNkay1saWIvY3VzdG9tLXJlc291cmNlcyc7XG5pbXBvcnQgKiBhcyBwYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IHsgQ29uc3RydWN0IH0gZnJvbSAnY29uc3RydWN0cyc7XG5cbi8qKlxuICogUHJvcGVydGllcyBmb3IgdGhlIFNFU0Nyb3NzUmVnaW9uVmVyaWZpY2F0aW9uIGNvbnN0cnVjdFxuICovXG5leHBvcnQgaW50ZXJmYWNlIFNFU0Nyb3NzUmVnaW9uVmVyaWZpY2F0aW9uUHJvcHMge1xuICAvKipcbiAgICogVGhlIGRvbWFpbiBuYW1lIHRvIHZlcmlmeVxuICAgKi9cbiAgZG9tYWluTmFtZTogc3RyaW5nO1xuICBcbiAgLyoqXG4gICAqIFRoZSBzb3VyY2UgcmVnaW9uIHdoZXJlIHRoZSBkb21haW4gaXMgYWxyZWFkeSB2ZXJpZmllZFxuICAgKi9cbiAgc291cmNlUmVnaW9uOiBzdHJpbmc7XG4gIFxuICAvKipcbiAgICogVGhlIHRhcmdldCByZWdpb24gd2hlcmUgd2Ugd2FudCB0byB1c2UgdGhlIGRvbWFpblxuICAgKi9cbiAgdGFyZ2V0UmVnaW9uOiBzdHJpbmc7XG59XG5cbi8qKlxuICogQSBjb25zdHJ1Y3QgdG8gaGFuZGxlIGNyb3NzLXJlZ2lvbiB2ZXJpZmljYXRpb24gb2YgU0VTIGRvbWFpbnNcbiAqL1xuZXhwb3J0IGNsYXNzIFNFU0Nyb3NzUmVnaW9uVmVyaWZpY2F0aW9uIGV4dGVuZHMgQ29uc3RydWN0IHtcbiAgcHVibGljIHJlYWRvbmx5IGN1c3RvbVJlc291cmNlOiBjZGsuQ3VzdG9tUmVzb3VyY2U7XG4gIFxuICBjb25zdHJ1Y3RvcihzY29wZTogQ29uc3RydWN0LCBpZDogc3RyaW5nLCBwcm9wczogU0VTQ3Jvc3NSZWdpb25WZXJpZmljYXRpb25Qcm9wcykge1xuICAgIHN1cGVyKHNjb3BlLCBpZCk7XG4gICAgXG4gICAgLy8gQ3JlYXRlIGEgTGFtYmRhIGZ1bmN0aW9uIGZvciB0aGUgY3VzdG9tIHJlc291cmNlXG4gICAgY29uc3QgdmVyaWZpY2F0aW9uTGFtYmRhID0gbmV3IGxhbWJkYS5GdW5jdGlvbih0aGlzLCAnVmVyaWZpY2F0aW9uRnVuY3Rpb24nLCB7XG4gICAgICBydW50aW1lOiBsYW1iZGEuUnVudGltZS5OT0RFSlNfMTZfWCxcbiAgICAgIGhhbmRsZXI6ICdpbmRleC5oYW5kbGVyJywgLy8gVXNlIGluZGV4LmpzIGFzIGVudHJ5IHBvaW50XG4gICAgICBjb2RlOiBsYW1iZGEuQ29kZS5mcm9tQXNzZXQocGF0aC5qb2luKF9fZGlybmFtZSwgJy4uLy4uL3Jlc291cmNlcycpKSxcbiAgICAgIHRpbWVvdXQ6IGNkay5EdXJhdGlvbi5taW51dGVzKDUpLFxuICAgICAgZGVzY3JpcHRpb246ICdMYW1iZGEgZnVuY3Rpb24gdG8gaGFuZGxlIGNyb3NzLXJlZ2lvbiBTRVMgZG9tYWluIHZlcmlmaWNhdGlvbicsXG4gICAgfSk7XG4gICAgXG4gICAgLy8gR3JhbnQgcGVybWlzc2lvbnMgdG8gdGhlIExhbWJkYSBmdW5jdGlvblxuICAgIHZlcmlmaWNhdGlvbkxhbWJkYS5hZGRUb1JvbGVQb2xpY3kobmV3IGlhbS5Qb2xpY3lTdGF0ZW1lbnQoe1xuICAgICAgYWN0aW9uczogW1xuICAgICAgICAnc2VzOkdldElkZW50aXR5VmVyaWZpY2F0aW9uQXR0cmlidXRlcycsXG4gICAgICAgICdzZXM6R2V0SWRlbnRpdHlEa2ltQXR0cmlidXRlcycsXG4gICAgICAgICdzZXM6R2V0SWRlbnRpdHlNYWlsRnJvbURvbWFpbkF0dHJpYnV0ZXMnLFxuICAgICAgICAnc2VzOkxpc3RJZGVudGl0aWVzJyxcbiAgICAgICAgJ3NlczpWZXJpZnlEb21haW5JZGVudGl0eScsXG4gICAgICAgICdzZXM6U2V0SWRlbnRpdHlEa2ltRW5hYmxlZCcsXG4gICAgICAgICdzZXM6U2V0SWRlbnRpdHlNYWlsRnJvbURvbWFpbidcbiAgICAgIF0sXG4gICAgICByZXNvdXJjZXM6IFsnKiddLFxuICAgICAgZWZmZWN0OiBpYW0uRWZmZWN0LkFMTE9XLFxuICAgIH0pKTtcbiAgICBcbiAgICAvLyBDcmVhdGUgYSBwcm92aWRlciBmb3IgdGhlIGN1c3RvbSByZXNvdXJjZVxuICAgIGNvbnN0IHByb3ZpZGVyID0gbmV3IGNyLlByb3ZpZGVyKHRoaXMsICdQcm92aWRlcicsIHtcbiAgICAgIG9uRXZlbnRIYW5kbGVyOiB2ZXJpZmljYXRpb25MYW1iZGEsXG4gICAgfSk7XG4gICAgXG4gICAgLy8gQ3JlYXRlIHRoZSBjdXN0b20gcmVzb3VyY2VcbiAgICB0aGlzLmN1c3RvbVJlc291cmNlID0gbmV3IGNkay5DdXN0b21SZXNvdXJjZSh0aGlzLCAnUmVzb3VyY2UnLCB7XG4gICAgICBzZXJ2aWNlVG9rZW46IHByb3ZpZGVyLnNlcnZpY2VUb2tlbixcbiAgICAgIHByb3BlcnRpZXM6IHtcbiAgICAgICAgRG9tYWluTmFtZTogcHJvcHMuZG9tYWluTmFtZSxcbiAgICAgICAgU291cmNlUmVnaW9uOiBwcm9wcy5zb3VyY2VSZWdpb24sXG4gICAgICAgIFRhcmdldFJlZ2lvbjogcHJvcHMudGFyZ2V0UmVnaW9uLFxuICAgICAgfSxcbiAgICB9KTtcbiAgfVxufVxuIl19