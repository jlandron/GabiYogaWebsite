h# Gabi Yoga Lambda Migration Plan 🚀

## Overview
Complete migration from EC2/Express.js/MySQL to AWS Lambda/API Gateway/DynamoDB microservices architecture with zero-downtime deployment.

## Migration Strategy
- **Approach**: Complete migration with microservices architecture
- **Database**: MySQL → DynamoDB
- **Authentication**: Session-based → JWT-only
- **Deployment**: Blue-green with gradual traffic routing
- **Timeline**: 8 weeks

---

## Phase 1: Infrastructure Foundation (Week 1)

### 1.1 Directory Structure Setup
```
lambda-migration/
├── infrastructure/                # CDK Infrastructure (TypeScript)
│   ├── package.json              # CDK dependencies
│   ├── tsconfig.json             # TypeScript configuration
│   ├── cdk.json                  # CDK configuration
│   ├── bin/                      # CDK apps
│   │   └── lambda-stack.ts       # Main CDK app
│   └── lib/                      # CDK stacks
│       ├── lambda-api-stack.ts   # API Gateway + Lambda functions
│       ├── lambda-db-stack.ts    # DynamoDB tables
│       ├── lambda-auth-stack.ts  # Authentication resources
│       └── lambda-monitoring-stack.ts # CloudWatch monitoring
├── lambda/                       # Lambda function source code
│   ├── auth/                     # Authentication microservice
│   │   ├── login.js              # POST /auth/login
│   │   ├── register.js           # POST /auth/register
│   │   ├── refresh.js            # POST /auth/refresh
│   │   ├── logout.js             # POST /auth/logout
│   │   ├── forgot.js             # POST /auth/forgot
│   │   └── verify.js             # GET /auth/verify
│   ├── blog/                     # Blog management microservice
│   │   ├── list.js               # GET /blog
│   │   ├── get.js                # GET /blog/:id
│   │   ├── create.js             # POST /blog
│   │   ├── update.js             # PUT /blog/:id
│   │   ├── delete.js             # DELETE /blog/:id
│   │   └── publish.js            # POST /blog/:id/publish
│   ├── admin/                    # Admin operations microservice
│   │   ├── dashboard.js          # GET /admin/dashboard
│   │   ├── users.js              # GET /admin/users
│   │   ├── settings.js           # PUT /admin/settings
│   │   ├── analytics.js          # GET /admin/analytics
│   │   └── communications.js     # POST /admin/communications
│   ├── gallery/                  # Gallery/images microservice
│   │   ├── list.js               # GET /gallery
│   │   ├── upload.js             # POST /gallery/upload
│   │   ├── save.js               # POST /gallery
│   │   └── delete.js             # DELETE /gallery/:id
│   ├── booking/                  # Class booking microservice
│   │   ├── classes.js            # GET /classes
│   │   ├── book.js               # POST /classes/:id/book
│   │   ├── list-bookings.js      # GET /bookings
│   │   ├── modify.js             # PUT /bookings/:id
│   │   └── cancel.js             # DELETE /bookings/:id
│   ├── payment/                  # Payment processing microservice
│   │   ├── intent.js             # POST /payment/intent
│   │   ├── webhook.js            # POST /payment/webhook
│   │   └── history.js            # GET /payment/history
│   └── shared/                   # Common utilities
│       ├── dynamodb-client.js    # DynamoDB connection helper
│       ├── jwt-utils.js          # JWT token management
│       ├── s3-utils.js           # S3 operations
│       ├── validation.js         # Input validation schemas
│       ├── error-handler.js      # Common error handling
│       ├── cors-handler.js       # CORS configuration
│       └── logger.js             # CloudWatch logging
├── database/                     # Database migration and schemas
│   ├── schemas/                  # DynamoDB table schemas
│   │   ├── users.js              # Users table definition
│   │   ├── blog-posts.js         # BlogPosts table definition
│   │   ├── classes.js            # Classes table definition
│   │   ├── bookings.js           # Bookings table definition
│   │   ├── retreats.js           # Retreats table definition
│   │   ├── workshops.js          # Workshops table definition
│   │   ├── gallery.js            # Gallery table definition
│   │   ├── settings.js           # Settings table definition
│   │   └── communications.js     # Communications table definition
│   ├── migrations/               # Data migration scripts
│   │   ├── mysql-to-dynamodb.js  # Main migration orchestrator
│   │   ├── migrate-users.js      # User data migration
│   │   ├── migrate-blog.js       # Blog posts migration
│   │   ├── migrate-classes.js    # Classes/schedule migration
│   │   ├── migrate-settings.js   # Website settings migration
│   │   └── validate-migration.js # Data consistency checks
│   └── seeders/                  # Development data seeders
│       ├── dev-users.js          # Development user data
│       ├── dev-blog.js           # Sample blog posts
│       └── dev-classes.js        # Sample classes
├── scripts/                      # Deployment and utility scripts
│   ├── deploy-dev.sh             # Development deployment
│   ├── deploy-prod.sh            # Production deployment
│   ├── migrate-data.sh           # Database migration runner
│   ├── traffic-routing.sh        # Gradual traffic cutover
│   └── rollback.sh               # Emergency rollback
├── tests/                        # Test suites
│   ├── unit/                     # Unit tests for Lambda functions
│   ├── integration/              # Integration tests
│   └── e2e/                      # End-to-end API tests
└── docs/                         # Documentation
    ├── API.md                    # API documentation
    ├── DEPLOYMENT.md             # Deployment procedures
    └── TROUBLESHOOTING.md        # Common issues and solutions
```

