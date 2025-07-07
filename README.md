# Yoga Business Website

A full-featured yoga business web application with comprehensive admin dashboard, customer management, payment processing, and blog functionality.

## Project Overview

This project provides a complete solution for yoga studios and instructors, featuring:

- Public-facing website with responsive design
- Secure admin dashboard for business management
- Customer accounts and membership management
- Class scheduling and booking system
- Payment processing with Stripe
- Blog and photo gallery management
- AWS infrastructure for production deployment

## Local Development

### Prerequisites

- Node.js (v12 or later)
- npm (v6 or later)
- Git

### Setup

1. Clone the repository:
   ```
   git clone <repository-url>
   cd yoga-website
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Set up environment variables:
   ```
   cp .env.example .env
   ```
   Edit the `.env` file with your configuration settings.

4. Start the development server:
   ```
   npm run dev
   ```

5. Access the application:
   - Website: http://localhost:5001
   - Admin Dashboard: http://localhost:5001/admin-dashboard.html

## Project Structure

- `/api` - Backend API routes and controllers
- `/css` - Stylesheets for the application
- `/database` - Database configuration, schema, and models
- `/images` - Static image assets
- `/infrastructure` - AWS CDK deployment configuration
- `/js` - Client-side JavaScript files
- `/middleware` - Express middleware functions
- `/uploads` - Directory for user-uploaded content
- `/utils` - Utility functions and tools

## Key Features

### Public Website
- Responsive design for all devices
- Class information and scheduling
- Membership and pricing details
- Blog with latest posts
- Photo gallery
- Contact information

### Admin Dashboard
- Secure authentication system
- Customer management
- Class and workshop scheduling
- Pricing and membership management
- Blog post creation and editing
- Photo gallery management
- System settings and configuration

### Database
- Support for both SQLite (development) and MySQL (production)
- Complete schema for users, memberships, classes, bookings, etc.
- Automatic environment-based configuration

### API
- RESTful API endpoints for all functionality
- JWT authentication
- Role-based access control
- Stripe payment integration

## Deployment

The application is designed to be deployed to AWS using the included CDK infrastructure code.

For complete deployment instructions, see:
- [Infrastructure README](./infrastructure/README.md)
- [Database README](./database/README.md)
- [Manual Server Restart Guide](./infrastructure/webapp-stack-https.md)

## Utilities

### JWT Token Generator

For development and testing, a JWT token generator is included:
- [JWT Token Generator Documentation](./utils/README-jwt-generator.md)

## Production Deployment

For production deployment to AWS:

1. Configure AWS credentials
2. Update environment variables for production
3. Deploy using the infrastructure scripts:
   ```
   cd infrastructure
   npm install
   npm run build
   npm run deploy
   ```

4. Follow the post-deployment steps in the infrastructure README

## Security Notes

- Update default credentials before deploying to production
- Secure your database with appropriate access controls
- Protect API endpoints with proper authentication
- Use HTTPS in production environments
- Regularly update dependencies to patch security vulnerabilities
