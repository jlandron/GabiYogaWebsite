/**
 * JWT Secret Consistency Checker
 * 
 * This script helps diagnose JWT secret consistency issues across multiple server instances.
 * It can be used to verify that all instances are using the same JWT_SECRET.
 */

const jwt = require('jsonwebtoken');
const crypto = require('crypto');

// Test function to check JWT secret consistency
function checkJWTSecret() {
    console.log('=== JWT Secret Consistency Check ===\n');
    
    // Get the current JWT secret
    const JWT_SECRET = process.env.JWT_SECRET;
    
    if (!JWT_SECRET) {
        console.error('❌ ERROR: JWT_SECRET environment variable is not set!');
        console.log('This will cause authentication failures.');
        console.log('Please set JWT_SECRET in your .env file or environment variables.\n');
        return false;
    }
    
    // Display JWT secret info (masked for security)
    console.log('✅ JWT_SECRET is set');
    console.log(`📝 Length: ${JWT_SECRET.length} characters`);
    console.log(`🔍 First 10 chars: ${JWT_SECRET.substring(0, 10)}...`);
    console.log(`🔍 Last 10 chars: ...${JWT_SECRET.substring(JWT_SECRET.length - 10)}`);
    
    // Generate a hash of the secret for comparison across instances
    const secretHash = crypto.createHash('sha256').update(JWT_SECRET).digest('hex').substring(0, 16);
    console.log(`🔐 Secret hash (for comparison): ${secretHash}`);
    
    // Test token creation and verification
    console.log('\n=== Token Creation & Verification Test ===');
    
    try {
        // Create a test token
        const testPayload = {
            id: 'test-user',
            role: 'admin', 
            test: true
        };
        
        const testToken = jwt.sign(testPayload, JWT_SECRET, { expiresIn: '1h' });
        console.log('✅ Token creation successful');
        console.log(`📝 Test token (first 50 chars): ${testToken.substring(0, 50)}...`);
        
        // Verify the token
        const decoded = jwt.verify(testToken, JWT_SECRET);
        console.log('✅ Token verification successful');
        console.log(`📝 Decoded payload:`, {
            id: decoded.id,
            role: decoded.role,
            test: decoded.test,
            exp: new Date(decoded.exp * 1000).toISOString()
        });
        
        return true;
    } catch (error) {
        console.error('❌ Token test failed:', error.message);
        return false;
    }
}

// Function to generate a secure JWT secret
function generateSecureSecret() {
    console.log('\n=== Secure JWT Secret Generator ===');
    
    // Generate a cryptographically secure random secret
    const newSecret = crypto.randomBytes(64).toString('hex');
    
    console.log('🔐 Generated secure JWT secret:');
    console.log(newSecret);
    console.log('\n📋 Add this to your .env file:');
    console.log(`JWT_SECRET=${newSecret}`);
    console.log('\n⚠️  IMPORTANT: All server instances must use the SAME secret!');
    
    return newSecret;
}

// Main execution
if (require.main === module) {
    console.log('🔍 Starting JWT Secret Diagnostic Tool...\n');
    
    const isHealthy = checkJWTSecret();
    
    if (!isHealthy) {
        console.log('\n🛠️  Would you like to generate a new secure JWT secret?');
        console.log('Run: node utils/check-jwt-secret.js --generate');
    } else {
        console.log('\n✅ JWT configuration appears healthy');
        console.log('If you\'re still experiencing auth issues, ensure ALL server instances use this same secret.');
    }
}

// Handle command line arguments
const args = process.argv.slice(2);
if (args.includes('--generate')) {
    generateSecureSecret();
}

module.exports = {
    checkJWTSecret,
    generateSecureSecret
};
