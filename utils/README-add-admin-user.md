# Admin User Creation Script

This utility script allows you to add an admin user to the database after deployment to AWS. It's designed to be run as a one-time setup process after your application is deployed and your database is initialized.

## Prerequisites

- Node.js environment with access to your application's database
- The application's `.env` file properly configured with database connection details
- Required npm packages: `dotenv`, `bcryptjs`

## Installation

1. Ensure the script has execute permissions:
   ```
   chmod +x utils/add-admin-user.js
   ```

2. Make sure all dependencies are installed:
   ```
   npm install
   ```

## Usage

Run the script with the following parameters:

```
node utils/add-admin-user.js --email=admin@example.com --password=securepassword --firstName=Admin --lastName=User
```

### Parameters

- `--email`: The email address for the admin user (required)
- `--password`: The password for the admin user (required)
- `--firstName`: The first name of the admin user (required) 
- `--lastName`: The last name of the admin user (required)

## AWS Deployment Usage

When running this script on AWS, you'll need to execute it in the environment where your application is deployed:

1. SSH into your EC2 instance or use AWS Systems Manager Session Manager
2. Navigate to your application directory
3. Make sure your `.env` file is properly configured
4. Run the script:
   ```
   cd /path/to/your/application
   node utils/add-admin-user.js --email=admin@example.com --password=securepassword --firstName=Admin --lastName=User
   ```

### For AWS Lambda Environments

If your application is deployed using AWS Lambda, you can create a simple Lambda function that imports and runs this script:

1. Create a new Lambda function with the same environment as your application
2. Include this script in your deployment package
3. Set the handler to execute the script
4. Trigger the Lambda function manually when you need to add an admin user

## Features

- Works with both MongoDB (Mongoose) and SQL databases
- Detects database type from environment variables
- Checks if user already exists before creating
- Updates existing users to admin role if they already exist but aren't admins
- Properly hashes passwords for security
- Provides clear console feedback

## Security Considerations

- Run this script over secure connections only (SSH, AWS Session Manager, etc.)
- Use strong passwords
- Consider deleting or restricting access to this script after use
- Do not include sensitive admin credentials in deployment scripts or repositories
