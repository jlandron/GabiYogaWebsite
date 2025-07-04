interface CloudFormationCustomResourceEvent {
    RequestType: 'Create' | 'Update' | 'Delete';
    ServiceToken: string;
    ResponseURL: string;
    StackId: string;
    RequestId: string;
    LogicalResourceId: string;
    PhysicalResourceId?: string;
    ResourceType: string;
    ResourceProperties: {
        ServiceToken: string;
        [key: string]: any;
    };
    OldResourceProperties?: {
        [key: string]: any;
    };
}
interface CloudFormationCustomResourceResponse {
    Status: 'SUCCESS' | 'FAILED';
    Reason?: string;
    PhysicalResourceId: string;
    StackId: string;
    RequestId: string;
    LogicalResourceId: string;
    Data?: {
        [key: string]: any;
    };
}
/**
 * This Lambda function handles cross-region SES domain verification
 * It's used when the SES domain is verified in one region (us-west-2)
 * but needs to be used in another region (us-east-1)
 */
export declare function handler(event: CloudFormationCustomResourceEvent): Promise<CloudFormationCustomResourceResponse>;
export {};
