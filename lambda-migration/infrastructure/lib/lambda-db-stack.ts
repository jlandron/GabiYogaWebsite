import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import { Construct } from 'constructs';

export interface LambdaDbStackProps extends cdk.StackProps {
  stage: string;
}

export class LambdaDbStack extends cdk.Stack {
  public readonly usersTable: dynamodb.Table;
  public readonly blogPostsTable: dynamodb.Table;
  public readonly classesTable: dynamodb.Table;
  public readonly bookingsTable: dynamodb.Table;
  public readonly retreatsTable: dynamodb.Table;
  public readonly workshopsTable: dynamodb.Table;
  public readonly galleryTable: dynamodb.Table;
  public readonly settingsTable: dynamodb.Table;
  public readonly communicationsTable: dynamodb.Table;
  public readonly jwtBlacklistTable: dynamodb.Table;
  public readonly dynamodbTables: dynamodb.Table[];

  constructor(scope: Construct, id: string, props: LambdaDbStackProps) {
    super(scope, id, props);

    const { stage } = props;
    const tableNamePrefix = `GabiYoga-${stage}`;

    // Common table properties
    const commonTableProps = {
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      pointInTimeRecovery: true,
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
      removalPolicy: stage === 'prod' ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
    };

    // Users Table
    this.usersTable = new dynamodb.Table(this, 'UsersTable', {
      ...commonTableProps,
      tableName: `${tableNamePrefix}-Users`,
      partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING },
      stream: dynamodb.StreamViewType.NEW_AND_OLD_IMAGES,
    });

