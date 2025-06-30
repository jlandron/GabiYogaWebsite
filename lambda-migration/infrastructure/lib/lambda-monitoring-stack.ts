import * as cdk from 'aws-cdk-lib';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as logs from 'aws-cdk-lib/aws-logs';
import { Construct } from 'constructs';

export interface LambdaMonitoringStackProps extends cdk.StackProps {
  stage: string;
  apiGateway: apigateway.RestApi;
  lambdaFunctions: lambda.Function[];
  dynamodbTables: dynamodb.Table[];
}

export class LambdaMonitoringStack extends cdk.Stack {
  public readonly dashboardUrl: string;
  public readonly dashboard: cloudwatch.Dashboard;

  constructor(scope: Construct, id: string, props: LambdaMonitoringStackProps) {
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
      left: lambdaFunctions.map(func => 
        new cloudwatch.Metric({
          namespace: 'AWS/Lambda',
          metricName: 'Errors',
          dimensionsMap: {
            FunctionName: func.functionName,
          },
          statistic: 'Sum',
          period: cdk.Duration.minutes(5),
        })
      ),
    });

    const lambdaDurationWidget = new cloudwatch.GraphWidget({
      title: 'Lambda Function Duration',
      width: 12,
      height: 6,
      left: lambdaFunctions.map(func => 
        new cloudwatch.Metric({
          namespace: 'AWS/Lambda',
          metricName: 'Duration',
          dimensionsMap: {
            FunctionName: func.functionName,
          },
          statistic: 'Average',
          period: cdk.Duration.minutes(5),
        })
      ),
    });

    const lambdaInvocationsWidget = new cloudwatch.GraphWidget({
      title: 'Lambda Function Invocations',
      width: 12,
      height: 6,
      left: lambdaFunctions.map(func => 
        new cloudwatch.Metric({
          namespace: 'AWS/Lambda',
          metricName: 'Invocations',
          dimensionsMap: {
            FunctionName: func.functionName,
          },
          statistic: 'Sum',
          period: cdk.Duration.minutes(5),
        })
      ),
    });

    this.dashboard.addWidgets(lambdaErrorsWidget, lambdaDurationWidget);
    this.dashboard.addWidgets(lambdaInvocationsWidget);

    // DynamoDB Metrics
    const dynamoReadWidget = new cloudwatch.GraphWidget({
      title: 'DynamoDB Read Capacity',
      width: 12,
      height: 6,
      left: dynamodbTables.map(table => 
        new cloudwatch.Metric({
          namespace: 'AWS/DynamoDB',
          metricName: 'ConsumedReadCapacityUnits',
          dimensionsMap: {
            TableName: table.tableName,
          },
          statistic: 'Sum',
          period: cdk.Duration.minutes(5),
        })
      ),
    });

    const dynamoWriteWidget = new cloudwatch.GraphWidget({
      title: 'DynamoDB Write Capacity',
      width: 12,
      height: 6,
      left: dynamodbTables.map(table => 
        new cloudwatch.Metric({
          namespace: 'AWS/DynamoDB',
          metricName: 'ConsumedWriteCapacityUnits',
          dimensionsMap: {
            TableName: table.tableName,
          },
          statistic: 'Sum',
          period: cdk.Duration.minutes(5),
        })
      ),
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
        threshold: 15000, // 15 seconds
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
