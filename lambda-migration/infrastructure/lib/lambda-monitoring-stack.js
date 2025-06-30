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
exports.LambdaMonitoringStack = void 0;
const cdk = __importStar(require("aws-cdk-lib"));
const cloudwatch = __importStar(require("aws-cdk-lib/aws-cloudwatch"));
const logs = __importStar(require("aws-cdk-lib/aws-logs"));
class LambdaMonitoringStack extends cdk.Stack {
    constructor(scope, id, props) {
        super(scope, id, props);
        const { stage, apiGateway, lambdaFunctions, dynamodbTables } = props;
        const resourcePrefix = `GabiYoga-${stage}`;
        // Create CloudWatch Dashboard
        this.dashboard = new cloudwatch.Dashboard(this, 'LambdaDashboard', {
            dashboardName: `${resourcePrefix}-Lambda-Dashboard`,
        });
        // API Gateway Metrics Widget
        const apiGatewayWidget = new cloudwatch.GraphWidget({
            title: 'API Gateway Metrics',
            width: 12,
            height: 6,
            left: [
                new cloudwatch.Metric({
                    namespace: 'AWS/ApiGateway',
                    metricName: 'Count',
                    dimensionsMap: {
                        ApiName: apiGateway.restApiName,
                    },
                    statistic: 'Sum',
                    period: cdk.Duration.minutes(5),
                }),
                new cloudwatch.Metric({
                    namespace: 'AWS/ApiGateway',
                    metricName: '4XXError',
                    dimensionsMap: {
                        ApiName: apiGateway.restApiName,
                    },
                    statistic: 'Sum',
                    period: cdk.Duration.minutes(5),
                }),
                new cloudwatch.Metric({
                    namespace: 'AWS/ApiGateway',
                    metricName: '5XXError',
                    dimensionsMap: {
                        ApiName: apiGateway.restApiName,
                    },
                    statistic: 'Sum',
                    period: cdk.Duration.minutes(5),
                }),
            ],
            right: [
                new cloudwatch.Metric({
                    namespace: 'AWS/ApiGateway',
                    metricName: 'Latency',
                    dimensionsMap: {
                        ApiName: apiGateway.restApiName,
                    },
                    statistic: 'Average',
                    period: cdk.Duration.minutes(5),
                }),
            ],
        });
        this.dashboard.addWidgets(apiGatewayWidget);
        // Lambda Functions Metrics
        const lambdaErrorsWidget = new cloudwatch.GraphWidget({
            title: 'Lambda Function Errors',
            width: 12,
            height: 6,
            left: lambdaFunctions.map(func => new cloudwatch.Metric({
                namespace: 'AWS/Lambda',
                metricName: 'Errors',
                dimensionsMap: {
                    FunctionName: func.functionName,
                },
                statistic: 'Sum',
                period: cdk.Duration.minutes(5),
            })),
        });
        const lambdaDurationWidget = new cloudwatch.GraphWidget({
            title: 'Lambda Function Duration',
            width: 12,
            height: 6,
            left: lambdaFunctions.map(func => new cloudwatch.Metric({
                namespace: 'AWS/Lambda',
                metricName: 'Duration',
                dimensionsMap: {
                    FunctionName: func.functionName,
                },
                statistic: 'Average',
                period: cdk.Duration.minutes(5),
            })),
        });
        const lambdaInvocationsWidget = new cloudwatch.GraphWidget({
            title: 'Lambda Function Invocations',
            width: 12,
            height: 6,
            left: lambdaFunctions.map(func => new cloudwatch.Metric({
                namespace: 'AWS/Lambda',
                metricName: 'Invocations',
                dimensionsMap: {
                    FunctionName: func.functionName,
                },
                statistic: 'Sum',
                period: cdk.Duration.minutes(5),
            })),
        });
        this.dashboard.addWidgets(lambdaErrorsWidget, lambdaDurationWidget);
        this.dashboard.addWidgets(lambdaInvocationsWidget);
        // DynamoDB Metrics
        const dynamoReadWidget = new cloudwatch.GraphWidget({
            title: 'DynamoDB Read Capacity',
            width: 12,
            height: 6,
            left: dynamodbTables.map(table => new cloudwatch.Metric({
                namespace: 'AWS/DynamoDB',
                metricName: 'ConsumedReadCapacityUnits',
                dimensionsMap: {
                    TableName: table.tableName,
                },
                statistic: 'Sum',
                period: cdk.Duration.minutes(5),
            })),
        });
        const dynamoWriteWidget = new cloudwatch.GraphWidget({
            title: 'DynamoDB Write Capacity',
            width: 12,
            height: 6,
            left: dynamodbTables.map(table => new cloudwatch.Metric({
                namespace: 'AWS/DynamoDB',
                metricName: 'ConsumedWriteCapacityUnits',
                dimensionsMap: {
                    TableName: table.tableName,
                },
                statistic: 'Sum',
                period: cdk.Duration.minutes(5),
            })),
        });
        this.dashboard.addWidgets(dynamoReadWidget, dynamoWriteWidget);
        // Create Alarms for Critical Metrics
        // API Gateway 5XX Error Alarm
        const apiGateway5xxAlarm = new cloudwatch.Alarm(this, 'ApiGateway5xxAlarm', {
            alarmName: `${resourcePrefix}-ApiGateway-5XX-Errors`,
            metric: new cloudwatch.Metric({
                namespace: 'AWS/ApiGateway',
                metricName: '5XXError',
                dimensionsMap: {
                    ApiName: apiGateway.restApiName,
                },
                statistic: 'Sum',
                period: cdk.Duration.minutes(5),
            }),
            threshold: 5,
            evaluationPeriods: 2,
            comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
            alarmDescription: 'API Gateway 5XX errors exceed threshold',
            treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
        });
        // Lambda Error Rate Alarm (for critical functions)
        const criticalFunctions = ['AuthLogin', 'PaymentIntent', 'PaymentWebhook'];
        lambdaFunctions
            .filter(func => criticalFunctions.some(name => func.functionName.includes(name)))
            .forEach((func, index) => {
            new cloudwatch.Alarm(this, `LambdaErrorAlarm${index}`, {
                alarmName: `${resourcePrefix}-Lambda-${func.functionName}-Errors`,
                metric: new cloudwatch.Metric({
                    namespace: 'AWS/Lambda',
                    metricName: 'Errors',
                    dimensionsMap: {
                        FunctionName: func.functionName,
                    },
                    statistic: 'Sum',
                    period: cdk.Duration.minutes(5),
                }),
                threshold: 3,
                evaluationPeriods: 2,
                comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
                alarmDescription: `Lambda function ${func.functionName} errors exceed threshold`,
                treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
            });
        });
        // High Duration Alarm for Lambda functions
        lambdaFunctions.forEach((func, index) => {
            new cloudwatch.Alarm(this, `LambdaDurationAlarm${index}`, {
                alarmName: `${resourcePrefix}-Lambda-${func.functionName}-Duration`,
                metric: new cloudwatch.Metric({
                    namespace: 'AWS/Lambda',
                    metricName: 'Duration',
                    dimensionsMap: {
                        FunctionName: func.functionName,
                    },
                    statistic: 'Average',
                    period: cdk.Duration.minutes(5),
                }),
                threshold: 15000,
                evaluationPeriods: 3,
                comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
                alarmDescription: `Lambda function ${func.functionName} duration is too high`,
                treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
            });
        });
        // DynamoDB Throttling Alarms
        dynamodbTables.forEach((table, index) => {
            new cloudwatch.Alarm(this, `DynamoThrottleReadAlarm${index}`, {
                alarmName: `${resourcePrefix}-DynamoDB-${table.tableName}-ReadThrottle`,
                metric: new cloudwatch.Metric({
                    namespace: 'AWS/DynamoDB',
                    metricName: 'ReadThrottledEvents',
                    dimensionsMap: {
                        TableName: table.tableName,
                    },
                    statistic: 'Sum',
                    period: cdk.Duration.minutes(5),
                }),
                threshold: 1,
                evaluationPeriods: 1,
                comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
                alarmDescription: `DynamoDB table ${table.tableName} read throttling detected`,
                treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
            });
            new cloudwatch.Alarm(this, `DynamoThrottleWriteAlarm${index}`, {
                alarmName: `${resourcePrefix}-DynamoDB-${table.tableName}-WriteThrottle`,
                metric: new cloudwatch.Metric({
                    namespace: 'AWS/DynamoDB',
                    metricName: 'WriteThrottledEvents',
                    dimensionsMap: {
                        TableName: table.tableName,
                    },
                    statistic: 'Sum',
                    period: cdk.Duration.minutes(5),
                }),
                threshold: 1,
                evaluationPeriods: 1,
                comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
                alarmDescription: `DynamoDB table ${table.tableName} write throttling detected`,
                treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
            });
        });
        // Log Groups for Lambda functions
        lambdaFunctions.forEach(func => {
            new logs.LogGroup(this, `${func.node.id}LogGroup`, {
                logGroupName: `/aws/lambda/${func.functionName}`,
                retention: stage === 'prod' ? logs.RetentionDays.ONE_MONTH : logs.RetentionDays.ONE_WEEK,
                removalPolicy: stage === 'prod' ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
            });
        });
        // Dashboard URL for outputs
        this.dashboardUrl = `https://${this.region}.console.aws.amazon.com/cloudwatch/home?region=${this.region}#dashboards:name=${resourcePrefix}-Lambda-Dashboard`;
        // Tags
        cdk.Tags.of(this.dashboard).add('Service', 'GabiYogaLambda');
        cdk.Tags.of(this.dashboard).add('Environment', stage);
        cdk.Tags.of(this.dashboard).add('Purpose', 'Monitoring');
        // Outputs
        new cdk.CfnOutput(this, 'DashboardName', {
            value: this.dashboard.dashboardName,
            description: 'CloudWatch Dashboard name',
            exportName: `${resourcePrefix}-DashboardName`,
        });
        new cdk.CfnOutput(this, 'ApiGateway5xxAlarmName', {
            value: apiGateway5xxAlarm.alarmName,
            description: 'API Gateway 5XX error alarm name',
            exportName: `${resourcePrefix}-ApiGateway5xxAlarmName`,
        });
    }
}
exports.LambdaMonitoringStack = LambdaMonitoringStack;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGFtYmRhLW1vbml0b3Jpbmctc3RhY2suanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJsYW1iZGEtbW9uaXRvcmluZy1zdGFjay50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLGlEQUFtQztBQUNuQyx1RUFBeUQ7QUFJekQsMkRBQTZDO0FBVTdDLE1BQWEscUJBQXNCLFNBQVEsR0FBRyxDQUFDLEtBQUs7SUFJbEQsWUFBWSxLQUFnQixFQUFFLEVBQVUsRUFBRSxLQUFpQztRQUN6RSxLQUFLLENBQUMsS0FBSyxFQUFFLEVBQUUsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUV4QixNQUFNLEVBQUUsS0FBSyxFQUFFLFVBQVUsRUFBRSxlQUFlLEVBQUUsY0FBYyxFQUFFLEdBQUcsS0FBSyxDQUFDO1FBQ3JFLE1BQU0sY0FBYyxHQUFHLFlBQVksS0FBSyxFQUFFLENBQUM7UUFFM0MsOEJBQThCO1FBQzlCLElBQUksQ0FBQyxTQUFTLEdBQUcsSUFBSSxVQUFVLENBQUMsU0FBUyxDQUFDLElBQUksRUFBRSxpQkFBaUIsRUFBRTtZQUNqRSxhQUFhLEVBQUUsR0FBRyxjQUFjLG1CQUFtQjtTQUNwRCxDQUFDLENBQUM7UUFFSCw2QkFBNkI7UUFDN0IsTUFBTSxnQkFBZ0IsR0FBRyxJQUFJLFVBQVUsQ0FBQyxXQUFXLENBQUM7WUFDbEQsS0FBSyxFQUFFLHFCQUFxQjtZQUM1QixLQUFLLEVBQUUsRUFBRTtZQUNULE1BQU0sRUFBRSxDQUFDO1lBQ1QsSUFBSSxFQUFFO2dCQUNKLElBQUksVUFBVSxDQUFDLE1BQU0sQ0FBQztvQkFDcEIsU0FBUyxFQUFFLGdCQUFnQjtvQkFDM0IsVUFBVSxFQUFFLE9BQU87b0JBQ25CLGFBQWEsRUFBRTt3QkFDYixPQUFPLEVBQUUsVUFBVSxDQUFDLFdBQVc7cUJBQ2hDO29CQUNELFNBQVMsRUFBRSxLQUFLO29CQUNoQixNQUFNLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxPQUFP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QUM7UUFFSCxJQUFJLEdBQUcsQ0FBQyxTQUFTLENBQUMsSUFBSSxFQUFFLHdCQUF3QixFQUFFO1lBQ2hELEtBQUssRUFBRSxrQkFBa0IsQ0FBQyxTQUFTO1lBQ25DLFdBQVcsRUFBRSxrQ0FBa0M7WUFDL0MsVUFBVSxFQUFFLEdBQUcsY0FBYyx5QkFBeUI7U0FDdkQsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztDQUNGO0FBblNELHNEQW1TQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIGNkayBmcm9tICdhd3MtY2RrLWxpYic7XG5pbXBvcnQgKiBhcyBjbG91ZHdhdGNoIGZyb20gJ2F3cy1jZGstbGliL2F3cy1jbG91ZHdhdGNoJztcbmltcG9ydCAqIGFzIGxhbWJkYSBmcm9tICdhd3MtY2RrLWxpYi9hd3MtbGFtYmRhJztcbmltcG9ydCAqIGFzIGFwaWdhdGV3YXkgZnJvbSAnYXdzLWNkay1saWIvYXdzLWFwaWdhdGV3YXknO1xuaW1wb3J0ICogYXMgZHluYW1vZGIgZnJvbSAnYXdzLWNkay1saWIvYXdzLWR5bmFtb2RiJztcbmltcG9ydCAqIGFzIGxvZ3MgZnJvbSAnYXdzLWNkay1saWIvYXdzLWxvZ3MnO1xuaW1wb3J0IHsgQ29uc3RydWN0IH0gZnJvbSAnY29uc3RydWN0cyc7XG5cbmV4cG9ydCBpbnRlcmZhY2UgTGFtYmRhTW9uaXRvcmluZ1N0YWNrUHJvcHMgZXh0ZW5kcyBjZGsuU3RhY2tQcm9wcyB7XG4gIHN0YWdlOiBzdHJpbmc7XG4gIGFwaUdhdGV3YXk6IGFwaWdhdGV3YXkuUmVzdEFwaTtcbiAgbGFtYmRhRnVuY3Rpb25zOiBsYW1iZGEuRnVuY3Rpb25bXTtcbiAgZHluYW1vZGJUYWJsZXM6IGR5bmFtb2RiLlRhYmxlW107XG59XG5cbmV4cG9ydCBjbGFzcyBMYW1iZGFNb25pdG9yaW5nU3RhY2sgZXh0ZW5kcyBjZGsuU3RhY2sge1xuICBwdWJsaWMgcmVhZG9ubHkgZGFzaGJvYXJkVXJsOiBzdHJpbmc7XG4gIHB1YmxpYyByZWFkb25seSBkYXNoYm9hcmQ6IGNsb3Vkd2F0Y2guRGFzaGJvYXJkO1xuXG4gIGNvbnN0cnVjdG9yKHNjb3BlOiBDb25zdHJ1Y3QsIGlkOiBzdHJpbmcsIHByb3BzOiBMYW1iZGFNb25pdG9yaW5nU3RhY2tQcm9wcykge1xuICAgIHN1cGVyKHNjb3BlLCBpZCwgcHJvcHMpO1xuXG4gICAgY29uc3QgeyBzdGFnZSwgYXBpR2F0ZXdheSwgbGFtYmRhRnVuY3Rpb25zLCBkeW5hbW9kYlRhYmxlcyB9ID0gcHJvcHM7XG4gICAgY29uc3QgcmVzb3VyY2VQcmVmaXggPSBgR2FiaVlvZ2EtJHtzdGFnZX1gO1xuXG4gICAgLy8gQ3JlYXRlIENsb3VkV2F0Y2ggRGFzaGJvYXJkXG4gICAgdGhpcy5kYXNoYm9hcmQgPSBuZXcgY2xvdWR3YXRjaC5EYXNoYm9hcmQodGhpcywgJ0xhbWJkYURhc2hib2FyZCcsIHtcbiAgICAgIGRhc2hib2FyZE5hbWU6IGAke3Jlc291cmNlUHJlZml4fS1MYW1iZGEtRGFzaGJvYXJkYCxcbiAgICB9KTtcblxuICAgIC8vIEFQSSBHYXRld2F5IE1ldHJpY3MgV2lkZ2V0XG4gICAgY29uc3QgYXBpR2F0ZXdheVdpZGdldCA9IG5ldyBjbG91ZHdhdGNoLkdyYXBoV2lkZ2V0KHtcbiAgICAgIHRpdGxlOiAnQVBJIEdhdGV3YXkgTWV0cmljcycsXG4gICAgICB3aWR0aDogMTIsXG4gICAgICBoZWlnaHQ6IDYsXG4gICAgICBsZWZ0OiBbXG4gICAgICAgIG5ldyBjbG91ZHdhdGNoLk1ldHJpYyh7XG4gICAgICAgICAgbmFtZXNwYWNlOiAnQVdTL0FwaUdhdGV3YXknLFxuICAgICAgICAgIG1ldHJpY05hbWU6ICdDb3VudCcsXG4gICAgICAgICAgZGltZW5zaW9uc01hcDoge1xuICAgICAgICAgICAgQXBpTmFtZTogYXBpR2F0ZXdheS5yZXN0QXBpTmFtZSxcbiAgICAgICAgICB9LFxuICAgICAgICAgIHN0YXRpc3RpYzogJ1N1bScsXG4gICAgICAgICAgcGVyaW9kOiBjZGsuRHVyYXRpb24ubWludXRlcyg1KSxcbiAgICAgICAgfSksXG4gICAgICAgIG5ldyBjbG91ZHdhdGNoLk1ldHJpYyh7XG4gICAgICAgICAgbmFtZXNwYWNlOiAnQVdTL0FwaUdhdGV3YXknLFxuICAgICAgICAgIG1ldHJpY05hbWU6ICc0WFhFcnJvcicsXG4gICAgICAgICAgZGltZW5zaW9uc01hcDoge1xuICAgICAgICAgICAgQXBpTmFtZTogYXBpR2F0ZXdheS5yZXN0QXBpTmFtZSxcbiAgICAgICAgICB9LFxuICAgICAgICAgIHN0YXRpc3RpYzogJ1N1bScsXG4gICAgICAgICAgcGVyaW9kOiBjZGsuRHVyYXRpb24ubWludXRlcyg1KSxcbiAgICAgICAgfSksXG4gICAgICAgIG5ldyBjbG91ZHdhdGNoLk1ldHJpYyh7XG4gICAgICAgICAgbmFtZXNwYWNlOiAnQVdTL0FwaUdhdGV3YXknLFxuICAgICAgICAgIG1ldHJpY05hbWU6ICc1WFhFcnJvcicsXG4gICAgICAgICAgZGltZW5zaW9uc01hcDoge1xuICAgICAgICAgICAgQXBpTmFtZTogYXBpR2F0ZXdheS5yZXN0QXBpTmFtZSxcbiAgICAgICAgICB9LFxuICAgICAgICAgIHN0YXRpc3RpYzogJ1N1bScsXG4gICAgICAgICAgcGVyaW9kOiBjZGsuRHVyYXRpb24ubWludXRlcyg1KSxcbiAgICAgICAgfSksXG4gICAgICBdLFxuICAgICAgcmlnaHQ6IFtcbiAgICAgICAgbmV3IGNsb3Vkd2F0Y2guTWV0cmljKHtcbiAgICAgICAgICBuYW1lc3BhY2U6ICdBV1MvQXBpR2F0ZXdheScsXG4gICAgICAgICAgbWV0cmljTmFtZTogJ0xhdGVuY3knLFxuICAgICAgICAgIGRpbWVuc2lvbnNNYXA6IHtcbiAgICAgICAgICAgIEFwaU5hbWU6IGFwaUdhdGV3YXkucmVzdEFwaU5hbWUsXG4gICAgICAgICAgfSxcbiAgICAgICAgICBzdGF0aXN0aWM6ICdBdmVyYWdlJyxcbiAgICAgICAgICBwZXJpb2Q6IGNkay5EdXJhdGlvbi5taW51dGVzKDUpLFxuICAgICAgICB9KSxcbiAgICAgIF0sXG4gICAgfSk7XG5cbiAgICB0aGlzLmRhc2hib2FyZC5hZGRXaWRnZXRzKGFwaUdhdGV3YXlXaWRnZXQpO1xuXG4gICAgLy8gTGFtYmRhIEZ1bmN0aW9ucyBNZXRyaWNzXG4gICAgY29uc3QgbGFtYmRhRXJyb3JzV2lkZ2V0ID0gbmV3IGNsb3Vkd2F0Y2guR3JhcGhXaWRnZXQoe1xuICAgICAgdGl0bGU6ICdMYW1iZGEgRnVuY3Rpb24gRXJyb3JzJyxcbiAgICAgIHdpZHRoOiAxMixcbiAgICAgIGhlaWdodDogNixcbiAgICAgIGxlZnQ6IGxhbWJkYUZ1bmN0aW9ucy5tYXAoZnVuYyA9PiBcbiAgICAgICAgbmV3IGNsb3Vkd2F0Y2guTWV0cmljKHtcbiAgICAgICAgICBuYW1lc3BhY2U6ICdBV1MvTGFtYmRhJyxcbiAgICAgICAgICBtZXRyaWNOYW1lOiAnRXJyb3JzJyxcbiAgICAgICAgICBkaW1lbnNpb25zTWFwOiB7XG4gICAgICAgICAgICBGdW5jdGlvbk5hbWU6IGZ1bmMuZnVuY3Rpb25OYW1lLFxuICAgICAgICAgIH0sXG4gICAgICAgICAgc3RhdGlzdGljOiAnU3VtJyxcbiAgICAgICAgICBwZXJpb2Q6IGNkay5EdXJhdGlvbi5taW51dGVzKDUpLFxuICAgICAgICB9KVxuICAgICAgKSxcbiAgICB9KTtcblxuICAgIGNvbnN0IGxhbWJkYUR1cmF0aW9uV2lkZ2V0ID0gbmV3IGNsb3Vkd2F0Y2guR3JhcGhXaWRnZXQoe1xuICAgICAgdGl0bGU6ICdMYW1iZGEgRnVuY3Rpb24gRHVyYXRpb24nLFxuICAgICAgd2lkdGg6IDEyLFxuICAgICAgaGVpZ2h0OiA2LFxuICAgICAgbGVmdDogbGFtYmRhRnVuY3Rpb25zLm1hcChmdW5jID0+IFxuICAgICAgICBuZXcgY2xvdWR3YXRjaC5NZXRyaWMoe1xuICAgICAgICAgIG5hbWVzcGFjZTogJ0FXUy9MYW1iZGEnLFxuICAgICAgICAgIG1ldHJpY05hbWU6ICdEdXJhdGlvbicsXG4gICAgICAgICAgZGltZW5zaW9uc01hcDoge1xuICAgICAgICAgICAgRnVuY3Rpb25OYW1lOiBmdW5jLmZ1bmN0aW9uTmFtZSxcbiAgICAgICAgICB9LFxuICAgICAgICAgIHN0YXRpc3RpYzogJ0F2ZXJhZ2UnLFxuICAgICAgICAgIHBlcmlvZDogY2RrLkR1cmF0aW9uLm1pbnV0ZXMoNSksXG4gICAgICAgIH0pXG4gICAgICApLFxuICAgIH0pO1xuXG4gICAgY29uc3QgbGFtYmRhSW52b2NhdGlvbnNXaWRnZXQgPSBuZXcgY2xvdWR3YXRjaC5HcmFwaFdpZGdldCh7XG4gICAgICB0aXRsZTogJ0xhbWJkYSBGdW5jdGlvbiBJbnZvY2F0aW9ucycsXG4gICAgICB3aWR0aDogMTIsXG4gICAgICBoZWlnaHQ6IDYsXG4gICAgICBsZWZ0OiBsYW1iZGFGdW5jdGlvbnMubWFwKGZ1bmMgPT4gXG4gICAgICAgIG5ldyBjbG91ZHdhdGNoLk1ldHJpYyh7XG4gICAgICAgICAgbmFtZXNwYWNlOiAnQVdTL0xhbWJkYScsXG4gICAgICAgICAgbWV0cmljTmFtZTogJ0ludm9jYXRpb25zJyxcbiAgICAgICAgICBkaW1lbnNpb25zTWFwOiB7XG4gICAgICAgICAgICBGdW5jdGlvbk5hbWU6IGZ1bmMuZnVuY3Rpb25OYW1lLFxuICAgICAgICAgIH0sXG4gICAgICAgICAgc3RhdGlzdGljOiAnU3VtJyxcbiAgICAgICAgICBwZXJpb2Q6IGNkay5EdXJhdGlvbi5taW51dGVzKDUpLFxuICAgICAgICB9KVxuICAgICAgKSxcbiAgICB9KTtcblxuICAgIHRoaXMuZGFzaGJvYXJkLmFkZFdpZGdldHMobGFtYmRhRXJyb3JzV2lkZ2V0LCBsYW1iZGFEdXJhdGlvbldpZGdldCk7XG4gICAgdGhpcy5kYXNoYm9hcmQuYWRkV2lkZ2V0cyhsYW1iZGFJbnZvY2F0aW9uc1dpZGdldCk7XG5cbiAgICAvLyBEeW5hbW9EQiBNZXRyaWNzXG4gICAgY29uc3QgZHluYW1vUmVhZFdpZGdldCA9IG5ldyBjbG91ZHdhdGNoLkdyYXBoV2lkZ2V0KHtcbiAgICAgIHRpdGxlOiAnRHluYW1vREIgUmVhZCBDYXBhY2l0eScsXG4gICAgICB3aWR0aDogMTIsXG4gICAgICBoZWlnaHQ6IDYsXG4gICAgICBsZWZ0OiBkeW5hbW9kYlRhYmxlcy5tYXAodGFibGUgPT4gXG4gICAgICAgIG5ldyBjbG91ZHdhdGNoLk1ldHJpYyh7XG4gICAgICAgICAgbmFtZXNwYWNlOiAnQVdTL0R5bmFtb0RCJyxcbiAgICAgICAgICBtZXRyaWNOYW1lOiAnQ29uc3VtZWRSZWFkQ2FwYWNpdHlVbml0cycsXG4gICAgICAgICAgZGltZW5zaW9uc01hcDoge1xuICAgICAgICAgICAgVGFibGVOYW1lOiB0YWJsZS50YWJsZU5hbWUsXG4gICAgICAgICAgfSxcbiAgICAgICAgICBzdGF0aXN0aWM6ICdTdW0nLFxuICAgICAgICAgIHBlcmlvZDogY2RrLkR1cmF0aW9uLm1pbnV0ZXMoNSksXG4gICAgICAgIH0pXG4gICAgICApLFxuICAgIH0pO1xuXG4gICAgY29uc3QgZHluYW1vV3JpdGVXaWRnZXQgPSBuZXcgY2xvdWR3YXRjaC5HcmFwaFdpZGdldCh7XG4gICAgICB0aXRsZTogJ0R5bmFtb0RCIFdyaXRlIENhcGFjaXR5JyxcbiAgICAgIHdpZHRoOiAxMixcbiAgICAgIGhlaWdodDogNixcbiAgICAgIGxlZnQ6IGR5bmFtb2RiVGFibGVzLm1hcCh0YWJsZSA9PiBcbiAgICAgICAgbmV3IGNsb3Vkd2F0Y2guTWV0cmljKHtcbiAgICAgICAgICBuYW1lc3BhY2U6ICdBV1MvRHluYW1vREInLFxuICAgICAgICAgIG1ldHJpY05hbWU6ICdDb25zdW1lZFdyaXRlQ2FwYWNpdHlVbml0cycsXG4gICAgICAgICAgZGltZW5zaW9uc01hcDoge1xuICAgICAgICAgICAgVGFibGVOYW1lOiB0YWJsZS50YWJsZU5hbWUsXG4gICAgICAgICAgfSxcbiAgICAgICAgICBzdGF0aXN0aWM6ICdTdW0nLFxuICAgICAgICAgIHBlcmlvZDogY2RrLkR1cmF0aW9uLm1pbnV0ZXMoNSksXG4gICAgICAgIH0pXG4gICAgICApLFxuICAgIH0pO1xuXG4gICAgdGhpcy5kYXNoYm9hcmQuYWRkV2lkZ2V0cyhkeW5hbW9SZWFkV2lkZ2V0LCBkeW5hbW9Xcml0ZVdpZGdldCk7XG5cbiAgICAvLyBDcmVhdGUgQWxhcm1zIGZvciBDcml0aWNhbCBNZXRyaWNzXG4gICAgXG4gICAgLy8gQVBJIEdhdGV3YXkgNVhYIEVycm9yIEFsYXJtXG4gICAgY29uc3QgYXBpR2F0ZXdheTV4eEFsYXJtID0gbmV3IGNsb3Vkd2F0Y2guQWxhcm0odGhpcywgJ0FwaUdhdGV3YXk1eHhBbGFybScsIHtcbiAgICAgIGFsYXJtTmFtZTogYCR7cmVzb3VyY2VQcmVmaXh9LUFwaUdhdGV3YXktNVhYLUVycm9yc2AsXG4gICAgICBtZXRyaWM6IG5ldyBjbG91ZHdhdGNoLk1ldHJpYyh7XG4gICAgICAgIG5hbWVzcGFjZTogJ0FXUy9BcGlHYXRld2F5JyxcbiAgICAgICAgbWV0cmljTmFtZTogJzVYWEVycm9yJyxcbiAgICAgICAgZGltZW5zaW9uc01hcDoge1xuICAgICAgICAgIEFwaU5hbWU6IGFwaUdhdGV3YXkucmVzdEFwaU5hbWUsXG4gICAgICAgIH0sXG4gICAgICAgIHN0YXRpc3RpYzogJ1N1bScsXG4gICAgICAgIHBlcmlvZDogY2RrLkR1cmF0aW9uLm1pbnV0ZXMoNSksXG4gICAgICB9KSxcbiAgICAgIHRocmVzaG9sZDogNSxcbiAgICAgIGV2YWx1YXRpb25QZXJpb2RzOiAyLFxuICAgICAgY29tcGFyaXNvbk9wZXJhdG9yOiBjbG91ZHdhdGNoLkNvbXBhcmlzb25PcGVyYXRvci5HUkVBVEVSX1RIQU5fVEhSRVNIT0xELFxuICAgICAgYWxhcm1EZXNjcmlwdGlvbjogJ0FQSSBHYXRld2F5IDVYWCBlcnJvcnMgZXhjZWVkIHRocmVzaG9sZCcsXG4gICAgICB0cmVhdE1pc3NpbmdEYXRhOiBjbG91ZHdhdGNoLlRyZWF0TWlzc2luZ0RhdGEuTk9UX0JSRUFDSElORyxcbiAgICB9KTtcblxuICAgIC8vIExhbWJkYSBFcnJvciBSYXRlIEFsYXJtIChmb3IgY3JpdGljYWwgZnVuY3Rpb25zKVxuICAgIGNvbnN0IGNyaXRpY2FsRnVuY3Rpb25zID0gWydBdXRoTG9naW4nLCAnUGF5bWVudEludGVudCcsICdQYXltZW50V2ViaG9vayddO1xuICAgIGxhbWJkYUZ1bmN0aW9uc1xuICAgICAgLmZpbHRlcihmdW5jID0+IGNyaXRpY2FsRnVuY3Rpb25zLnNvbWUobmFtZSA9PiBmdW5jLmZ1bmN0aW9uTmFtZS5pbmNsdWRlcyhuYW1lKSkpXG4gICAgICAuZm9yRWFjaCgoZnVuYywgaW5kZXgpID0+IHtcbiAgICAgICAgbmV3IGNsb3Vkd2F0Y2guQWxhcm0odGhpcywgYExhbWJkYUVycm9yQWxhcm0ke2luZGV4fWAsIHtcbiAgICAgICAgICBhbGFybU5hbWU6IGAke3Jlc291cmNlUHJlZml4fS1MYW1iZGEtJHtmdW5jLmZ1bmN0aW9uTmFtZX0tRXJyb3JzYCxcbiAgICAgICAgICBtZXRyaWM6IG5ldyBjbG91ZHdhdGNoLk1ldHJpYyh7XG4gICAgICAgICAgICBuYW1lc3BhY2U6ICdBV1MvTGFtYmRhJyxcbiAgICAgICAgICAgIG1ldHJpY05hbWU6ICdFcnJvcnMnLFxuICAgICAgICAgICAgZGltZW5zaW9uc01hcDoge1xuICAgICAgICAgICAgICBGdW5jdGlvbk5hbWU6IGZ1bmMuZnVuY3Rpb25OYW1lLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHN0YXRpc3RpYzogJ1N1bScsXG4gICAgICAgICAgICBwZXJpb2Q6IGNkay5EdXJhdGlvbi5taW51dGVzKDUpLFxuICAgICAgICAgIH0pLFxuICAgICAgICAgIHRocmVzaG9sZDogMyxcbiAgICAgICAgICBldmFsdWF0aW9uUGVyaW9kczogMixcbiAgICAgICAgICBjb21wYXJpc29uT3BlcmF0b3I6IGNsb3Vkd2F0Y2guQ29tcGFyaXNvbk9wZXJhdG9yLkdSRUFURVJfVEhBTl9USFJFU0hPTEQsXG4gICAgICAgICAgYWxhcm1EZXNjcmlwdGlvbjogYExhbWJkYSBmdW5jdGlvbiAke2Z1bmMuZnVuY3Rpb25OYW1lfSBlcnJvcnMgZXhjZWVkIHRocmVzaG9sZGAsXG4gICAgICAgICAgdHJlYXRNaXNzaW5nRGF0YTogY2xvdWR3YXRjaC5UcmVhdE1pc3NpbmdEYXRhLk5PVF9CUkVBQ0hJTkcsXG4gICAgICAgIH0pO1xuICAgICAgfSk7XG5cbiAgICAvLyBIaWdoIER1cmF0aW9uIEFsYXJtIGZvciBMYW1iZGEgZnVuY3Rpb25zXG4gICAgbGFtYmRhRnVuY3Rpb25zLmZvckVhY2goKGZ1bmMsIGluZGV4KSA9PiB7XG4gICAgICBuZXcgY2xvdWR3YXRjaC5BbGFybSh0aGlzLCBgTGFtYmRhRHVyYXRpb25BbGFybSR7aW5kZXh9YCwge1xuICAgICAgICBhbGFybU5hbWU6IGAke3Jlc291cmNlUHJlZml4fS1MYW1iZGEtJHtmdW5jLmZ1bmN0aW9uTmFtZX0tRHVyYXRpb25gLFxuICAgICAgICBtZXRyaWM6IG5ldyBjbG91ZHdhdGNoLk1ldHJpYyh7XG4gICAgICAgICAgbmFtZXNwYWNlOiAnQVdTL0xhbWJkYScsXG4gICAgICAgICAgbWV0cmljTmFtZTogJ0R1cmF0aW9uJyxcbiAgICAgICAgICBkaW1lbnNpb25zTWFwOiB7XG4gICAgICAgICAgICBGdW5jdGlvbk5hbWU6IGZ1bmMuZnVuY3Rpb25OYW1lLFxuICAgICAgICAgIH0sXG4gICAgICAgICAgc3RhdGlzdGljOiAnQXZlcmFnZScsXG4gICAgICAgICAgcGVyaW9kOiBjZGsuRHVyYXRpb24ubWludXRlcyg1KSxcbiAgICAgICAgfSksXG4gICAgICAgIHRocmVzaG9sZDogMTUwMDAsIC8vIDE1IHNlY29uZHNcbiAgICAgICAgZXZhbHVhdGlvblBlcmlvZHM6IDMsXG4gICAgICAgIGNvbXBhcmlzb25PcGVyYXRvcjogY2xvdWR3YXRjaC5Db21wYXJpc29uT3BlcmF0b3IuR1JFQVRFUl9USEFOX1RIUkVTSE9MRCxcbiAgICAgICAgYWxhcm1EZXNjcmlwdGlvbjogYExhbWJkYSBmdW5jdGlvbiAke2Z1bmMuZnVuY3Rpb25OYW1lfSBkdXJhdGlvbiBpcyB0b28gaGlnaGAsXG4gICAgICAgIHRyZWF0TWlzc2luZ0RhdGE6IGNsb3Vkd2F0Y2guVHJlYXRNaXNzaW5nRGF0YS5OT1RfQlJFQUNISU5HLFxuICAgICAgfSk7XG4gICAgfSk7XG5cbiAgICAvLyBEeW5hbW9EQiBUaHJvdHRsaW5nIEFsYXJtc1xuICAgIGR5bmFtb2RiVGFibGVzLmZvckVhY2goKHRhYmxlLCBpbmRleCkgPT4ge1xuICAgICAgbmV3IGNsb3Vkd2F0Y2guQWxhcm0odGhpcywgYER5bmFtb1Rocm90dGxlUmVhZEFsYXJtJHtpbmRleH1gLCB7XG4gICAgICAgIGFsYXJtTmFtZTogYCR7cmVzb3VyY2VQcmVmaXh9LUR5bmFtb0RCLSR7dGFibGUudGFibGVOYW1lfS1SZWFkVGhyb3R0bGVgLFxuICAgICAgICBtZXRyaWM6IG5ldyBjbG91ZHdhdGNoLk1ldHJpYyh7XG4gICAgICAgICAgbmFtZXNwYWNlOiAnQVdTL0R5bmFtb0RCJyxcbiAgICAgICAgICBtZXRyaWNOYW1lOiAnUmVhZFRocm90dGxlZEV2ZW50cycsXG4gICAgICAgICAgZGltZW5zaW9uc01hcDoge1xuICAgICAgICAgICAgVGFibGVOYW1lOiB0YWJsZS50YWJsZU5hbWUsXG4gICAgICAgICAgfSxcbiAgICAgICAgICBzdGF0aXN0aWM6ICdTdW0nLFxuICAgICAgICAgIHBlcmlvZDogY2RrLkR1cmF0aW9uLm1pbnV0ZXMoNSksXG4gICAgICAgIH0pLFxuICAgICAgICB0aHJlc2hvbGQ6IDEsXG4gICAgICAgIGV2YWx1YXRpb25QZXJpb2RzOiAxLFxuICAgICAgICBjb21wYXJpc29uT3BlcmF0b3I6IGNsb3Vkd2F0Y2guQ29tcGFyaXNvbk9wZXJhdG9yLkdSRUFURVJfVEhBTl9PUl9FUVVBTF9UT19USFJFU0hPTEQsXG4gICAgICAgIGFsYXJtRGVzY3JpcHRpb246IGBEeW5hbW9EQiB0YWJsZSAke3RhYmxlLnRhYmxlTmFtZX0gcmVhZCB0aHJvdHRsaW5nIGRldGVjdGVkYCxcbiAgICAgICAgdHJlYXRNaXNzaW5nRGF0YTogY2xvdWR3YXRjaC5UcmVhdE1pc3NpbmdEYXRhLk5PVF9CUkVBQ0hJTkcsXG4gICAgICB9KTtcblxuICAgICAgbmV3IGNsb3Vkd2F0Y2guQWxhcm0odGhpcywgYER5bmFtb1Rocm90dGxlV3JpdGVBbGFybSR7aW5kZXh9YCwge1xuICAgICAgICBhbGFybU5hbWU6IGAke3Jlc291cmNlUHJlZml4fS1EeW5hbW9EQi0ke3RhYmxlLnRhYmxlTmFtZX0tV3JpdGVUaHJvdHRsZWAsXG4gICAgICAgIG1ldHJpYzogbmV3IGNsb3Vkd2F0Y2guTWV0cmljKHtcbiAgICAgICAgICBuYW1lc3BhY2U6ICdBV1MvRHluYW1vREInLFxuICAgICAgICAgIG1ldHJpY05hbWU6ICdXcml0ZVRocm90dGxlZEV2ZW50cycsXG4gICAgICAgICAgZGltZW5zaW9uc01hcDoge1xuICAgICAgICAgICAgVGFibGVOYW1lOiB0YWJsZS50YWJsZU5hbWUsXG4gICAgICAgICAgfSxcbiAgICAgICAgICBzdGF0aXN0aWM6ICdTdW0nLFxuICAgICAgICAgIHBlcmlvZDogY2RrLkR1cmF0aW9uLm1pbnV0ZXMoNSksXG4gICAgICAgIH0pLFxuICAgICAgICB0aHJlc2hvbGQ6IDEsXG4gICAgICAgIGV2YWx1YXRpb25QZXJpb2RzOiAxLFxuICAgICAgICBjb21wYXJpc29uT3BlcmF0b3I6IGNsb3Vkd2F0Y2guQ29tcGFyaXNvbk9wZXJhdG9yLkdSRUFURVJfVEhBTl9PUl9FUVVBTF9UT19USFJFU0hPTEQsXG4gICAgICAgIGFsYXJtRGVzY3JpcHRpb246IGBEeW5hbW9EQiB0YWJsZSAke3RhYmxlLnRhYmxlTmFtZX0gd3JpdGUgdGhyb3R0bGluZyBkZXRlY3RlZGAsXG4gICAgICAgIHRyZWF0TWlzc2luZ0RhdGE6IGNsb3Vkd2F0Y2guVHJlYXRNaXNzaW5nRGF0YS5OT1RfQlJFQUNISU5HLFxuICAgICAgfSk7XG4gICAgfSk7XG5cbiAgICAvLyBMb2cgR3JvdXBzIGZvciBMYW1iZGEgZnVuY3Rpb25zXG4gICAgbGFtYmRhRnVuY3Rpb25zLmZvckVhY2goZnVuYyA9PiB7XG4gICAgICBuZXcgbG9ncy5Mb2dHcm91cCh0aGlzLCBgJHtmdW5jLm5vZGUuaWR9TG9nR3JvdXBgLCB7XG4gICAgICAgIGxvZ0dyb3VwTmFtZTogYC9hd3MvbGFtYmRhLyR7ZnVuYy5mdW5jdGlvbk5hbWV9YCxcbiAgICAgICAgcmV0ZW50aW9uOiBzdGFnZSA9PT0gJ3Byb2QnID8gbG9ncy5SZXRlbnRpb25EYXlzLk9ORV9NT05USCA6IGxvZ3MuUmV0ZW50aW9uRGF5cy5PTkVfV0VFSyxcbiAgICAgICAgcmVtb3ZhbFBvbGljeTogc3RhZ2UgPT09ICdwcm9kJyA/IGNkay5SZW1vdmFsUG9saWN5LlJFVEFJTiA6IGNkay5SZW1vdmFsUG9saWN5LkRFU1RST1ksXG4gICAgICB9KTtcbiAgICB9KTtcblxuICAgIC8vIERhc2hib2FyZCBVUkwgZm9yIG91dHB1dHNcbiAgICB0aGlzLmRhc2hib2FyZFVybCA9IGBodHRwczovLyR7dGhpcy5yZWdpb259LmNvbnNvbGUuYXdzLmFtYXpvbi5jb20vY2xvdWR3YXRjaC9ob21lP3JlZ2lvbj0ke3RoaXMucmVnaW9ufSNkYXNoYm9hcmRzOm5hbWU9JHtyZXNvdXJjZVByZWZpeH0tTGFtYmRhLURhc2hib2FyZGA7XG5cbiAgICAvLyBUYWdzXG4gICAgY2RrLlRhZ3Mub2YodGhpcy5kYXNoYm9hcmQpLmFkZCgnU2VydmljZScsICdHYWJpWW9nYUxhbWJkYScpO1xuICAgIGNkay5UYWdzLm9mKHRoaXMuZGFzaGJvYXJkKS5hZGQoJ0Vudmlyb25tZW50Jywgc3RhZ2UpO1xuICAgIGNkay5UYWdzLm9mKHRoaXMuZGFzaGJvYXJkKS5hZGQoJ1B1cnBvc2UnLCAnTW9uaXRvcmluZycpO1xuXG4gICAgLy8gT3V0cHV0c1xuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdEYXNoYm9hcmROYW1lJywge1xuICAgICAgdmFsdWU6IHRoaXMuZGFzaGJvYXJkLmRhc2hib2FyZE5hbWUsXG4gICAgICBkZXNjcmlwdGlvbjogJ0Nsb3VkV2F0Y2ggRGFzaGJvYXJkIG5hbWUnLFxuICAgICAgZXhwb3J0TmFtZTogYCR7cmVzb3VyY2VQcmVmaXh9LURhc2hib2FyZE5hbWVgLFxuICAgIH0pO1xuXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ0FwaUdhdGV3YXk1eHhBbGFybU5hbWUnLCB7XG4gICAgICB2YWx1ZTogYXBpR2F0ZXdheTV4eEFsYXJtLmFsYXJtTmFtZSxcbiAgICAgIGRlc2NyaXB0aW9uOiAnQVBJIEdhdGV3YXkgNVhYIGVycm9yIGFsYXJtIG5hbWUnLFxuICAgICAgZXhwb3J0TmFtZTogYCR7cmVzb3VyY2VQcmVmaXh9LUFwaUdhdGV3YXk1eHhBbGFybU5hbWVgLFxuICAgIH0pO1xuICB9XG59XG4iXX0=