    this.usersTable.addGlobalSecondaryIndex({
      indexName: 'EmailIndex',
      partitionKey: { name: 'email', type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });
    
    // Add a GSI for password reset tokens
    this.usersTable.addGlobalSecondaryIndex({
      indexName: 'ResetTokenIndex',
      partitionKey: { name: 'resetToken', type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    // Blog Posts Table
    this.blogPostsTable = new dynamodb.Table(this, 'BlogPostsTable', {
      ...commonTableProps,
      tableName: `${tableNamePrefix}-BlogPosts`,
      partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING },
      stream: dynamodb.StreamViewType.NEW_AND_OLD_IMAGES,
    });

    this.blogPostsTable.addGlobalSecondaryIndex({
      indexName: 'StatusIndex',
      partitionKey: { name: 'status', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'publishedAt', type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    this.blogPostsTable.addGlobalSecondaryIndex({
      indexName: 'CreatedAtIndex',
      partitionKey: { name: 'status', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'createdAt', type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    this.blogPostsTable.addGlobalSecondaryIndex({
      indexName: 'SlugIndex',
      partitionKey: { name: 'slug', type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    // Classes Table
    this.classesTable = new dynamodb.Table(this, 'ClassesTable', {
      ...commonTableProps,
      tableName: `${tableNamePrefix}-Classes`,
      partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING },
      stream: dynamodb.StreamViewType.NEW_AND_OLD_IMAGES,
    });

    this.classesTable.addGlobalSecondaryIndex({
      indexName: 'DateTimeIndex',
      partitionKey: { name: 'date', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'time', type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    this.classesTable.addGlobalSecondaryIndex({
      indexName: 'StatusIndex',
      partitionKey: { name: 'status', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'date', type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    // Bookings Table
    this.bookingsTable = new dynamodb.Table(this, 'BookingsTable', {
      ...commonTableProps,
      tableName: `${tableNamePrefix}-Bookings`,
      partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING },
      stream: dynamodb.StreamViewType.NEW_AND_OLD_IMAGES,
    });

    this.bookingsTable.addGlobalSecondaryIndex({
      indexName: 'UserBookingsIndex',
      partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'createdAt', type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    this.bookingsTable.addGlobalSecondaryIndex({
      indexName: 'ClassBookingsIndex',
      partitionKey: { name: 'classId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'createdAt', type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    this.bookingsTable.addGlobalSecondaryIndex({
      indexName: 'StatusIndex',
      partitionKey: { name: 'status', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'createdAt', type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    // Retreats Table
    this.retreatsTable = new dynamodb.Table(this, 'RetreatsTable', {
      ...commonTableProps,
      tableName: `${tableNamePrefix}-Retreats`,
      partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING },
      stream: dynamodb.StreamViewType.NEW_AND_OLD_IMAGES,
    });

    this.retreatsTable.addGlobalSecondaryIndex({
      indexName: 'StatusIndex',
      partitionKey: { name: 'status', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'startDate', type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    this.retreatsTable.addGlobalSecondaryIndex({
      indexName: 'FeaturedIndex',
      partitionKey: { name: 'featured', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'startDate', type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    // Workshops Table
    this.workshopsTable = new dynamodb.Table(this, 'WorkshopsTable', {
      ...commonTableProps,
      tableName: `${tableNamePrefix}-Workshops`,
      partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING },
      stream: dynamodb.StreamViewType.NEW_AND_OLD_IMAGES,
    });

    this.workshopsTable.addGlobalSecondaryIndex({
      indexName: 'StatusIndex',
      partitionKey: { name: 'status', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'date', type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    // Gallery Table
    this.galleryTable = new dynamodb.Table(this, 'GalleryTable', {
      ...commonTableProps,
      tableName: `${tableNamePrefix}-Gallery`,
      partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING },
      stream: dynamodb.StreamViewType.NEW_AND_OLD_IMAGES,
    });

    this.galleryTable.addGlobalSecondaryIndex({
      indexName: 'CategoryIndex',
      partitionKey: { name: 'category', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'createdAt', type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    this.galleryTable.addGlobalSecondaryIndex({
      indexName: 'StatusIndex',
      partitionKey: { name: 'status', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'createdAt', type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    // Settings Table
    this.settingsTable = new dynamodb.Table(this, 'SettingsTable', {
      ...commonTableProps,
      tableName: `${tableNamePrefix}-Settings`,
      partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING },
      stream: dynamodb.StreamViewType.NEW_AND_OLD_IMAGES,
    });

    this.settingsTable.addGlobalSecondaryIndex({
      indexName: 'CategoryIndex',
      partitionKey: { name: 'category', type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    // Communications Table
    this.communicationsTable = new dynamodb.Table(this, 'CommunicationsTable', {
      ...commonTableProps,
      tableName: `${tableNamePrefix}-Communications`,
      partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING },
      stream: dynamodb.StreamViewType.NEW_AND_OLD_IMAGES,
    });

    this.communicationsTable.addGlobalSecondaryIndex({
      indexName: 'TypeIndex',
      partitionKey: { name: 'type', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'createdAt', type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    this.communicationsTable.addGlobalSecondaryIndex({
      indexName: 'StatusIndex',
      partitionKey: { name: 'status', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'createdAt', type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    // JWT Blacklist Table (for logout functionality)
    this.jwtBlacklistTable = new dynamodb.Table(this, 'JWTBlacklistTable', {
      ...commonTableProps,
      tableName: `${tableNamePrefix}-JWTBlacklist`,
      partitionKey: { name: 'tokenId', type: dynamodb.AttributeType.STRING },
      timeToLiveAttribute: 'expiresAt',
    });

    // Array of all tables for monitoring
    this.dynamodbTables = [
      this.usersTable,
      this.blogPostsTable,
      this.classesTable,
      this.bookingsTable,
      this.retreatsTable,
      this.workshopsTable,
      this.galleryTable,
      this.settingsTable,
      this.communicationsTable,
      this.jwtBlacklistTable,
    ];

    // Add tags to all tables
    this.dynamodbTables.forEach((table, index) => {
      cdk.Tags.of(table).add('Service', 'GabiYogaLambda');
      cdk.Tags.of(table).add('Environment', stage);
      cdk.Tags.of(table).add('TableIndex', index.toString());
    });

    // Outputs
    new cdk.CfnOutput(this, 'UsersTableName', {
      value: this.usersTable.tableName,
      description: 'Users table name',
      exportName: `${tableNamePrefix}-UsersTableName`,
    });

    new cdk.CfnOutput(this, 'BlogPostsTableName', {
      value: this.blogPostsTable.tableName,
      description: 'Blog posts table name',
      exportName: `${tableNamePrefix}-BlogPostsTableName`,
    });

    new cdk.CfnOutput(this, 'ClassesTableName', {
      value: this.classesTable.tableName,
      description: 'Classes table name',
      exportName: `${tableNamePrefix}-ClassesTableName`,
    });

    new cdk.CfnOutput(this, 'BookingsTableName', {
      value: this.bookingsTable.tableName,
      description: 'Bookings table name',
      exportName: `${tableNamePrefix}-BookingsTableName`,
    });
  }
}