### 1.2 Development Environment Setup
- **Tools**: AWS CDK, SAM CLI, DynamoDB Local
- **Testing**: Jest, Supertest, DynamoDB Local  
- **Development**: SAM Local for Lambda function testing
- **Monitoring**: CloudWatch, X-Ray tracing
- **Infrastructure**: CDK for type-safe infrastructure as code

### 1.3 AWS Resources (Development)
- **API Gateway**: `api-dev.gabi.yoga`
- **DynamoDB**: Tables with `-dev` suffix
- **Lambda Functions**: Separate dev versions with `-dev` suffix
- **S3 Bucket**: `gabi-yoga-dev-assets`
- **CloudWatch**: Separate log groups for dev environment

---

## Phase 2: Database Migration Strategy (Week 2)

### 2.1 DynamoDB Table Design

#### Users Table
```javascript
{
  TableName: 'Users',
  KeySchema: [
    { AttributeName: 'id', KeyType: 'HASH' }
  ],
  AttributeDefinitions: [
    { AttributeName: 'id', AttributeType: 'S' },
    { AttributeName: 'email', AttributeType: 'S' }
  ],
  GlobalSecondaryIndexes: [
    {
      IndexName: 'EmailIndex',
      KeySchema: [{ AttributeName: 'email', KeyType: 'HASH' }],
      Projection: { ProjectionType: 'ALL' }
    }
  ]
}
```

#### BlogPosts Table
```javascript
{
  TableName: 'BlogPosts',
  KeySchema: [
    { AttributeName: 'id', KeyType: 'HASH' }
  ],
  AttributeDefinitions: [
    { AttributeName: 'id', AttributeType: 'S' },
    { AttributeName: 'status', AttributeType: 'S' },
    { AttributeName: 'publishedAt', AttributeType: 'S' }
  ],
  GlobalSecondaryIndexes: [
    {
      IndexName: 'StatusIndex',
      KeySchema: [
        { AttributeName: 'status', KeyType: 'HASH' },
        { AttributeName: 'publishedAt', KeyType: 'RANGE' }
      ],
      Projection: { ProjectionType: 'ALL' }
    }
  ]
}
```

