# Yoga Website Database Solution

This directory contains a complete MongoDB-based database solution for the yoga website. The database is designed to work locally during development and can easily be migrated to AWS DocumentDB when you're ready to deploy.

## Database Structure

### Schemas
- **Users**: Member profiles, authentication info, and preferences
- **Memberships**: Tracks different membership types and their status
- **Classes**: Templates and scheduled classes
- **Bookings**: Member registrations for classes
- **Workshops**: Special events with registrations
- **Private Sessions**: One-on-one sessions with instructor
- **Gallery**: Images for the website gallery
- **Newsletter**: Email subscriptions

## Getting Started

### Prerequisites
1. Install MongoDB
   ```
   sudo apt-get install mongodb
   ```
2. Install Node.js dependencies
   ```
   cd yoga-website
   npm install
   ```

### Setup
1. **Environment Variables**: Update the `.env` file with your specific settings
   - For local development, use the default MongoDB URI
   - For production, update with your AWS DocumentDB connection string

2. **Initialize the Database**:
   ```
   npm run seed
   ```
   This will populate the database with sample data including:
   - Sample users
   - Class templates
   - Scheduled classes
   - Workshops
   - Memberships
   - Bookings

3. **Start the Server**:
   ```
   npm run dev
   ```

## Key Files

- `db-schema.js` - Mongoose schema definitions
- `db-config.js` - Database connection configuration
- `models.js` - Mongoose models
- `data-access.js` - Data access layer with CRUD operations
- `seed.js` - Sample data initialization

## API Integration

The database is accessible through a RESTful API defined in `server.js`. The frontend can communicate with the database using the utility functions in `api.js`.

### Example API Usage

```javascript
// Login a user
API.auth.login({ email: 'user@example.com', password: 'password123' })
  .then(response => console.log('Logged in:', response.user))
  .catch(error => console.error('Login failed:', error));

// Get all classes
API.classes.getAll()
  .then(response => {
    const classes = response.classes;
    // Update UI with classes
  });
```

## Migration to AWS DocumentDB

When you're ready to deploy to production:

1. Create an AWS DocumentDB cluster
2. Update the `.env` file with your DocumentDB connection string:
   ```
   NODE_ENV=production
   MONGODB_URI=mongodb://username:password@your-docdb-instance.region.docdb.amazonaws.com:27017/gabi_jyoti_yoga?ssl=true&replicaSet=rs0&readPreference=secondaryPreferred
   ```
3. Make sure your security groups allow connections from your application server
4. Restart your application with the production environment

## Data Flow

1. **User Dashboard Updates**:
   - When a user makes changes in their dashboard, the frontend calls the appropriate API endpoint
   - The server processes the request and updates the MongoDB database
   - Changes are immediately reflected in the user's view

2. **Admin Portal Updates**:
   - Admin changes are processed through secure API endpoints
   - Database updates are reflected across the site
   - Changes appear in both admin and user views as appropriate

## Security Notes

- Passwords are hashed using bcrypt before storage
- API endpoints for admin functions are protected with authentication middleware
- Session management uses express-session with secure cookies
