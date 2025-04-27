# JWT Token Generator

A command-line utility for generating JWT (JSON Web Token) authentication tokens on demand for development and testing purposes.

This package provides two utilities:
1. `generate-token.js` - The core token generator with command-line arguments
2. `token-generator.js` - An interactive wrapper for easier token generation

## Overview

This utility allows developers to quickly generate valid JWT tokens for testing API endpoints without going through the normal authentication flow. It's particularly useful for:

- Testing protected API routes during development
- Debugging authentication issues
- Creating tokens with specific roles or permissions
- Generating tokens with custom expiration times

## Requirements

The utility uses the following dependencies:
- `jsonwebtoken` - For generating the tokens
- `dotenv` - For loading environment variables

Both are already included in your project dependencies.

## Usage

### Option 1: Interactive Mode (Recommended)

```bash
node utils/token-generator.js
```

This will prompt you for:
- User ID
- Email address
- Role
- Whether to use a custom expiration time

### Option 2: Direct Arguments with Interactive Wrapper

```bash
node utils/token-generator.js <user_id> <email> <role> [expiry]
```

Example:
```bash
node utils/token-generator.js 123 admin@example.com admin 7d
```

### Option 3: Core Generator with Named Parameters

```bash
node utils/generate-token.js --id <user_id> --email <user_email> --role <user_role>
```

### Parameters for Core Generator

All parameters are passed as command-line arguments:

| Parameter | Required | Description |
|-----------|----------|-------------|
| `--id`    | Yes | The user ID to embed in the token |
| `--email` | Yes | The email address to embed in the token |
| `--role`  | Yes | The user role to embed in the token (e.g., admin, user) |
| `--expiry`| No  | Custom expiration time (e.g., "1h", "7d"). Defaults to JWT_EXPIRY in .env or 24h |
| `--secret`| No  | Custom signing secret. Not recommended - use .env instead |

### Examples

#### Generate a token for an admin user:

```bash
node utils/generate-token.js --id 1 --email admin@example.com --role admin
```

#### Generate a token with a custom expiration time:

```bash
node utils/generate-token.js --id 2 --email user@example.com --role user --expiry 7d
```

#### Generate a token with a specific user ID:

```bash
node utils/generate-token.js --id 42 --email customer42@example.com --role customer --expiry 1h
```

## Output

The utility outputs:
- The full JWT token
- Decoded payload information
- Token expiration time
- Example of how to use the token with an API request

## Security Considerations

⚠️ **Important Security Notes** ⚠️

- This tool is intended for development and testing only
- Never use development tokens in production environments
- The JWT_SECRET should be kept secure and never exposed
- Never commit tokens to version control
- Consider using shorter expiry times for test tokens