#### Classes Table
```javascript
{
  TableName: 'Classes',
  KeySchema: [
    { AttributeName: 'id', KeyType: 'HASH' }
  ],
  AttributeDefinitions: [
    { AttributeName: 'id', AttributeType: 'S' },
    { AttributeName: 'date', AttributeType: 'S' },
    { AttributeName: 'time', AttributeType: 'S' }
  ],
  GlobalSecondaryIndexes: [
    {
      IndexName: 'DateTimeIndex',
      KeySchema: [
        { AttributeName: 'date', KeyType: 'HASH' },
        { AttributeName: 'time', KeyType: 'RANGE' }
      ],
      Projection: { ProjectionType: 'ALL' }
    }
  ]
}
```

#### Bookings Table
```javascript
{
  TableName: 'Bookings',
  KeySchema: [
    { AttributeName: 'id', KeyType: 'HASH' }
  ],
  AttributeDefinitions: [
    { AttributeName: 'id', AttributeType: 'S' },
    { AttributeName: 'userId', AttributeType: 'S' },
    { AttributeName: 'classId', AttributeType: 'S' },
    { AttributeName: 'createdAt', AttributeType: 'S' }
  ],
  GlobalSecondaryIndexes: [
    {
      IndexName: 'UserBookingsIndex',
      KeySchema: [
        { AttributeName: 'userId', KeyType: 'HASH' },
        { AttributeName: 'createdAt', KeyType: 'RANGE' }
      ],
      Projection: { ProjectionType: 'ALL' }
    },
    {
      IndexName: 'ClassBookingsIndex',
      KeySchema: [
        { AttributeName: 'classId', KeyType: 'HASH' },
        { AttributeName: 'createdAt', KeyType: 'RANGE' }
      ],
      Projection: { ProjectionType: 'ALL' }
    }
  ]
}
```

### 2.2 Data Migration Process
1. **Export MySQL data** to JSON format
2. **Transform relational data** to DynamoDB format
3. **Handle foreign key relationships** with denormalization
4. **Batch import** to DynamoDB with error handling
5. **Validate data integrity** with automated checks

### 2.3 Migration Scripts
- **mysql-to-dynamodb.js**: Main migration orchestrator
- **migrate-users.js**: User data with password hash migration
- **migrate-blog.js**: Blog posts with image metadata
- **migrate-classes.js**: Classes and schedules
- **validate-migration.js**: Data consistency verification

---

## Phase 3: Microservice Development (Weeks 3-6)

### 3.1 Authentication Service Development

#### Key Features
- JWT-based authentication (no sessions)
- Password hashing with bcrypt
- Token refresh mechanism
- Password reset via email
- User registration and verification

#### API Endpoints
```javascript
POST /auth/login           # User login with JWT response
POST /auth/register        # User registration
POST /auth/refresh         # Token refresh
POST /auth/logout          # JWT token invalidation
POST /auth/forgot          # Password reset request
GET  /auth/verify          # Token verification middleware
```

### 3.2 Blog Service Development

#### Key Features
- CRUD operations for blog posts
- Image upload to S3 with metadata
- Draft/published status management
- Admin-only creation/editing
- Public read access

#### API Endpoints
```javascript
GET    /blog              # List published blog posts
GET    /blog/:id          # Get single blog post
POST   /blog              # Create blog post (admin only)
PUT    /blog/:id          # Update blog post (admin only)
DELETE /blog/:id          # Delete blog post (admin only)
POST   /blog/:id/publish  # Publish draft post (admin only)
```

### 3.3 Admin Service Development

#### Key Features
- Dashboard analytics
- User management
- Website settings configuration
- Communication tools
- System monitoring

#### API Endpoints
```javascript
GET  /admin/dashboard     # Dashboard data and analytics
GET  /admin/users         # User management interface
PUT  /admin/settings      # Website settings updates
GET  /admin/analytics     # Usage analytics and reports
POST /admin/communications # Send newsletters/communications
```

### 3.4 Gallery Service Development

#### Key Features
- Image upload with S3 presigned URLs
- Image metadata management
- Thumbnail generation
- Gallery organization
- Admin image management

#### API Endpoints
```javascript
GET    /gallery           # List gallery images
POST   /gallery/upload    # Get presigned upload URL for S3
POST   /gallery           # Save image metadata to DynamoDB
DELETE /gallery/:id       # Delete image and metadata
```

