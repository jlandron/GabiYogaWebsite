# Gabi Yoga Lambda Migration

A complete serverless migration of the Gabi Yoga website from EC2 to AWS Lambda.

## 🚀 Quick Start - Get Homepage Working

### Prerequisites
- AWS CLI configured with your credentials
- Node.js 16+ installed
- CDK installed globally: `npm install -g aws-cdk`

### 1. Deploy Infrastructure

```bash
# From the yoga-website root directory
node lambda-migration/scripts/deploy-dev.js
```

This will:
- ✅ Check prerequisites
- 🔧 Bootstrap CDK if needed
- 🏗️ Deploy all infrastructure stacks
- 📍 Show you the API Gateway URL

### 2. Upload Website Assets

```bash
# Upload your existing website files to S3
cd lambda-migration
node scripts/upload-assets.js
```

This will:
- 📁 Upload HTML, CSS, JS, images, fonts
- 🔄 Update API endpoints to point to Lambda
- 🌐 Make your full website available

### 3. Test Your Lambda Website

Your website will be available at:
```
https://your-api-id.execute-api.us-east-1.amazonaws.com/dev/
```

## 🏗️ Architecture Overview

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   CloudFront    │    │   API Gateway    │    │     Lambda      │
│   (Future)      │───▶│                  │───▶│   Functions     │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                │                        │
                                │                        ▼
                                │               ┌─────────────────┐
                                │               │   DynamoDB      │
                                │               │    Tables       │
                                │               └─────────────────┘
                                ▼
                       ┌─────────────────┐
                       │   S3 Assets     │
                       │    Bucket       │
                       └─────────────────┘
```

## 📁 Project Structure

```
lambda-migration/
├── infrastructure/          # CDK infrastructure code
│   ├── lib/                # Stack definitions
│   │   ├── lambda-db-stack.ts
│   │   ├── lambda-auth-stack.ts
│   │   ├── lambda-api-stack.ts
│   │   └── lambda-monitoring-stack.ts
│   └── bin/lambda-stack.ts  # CDK app entry point
├── lambda/                  # Lambda function code
│   ├── auth/               # Authentication functions
│   ├── blog/               # Blog management
│   ├── admin/              # Admin functions
│   ├── gallery/            # Photo gallery
│   ├── booking/            # Class bookings
│   ├── payment/            # Stripe payments
│   ├── static/             # Static website serving
│   └── shared/utils.js     # Shared utilities
├── scripts/                # Deployment scripts
│   ├── deploy-dev.js       # Complete dev deployment
│   └── upload-assets.js    # Asset upload to S3
└── docs/                   # Documentation
```

## 🔧 Lambda Functions

### Static Website (`static/website.js`)
- **Purpose**: Serves homepage and static assets
- **Route**: `GET /` and `GET /{proxy+}`
- **Features**: S3 asset serving, default homepage, proper caching

### Authentication (`auth/`)
- `POST /auth` - User login
- `POST /auth/register` - User registration
- `POST /auth/refresh` - Token refresh
- `POST /auth/logout` - User logout
- `POST /auth/forgot` - Password reset
- `GET /auth/verify` - Email verification

### Blog Management (`blog/`)
- `GET /blog` - List blog posts
- `GET /blog/{id}` - Get specific post
- `POST /blog` - Create new post
- `PUT /blog/{id}` - Update post
- `DELETE /blog/{id}` - Delete post
- `POST /blog/{id}/publish` - Publish post

### Gallery (`gallery/`)
- `GET /gallery` - List photos
- `POST /gallery` - Save photo metadata
- `POST /gallery/upload` - Upload photos
- `DELETE /gallery/{id}` - Delete photo

### Bookings (`booking/`)
- `GET /classes` - List available classes
- `POST /classes/{id}/book` - Book a class
- `GET /bookings` - List user bookings

### Payments (`payment/`)
- `POST /payment/intent` - Create Stripe payment intent
- `POST /payment/webhook` - Handle Stripe webhooks

### Admin (`admin/`)
- `GET /admin/dashboard` - Admin dashboard data
- `GET /admin/users` - User management
- `PUT /admin/settings` - Update settings

## 🗄️ Database Schema (DynamoDB)

### Users Table
- **PK**: `id` (UUID)
- **GSI**: `email-index` for email lookups
- Fields: name, email, password_hash, role, created_at, etc.

### BlogPosts Table
- **PK**: `id` (UUID)
- **GSI**: `status-created-index` for published posts
- Fields: title, content, status, author_id, created_at, etc.

### Classes Table
- **PK**: `id` (UUID)
- **GSI**: `date-index` for scheduling
- Fields: name, description, date, capacity, instructor, etc.

### Bookings Table
- **PK**: `id` (UUID)
- **GSI**: `user-index`, `class-index`
- Fields: user_id, class_id, status, created_at, etc.

## 🔐 Security Features

### Authentication
- JWT-based authentication
- Secure password hashing with bcrypt
- Token blacklisting for logout
- Refresh token rotation

### Secrets Management
- AWS Secrets Manager for JWT secrets
- Stripe API keys stored securely
- No hardcoded credentials

### API Security
- CORS configuration
- Input validation
- Rate limiting (API Gateway)
- X-Ray tracing enabled

## 📊 Monitoring & Observability

### CloudWatch
- Lambda function metrics
- Custom dashboard
- Automated alarms for errors
- Log aggregation

### X-Ray Tracing
- Distributed tracing across services
- Performance monitoring
- Error tracking

## 💰 Cost Optimization

### Lambda
- ARM64 architecture (34% better price/performance)
- Right-sized memory allocation
- Efficient cold start handling

### DynamoDB
- On-demand billing
- Efficient query patterns
- Proper indexing strategy

### S3
- Lifecycle policies
- Intelligent tiering (future)
- CloudFront integration (future)

## 🚀 Deployment Environments

### Development (`dev`)
- Relaxed CORS policies
- Debug logging enabled
- Smaller resource allocation
- Auto-destroy on stack deletion

### Production (`prod`) - Future
- Strict CORS policies
- Optimized logging
- High availability configuration
- Resource retention policies

## 🔄 CI/CD Pipeline - Future

```yaml
# Planned GitHub Actions workflow
Deploy:
  - Code quality checks
  - Unit tests
  - CDK diff
  - Deploy to dev
  - Integration tests
  - Deploy to prod
  - Health checks
