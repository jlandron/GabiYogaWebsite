# Yoga Website Database Solution

This directory contains a complete database solution for the yoga website, supporting both SQLite for local development and MySQL for production.

## Database Configuration

The system is designed to automatically select the appropriate database based on the `NODE_ENV` environment variable:
- **Development environment**: Uses SQLite by default
- **Production environment**: Uses MySQL by default

This behavior can be overridden by explicitly setting the `DB_TYPE` environment variable in the `.env` file.

## Environment Variables

All database configuration settings are stored in the `.env` file at the root of the project:

```
# Database Configuration
# ------------------------------
# You can explicitly set DB_TYPE to override the automatic selection
# based on NODE_ENV (default: development=sqlite, production=mysql)
# DB_TYPE=sqlite

# SQLite Configuration (used when DB_TYPE=sqlite or NODE_ENV=development)
DB_PATH=./data/yoga.sqlite

# MySQL Configuration (used when DB_TYPE=mysql or NODE_ENV=production)
DB_HOST=your-rds-instance.region.rds.amazonaws.com
DB_PORT=3306
DB_NAME=yoga
DB_USER=admin
DB_PASSWORD=your_secure_password
```

## Getting Started

### Prerequisites
1. For local development (SQLite):
   - No additional installation required
   
2. For production (MySQL):
   - Access to AWS RDS MySQL instance
   - MySQL client for testing (optional)

3. Install Node.js dependencies:
   ```
   npm install
   ```

### Testing the Database Connection

You can test your database connection with the provided utility script:

```bash
# Test with SQLite (Development)
NODE_ENV=development node utils/test-db-config.js

# Test with MySQL (Production)
NODE_ENV=production node utils/test-db-config.js

# Explicit override
DB_TYPE=sqlite node utils/test-db-config.js
DB_TYPE=mysql node utils/test-db-config.js
```

## Key Files

- `db-config.js` - Database connection configuration (SQLite and MySQL)
- `db-schema.js` - Database schema definitions
- `schema.sql` - SQL schema definition
- `models.js` - Database models
- `data-access.js` - Data access layer with CRUD operations
- `seed.js` - Sample data initialization

## Database Schema

The schema includes tables for:

- **Users**: Member profiles, authentication info, and preferences
- **Memberships**: Different membership types and their status
- **Classes**: Templates and scheduled classes
- **Bookings**: Member registrations for classes
- **Workshops**: Special events with registrations
- **Private Sessions**: One-on-one sessions with instructors
- **Gallery**: Images for the website gallery
- **Newsletter**: Email subscriptions

## Migration Between Environments

### Development to Production

When moving from local development to production:

1. Make sure your AWS RDS MySQL instance is properly configured
2. Update the `.env` file to use production settings:
   ```
   NODE_ENV=production
   ```
3. The database will automatically switch to using MySQL

### Production to Development

To switch back to development:

1. Update the `.env` file:
   ```
   NODE_ENV=development
   ```
2. The database will automatically switch to using SQLite

### Manual Override

If you need to use a specific database type regardless of environment:

```
# Force SQLite even in production
NODE_ENV=production
DB_TYPE=sqlite

# Force MySQL even in development
NODE_ENV=development
DB_TYPE=mysql
```

## Security Notes

- Database credentials are stored in the `.env` file and should not be committed to version control
- Use appropriate security groups and firewall rules to restrict access to your MySQL database
- In production, ensure your RDS instance is properly secured according to AWS best practices