### 3.5 Booking Service Development

#### Key Features
- Class schedule management
- Booking creation and cancellation
- Capacity management
- User booking history
- Admin booking oversight

#### API Endpoints
```javascript
GET    /classes             # List available classes
POST   /classes/:id/book    # Book a class
GET    /bookings            # Get user's bookings
PUT    /bookings/:id        # Modify existing booking
DELETE /bookings/:id        # Cancel booking
```

### 3.6 Payment Service Development

#### Key Features
- Stripe payment integration
- Payment intent creation
- Webhook handling
- Payment history
- Refund processing

#### API Endpoints
```javascript
POST /payment/intent      # Create Stripe payment intent
POST /payment/webhook     # Handle Stripe webhooks
GET  /payment/history     # User payment history
```

---

## Phase 4: Shared Infrastructure (Week 4)

### 4.1 Common Utilities

#### DynamoDB Client (`shared/dynamodb-client.js`)
- Connection pooling and reuse
- Query and scan helpers
- Batch operations
- Error handling and retries

#### JWT Utilities (`shared/jwt-utils.js`)
- Token generation and validation
- Token refresh logic
- Middleware for route protection
- Blacklist management for logout

#### S3 Utilities (`shared/s3-utils.js`)
- Presigned URL generation
- File upload helpers
- Image processing and thumbnails
- Metadata management

#### Validation (`shared/validation.js`)
- Input validation schemas using Joi
- Request body validation
- Parameter sanitization
- Error response formatting

### 4.2 API Gateway Configuration
- **Custom Domain**: `api.gabi.yoga`
- **Request Validation**: Input validation at gateway level
- **CORS**: Proper CORS headers for web application
- **Rate Limiting**: Protect against abuse
- **API Keys**: For admin functions and external integrations
- **Request/Response Transformation**: Data formatting

### 4.3 Error Handling and Logging
- **Centralized Error Handler**: Consistent error responses
- **CloudWatch Logging**: Structured logging with correlation IDs
- **X-Ray Tracing**: Distributed tracing for debugging
- **Alarm Configuration**: Monitoring and alerting setup

---

## Phase 5: Development & Testing (Week 5)

### 5.1 Local Development Setup

#### Tools Configuration
```bash
# Install AWS CDK globally
npm install -g aws-cdk

# Install SAM CLI for local development
pip install aws-sam-cli

# Install DynamoDB Local
docker run -p 8000:8000 amazon/dynamodb-local

# CDK project setup
cd lambda-migration/infrastructure
npm install
```

#### Local Testing Environment
- **SAM Local**: Local Lambda and API Gateway simulation
- **DynamoDB Local**: Local database for development  
- **Jest**: Unit and integration testing
- **Supertest**: API endpoint testing
- **CDK**: Infrastructure testing and synthesis

### 5.2 Testing Strategy

#### Unit Tests
- Individual Lambda function testing
- Mock DynamoDB operations
- JWT token validation testing
- Input validation testing

#### Integration Tests
- API endpoint testing with DynamoDB Local
- Authentication flow testing
- Data persistence verification
- Error handling validation

#### End-to-End Tests
- Complete user workflows
- Admin operations testing
- Payment processing simulation
- Image upload and retrieval

### 5.3 CI/CD Pipeline (GitHub Actions)

```yaml
# .github/workflows/deploy.yml
name: Deploy Serverless Application

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '16'
      - run: npm ci
      - run: npm run test

  deploy-dev:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/develop'
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
      - run: npm ci
      - run: serverless deploy --stage dev

  deploy-prod:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
      - run: npm ci
      - run: serverless deploy --stage prod
```

---

## Phase 6: Production Deployment (Week 6)

### 6.1 Production Environment Setup
- **Lambda Functions**: Deploy all microservices to production
- **DynamoDB**: Create production tables with proper indexes
- **API Gateway**: Configure production stage with custom domain
- **CloudWatch**: Set up monitoring, logging, and alarms
- **S3**: Configure production asset bucket