```

## 📱 Frontend Integration

Your existing frontend code will continue to work with minimal changes:

### API Endpoint Updates
- Old: `fetch('/api/blog')`
- New: `fetch('https://api-gateway-url/blog')`

### CORS Handling
- API Gateway handles CORS automatically
- No changes needed in frontend code

## 🎯 Benefits of Lambda Migration

### Cost Savings
- **Development**: ~90% reduction (no idle server costs)
- **Production**: ~50-70% reduction for typical traffic
- Pay only for actual requests

### Scalability
- Automatic scaling from 0 to 1000s of concurrent requests
- No capacity planning needed
- Built-in high availability

### Maintenance
- No server patching or updates
- Automatic security updates
- Focus on code, not infrastructure

### Performance
- Sub-100ms cold starts with ARM64
- Global edge locations via API Gateway
- Efficient caching strategies

## 🔧 Troubleshooting

### Common Issues

1. **Lambda Function Errors**
   ```bash
   aws logs tail /aws/lambda/GabiYoga-dev-BlogList --follow
   ```

2. **API Gateway Issues**
   ```bash
   curl -v https://your-api-gateway-url/blog
   ```

3. **S3 Asset Problems**
   ```bash
   aws s3 ls s3://gabi-yoga-dev-assets-us-east-1/
   ```

### Debug Commands
```bash
# Check stack status
aws cloudformation describe-stacks --stack-name GabiYogaLambda-dev-Api

# View CloudWatch metrics
aws logs describe-log-groups --log-group-name-prefix /aws/lambda/GabiYoga-dev

# Test specific Lambda function
aws lambda invoke --function-name GabiYoga-dev-BlogList output.json
```

## 📚 Next Steps

1. **Upload Assets**: Get your homepage working
2. **Test APIs**: Verify all endpoints work
3. **Data Migration**: Move from MySQL to DynamoDB
4. **Domain Setup**: Point your domain to API Gateway
5. **CloudFront**: Add CDN for better performance
6. **Monitoring**: Set up alerts and dashboards

## 💡 Pro Tips

- Use AWS X-Ray for debugging distributed requests
- Set up CloudWatch alarms for proactive monitoring  
- Keep Lambda functions small and focused
- Use DynamoDB single-table design for better performance
- Implement proper error handling and retry logic

---

🧘‍♀️ **Happy coding and namaste!** 🧘‍♀️