### 6.2 Data Migration Execution
1. **Backup MySQL Database**: Complete backup before migration
2. **Run Migration Scripts**: Execute data migration with validation
3. **Verify Data Integrity**: Automated consistency checks
4. **Performance Testing**: Load testing on production environment

### 6.3 Security Configuration
- **IAM Roles**: Least privilege access for Lambda functions
- **API Keys**: Secure admin endpoints
- **JWT Secrets**: Secure token signing in AWS Secrets Manager
- **CORS**: Restrictive CORS policy for production

---

## Phase 7: Traffic Routing & Cutover (Week 7)

### 7.1 Gradual Traffic Migration Strategy

#### Week 7.1: 5% Traffic to Lambda
```javascript
// ALB Target Group Weights
EC2_Target_Group: 95%
Lambda_Target_Group: 5%

// Monitoring Focus:
- Lambda cold start times
- Error rates comparison
- Response time analysis
- User experience feedback
```

#### Week 7.2: 25% Traffic to Lambda
```javascript
// ALB Target Group Weights
EC2_Target_Group: 75%
Lambda_Target_Group: 25%

// Monitoring Focus:
- DynamoDB performance
- API Gateway throttling
- Lambda concurrency limits
- Cost analysis
```

#### Week 7.3: 50% Traffic to Lambda
```javascript
// ALB Target Group Weights
EC2_Target_Group: 50%
Lambda_Target_Group: 50%

// Monitoring Focus:
- System stability
- Database performance
- User authentication success
- Payment processing accuracy
```

#### Week 7.4: 75% Traffic to Lambda
```javascript
// ALB Target Group Weights
EC2_Target_Group: 25%
Lambda_Target_Group: 75%

// Monitoring Focus:
- Final performance validation
- Complete feature testing
- Admin function verification
- Prepare for full cutover
```

### 7.2 Monitoring and Health Checks

#### Key Metrics to Monitor
```javascript
// Performance Metrics
- Average response time < 500ms
- 95th percentile response time < 1000ms
- Lambda cold start impact < 10% of requests

// Error Metrics
- Lambda error rate < 0.1%
- API Gateway 4xx rate < 1%
- API Gateway 5xx rate < 0.1%
- DynamoDB throttling = 0

// Business Metrics
- User authentication success rate > 99.5%
- Payment processing success rate > 99.9%
- Image upload success rate > 99%
- Admin function availability > 99%
```

#### Rollback Triggers
```javascript
// Automatic Rollback Conditions
- Error rate > 1% for 5 consecutive minutes
- Average response time > 2 seconds for 10 minutes
- Authentication failure rate > 5%
- Payment processing failure rate > 1%

// Manual Rollback Conditions
- User complaints about functionality
- Admin unable to access dashboard
- Critical business function failure
- Data inconsistency detected
```

### 7.3 Complete Cutover Process

#### Final DNS Switch
1. **100% Traffic to Lambda**: Update ALB rules to route all traffic
2. **Monitor for 24 hours**: Ensure complete system stability
3. **DNS Update**: Point domain directly to API Gateway
4. **Remove ALB routing**: Clean up intermediate routing
5. **48-hour monitoring**: Extended monitoring period

#### Emergency Rollback Procedure
```bash
# Emergency rollback steps (< 5 minutes)
1. Revert DNS to point back to ALB
2. Update ALB rules to route 100% to EC2
3. Restart EC2 instances if needed
4. Verify all functionality restored
5. Investigate Lambda issues
```

---

## Phase 8: Optimization & Cleanup (Week 8)

### 8.1 Performance Optimization

#### Lambda Optimization
- **Memory Allocation**: Right-size based on actual usage
- **Timeout Settings**: Optimize timeout values
- **Provisioned Concurrency**: Add for admin functions if needed
- **Layer Optimization**: Create layers for common dependencies

#### DynamoDB Optimization
- **Read/Write Capacity**: Adjust based on actual usage patterns
- **Billing Mode**: Evaluate on-demand vs provisioned
- **Global Secondary Indexes**: Optimize based on query patterns
- **DAX Caching**: Consider for frequently accessed data

#### API Gateway Optimization
- **Caching**: Enable response caching for static data
- **Throttling**: Optimize rate limiting settings
- **Request Validation**: Fine-tune validation rules
- **Compression**: Enable response compression

### 8.2 Cost Optimization

#### Resource Cleanup
- **EC2 Instances**: Terminate old web servers
- **RDS**: Shut down MySQL database after validation period
- **Load Balancer**: Remove ALB if no longer needed
- **S3**: Implement lifecycle policies for old data

#### Cost Monitoring
- **Lambda**: Monitor invocation costs and optimize
- **DynamoDB**: Track read/write consumption
- **API Gateway**: Monitor request costs
- **Data Transfer**: Optimize data transfer costs

### 8.3 Documentation and Handover

#### Documentation Updates
- **API Documentation**: Complete OpenAPI specification
- **Deployment Guide**: Step-by-step deployment procedures
- **Troubleshooting Guide**: Common issues and solutions
- **Architecture Diagram**: Updated system architecture

#### Team Training
- **Development Workflow**: New serverless development process
- **Deployment Process**: Serverless deployment procedures
- **Monitoring and Debugging**: CloudWatch and X-Ray usage
- **Incident Response**: New troubleshooting procedures

---

## Timeline Summary

| Week | Phase | Key Deliverables |
|------|-------|------------------|
| 1 | Infrastructure Foundation | Directory structure, DynamoDB schemas, Serverless config |
| 2 | Database Migration | Migration scripts, data transformation, validation |
| 3 | Core Services Development | Auth, Blog, Admin services |
| 4 | Supporting Services | Gallery, Booking, Payment services + shared utilities |
| 5 | Testing & CI/CD | Test suites, local development, CI/CD pipeline |
| 6 | Production Deployment | Production environment, data migration execution |
| 7 | Traffic Cutover | Gradual traffic migration (5% → 25% → 50% → 75% → 100%) |
| 8 | Optimization & Cleanup | Performance tuning, cost optimization, documentation |

---

## Risk Mitigation

### Technical Risks
- **Cold Start Latency**: Mitigated with provisioned concurrency for critical functions
- **DynamoDB Scaling**: Monitored with auto-scaling and alarms
- **Data Migration**: Comprehensive testing and validation scripts
- **Authentication Issues**: Thorough JWT implementation and testing

### Business Risks
- **Downtime**: Zero-downtime migration with gradual cutover
- **Feature Regression**: Comprehensive testing and gradual rollout
- **Performance Degradation**: Continuous monitoring and rollback capability
- **Cost Overruns**: Cost monitoring and optimization throughout

### Operational Risks
- **Team Learning Curve**: Training and documentation
- **Deployment Complexity**: Automated CI/CD pipeline
- **Monitoring Gaps**: Comprehensive CloudWatch and X-Ray setup
- **Emergency Response**: Clear rollback procedures and runbooks

---

## Success Metrics

### Performance Improvements
- **Response Time**: 50% reduction in average response time
- **Scalability**: Handle 10x traffic spikes without manual intervention
- **Availability**: 99.9% uptime (improved from 99.5%)

### Cost Savings
- **Infrastructure**: 60-80% reduction in monthly infrastructure costs
- **Maintenance**: 90% reduction in server maintenance time
- **Scaling**: Pay-per-use model reduces idle capacity costs

### Operational Benefits
- **Deployment Speed**: 5-minute deployments vs 30-minute deployments
- **Monitoring**: Real-time insights with CloudWatch and X-Ray
- **Security**: Improved security posture with managed services
- **Development Velocity**: Faster feature development and testing

---

## Next Steps

1. **Review and Approve Plan**: Stakeholder review and approval
2. **Set Up Development Environment**: Install tools and configure local development
3. **Begin Phase 1**: Create directory structure and initial Serverless configuration
4. **Database Schema Design**: Finalize DynamoDB table structures
5. **Start Microservice Development**: Begin with authentication service

Ready to begin implementation! 🚀
