package shared

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/aws/aws-lambda-go/events"
	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb/types"
	"github.com/aws/aws-sdk-go-v2/service/secretsmanager"
	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
)

// SecretsCache provides a simple in-memory cache for secrets
var SecretsCache = make(map[string]interface{})

// GetDynamoDBClient returns a DynamoDB client
func GetDynamoDBClient(ctx context.Context) (*dynamodb.Client, error) {
	cfg, err := config.LoadDefaultConfig(ctx)
	if err != nil {
		return nil, fmt.Errorf("unable to load SDK config: %w", err)
	}

	return dynamodb.NewFromConfig(cfg), nil
}

// GetSecretsManagerClient returns a SecretsManager client
func GetSecretsManagerClient(ctx context.Context) (*secretsmanager.Client, error) {
	cfg, err := config.LoadDefaultConfig(ctx)
	if err != nil {
		return nil, fmt.Errorf("unable to load SDK config: %w", err)
	}

	return secretsmanager.NewFromConfig(cfg), nil
}

// GetSecret retrieves a secret from AWS Secrets Manager with caching
func GetSecret(ctx context.Context, secretName string) (map[string]interface{}, error) {
	if cachedSecret, ok := SecretsCache[secretName]; ok {
		return cachedSecret.(map[string]interface{}), nil
	}

	client, err := GetSecretsManagerClient(ctx)
	if err != nil {
		return nil, err
	}

	input := &secretsmanager.GetSecretValueInput{
		SecretId: aws.String(secretName),
	}

	result, err := client.GetSecretValue(ctx, input)
	if err != nil {
		return nil, fmt.Errorf("error getting secret %s: %w", secretName, err)
	}

	var secretData map[string]interface{}
	if err := json.Unmarshal([]byte(*result.SecretString), &secretData); err != nil {
		return nil, fmt.Errorf("error unmarshaling secret: %w", err)
	}

	SecretsCache[secretName] = secretData
	return secretData, nil
}

// GetJWTSecret retrieves the JWT secret from AWS Secrets Manager
func GetJWTSecret(ctx context.Context) (string, error) {
	secretName := os.Getenv("JWT_SECRET_NAME")
	if secretName == "" {
		return "", fmt.Errorf("JWT_SECRET_NAME environment variable not set")
	}

	secretData, err := GetSecret(ctx, secretName)
	if err != nil {
		return "", err
	}

	jwtSecret, ok := secretData["secret"].(string)
	if !ok {
		return "", fmt.Errorf("JWT secret not found in secret data")
	}

	return jwtSecret, nil
}

// User represents a user entity
type User struct {
	ID        string `json:"id"`
	Email     string `json:"email"`
	FirstName string `json:"firstName"`
	LastName  string `json:"lastName"`
	Role      string `json:"role"`
}

// Claims represents JWT claims
type Claims struct {
	ID    string `json:"id"`
	Email string `json:"email"`
	Role  string `json:"role"`
	jwt.RegisteredClaims
}

// GenerateToken generates a JWT token
func GenerateToken(user User, jwtSecret string, expiresIn time.Duration) (string, error) {
	claims := &Claims{
		ID:    user.ID,
		Email: user.Email,
		Role:  user.Role,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(expiresIn)),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	signedToken, err := token.SignedString([]byte(jwtSecret))
	if err != nil {
		return "", fmt.Errorf("error signing token: %w", err)
	}

	return signedToken, nil
}

// VerifyToken verifies a JWT token
func VerifyToken(tokenString string, jwtSecret string) (*Claims, error) {
	claims := &Claims{}

	token, err := jwt.ParseWithClaims(tokenString, claims, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
		return []byte(jwtSecret), nil
	})

	if err != nil {
		return nil, err
	}

	if !token.Valid {
		return nil, fmt.Errorf("invalid token")
	}

	return claims, nil
}

// HashPassword hashes a password
func HashPassword(password string) (string, error) {
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(password), 12)
	if err != nil {
		return "", fmt.Errorf("error hashing password: %w", err)
	}
	return string(hashedPassword), nil
}

// ComparePassword compares a password with a hash
func ComparePassword(password string, hash string) error {
	return bcrypt.CompareHashAndPassword([]byte(hash), []byte(password))
}

// GenerateResetToken generates a reset token
func GenerateResetToken() string {
	return uuid.New().String()
}

// Response represents an API response
type Response struct {
	StatusCode int               `json:"statusCode"`
	Headers    map[string]string `json:"headers"`
	Body       string            `json:"body"`
}

// ResponseBody represents the body of an API response
type ResponseBody struct {
	Success bool        `json:"success"`
	Message string      `json:"message,omitempty"`
	Details interface{} `json:"details,omitempty"`
}

// CreateResponse creates a Lambda response
func CreateResponse(statusCode int, body interface{}, headers map[string]string) events.APIGatewayProxyResponse {
	// Default headers for CORS
	defaultHeaders := map[string]string{
		"Content-Type":                     "application/json",
		"Access-Control-Allow-Origin":      os.Getenv("CORS_ORIGIN"),
		"Access-Control-Allow-Methods":     "*",
		"Access-Control-Allow-Headers":     "Content-Type, Authorization, X-Amz-Date, X-Api-Key, X-Amz-Security-Token, Accept",
		"Access-Control-Allow-Credentials": "true",
	}

	// Use CORS_ORIGIN from environment, or default to * if not set
	if defaultHeaders["Access-Control-Allow-Origin"] == "" {
		defaultHeaders["Access-Control-Allow-Origin"] = "*"
	}

	// Merge default headers with provided headers
	for key, value := range headers {
		defaultHeaders[key] = value
	}

	// Marshal body to JSON
	bodyJSON, err := json.Marshal(body)
	if err != nil {
		log.Printf("Error marshaling response body: %v", err)
		return events.APIGatewayProxyResponse{
			StatusCode: http.StatusInternalServerError,
			Headers:    defaultHeaders,
			Body:       `{"success":false,"message":"Error marshaling response"}`,
		}
	}

	return events.APIGatewayProxyResponse{
		StatusCode: statusCode,
		Headers:    defaultHeaders,
		Body:       string(bodyJSON),
	}
}

// CreateSuccessResponse creates a success response
func CreateSuccessResponse(data interface{}, statusCode int) events.APIGatewayProxyResponse {
	if statusCode == 0 {
		statusCode = http.StatusOK
	}

	responseData := make(map[string]interface{})
	responseData["success"] = true

	// If data is a map, merge it with responseData
	if dataMap, ok := data.(map[string]interface{}); ok {
		for key, value := range dataMap {
			responseData[key] = value
		}
	} else {
		// Otherwise, add data as a field
		responseData["data"] = data
	}

	return CreateResponse(statusCode, responseData, nil)
}

// CreateErrorResponse creates an error response
func CreateErrorResponse(message string, statusCode int, details interface{}) events.APIGatewayProxyResponse {
	if statusCode == 0 {
		statusCode = http.StatusBadRequest
	}

	responseBody := map[string]interface{}{
		"success": false,
		"message": message,
	}

	if details != nil {
		responseBody["details"] = details
	}

	return CreateResponse(statusCode, responseBody, nil)
}

// LogWithContext logs a message with context
func LogWithContext(level string, message string, context map[string]interface{}) {
	logData := make(map[string]interface{})
	logData["timestamp"] = time.Now().Format(time.RFC3339)
	logData["level"] = level
	logData["message"] = message

	for key, value := range context {
		logData[key] = value
	}

	logJSON, _ := json.Marshal(logData)
	log.Println(string(logJSON))
}

// ExtractAuthToken extracts the authorization token from the event
func ExtractAuthToken(event events.APIGatewayProxyRequest) string {
	authHeader := event.Headers["Authorization"]
	if authHeader == "" {
		authHeader = event.Headers["authorization"]
	}

	if authHeader == "" {
		return ""
	}

	parts := strings.Split(authHeader, " ")
	if len(parts) != 2 || parts[0] != "Bearer" {
		return ""
	}

	return parts[1]
}

// GetUserFromToken gets a user from a token
func GetUserFromToken(ctx context.Context, event events.APIGatewayProxyRequest) (*User, error) {
	token := ExtractAuthToken(event)
	if token == "" {
		return nil, fmt.Errorf("no authorization token provided")
	}

	jwtSecret, err := GetJWTSecret(ctx)
	if err != nil {
		return nil, fmt.Errorf("error getting JWT secret: %w", err)
	}

	claims, err := VerifyToken(token, jwtSecret)
	if err != nil {
		return nil, fmt.Errorf("error verifying token: %w", err)
	}

	// Get user from database to ensure they still exist
	dbClient, err := GetDynamoDBClient(ctx)
	if err != nil {
		return nil, fmt.Errorf("error getting DynamoDB client: %w", err)
	}

	usersTable := os.Getenv("USERS_TABLE")
	if usersTable == "" {
		return nil, fmt.Errorf("USERS_TABLE environment variable not set")
	}

	result, err := dbClient.GetItem(ctx, &dynamodb.GetItemInput{
		TableName: aws.String(usersTable),
		Key: map[string]types.AttributeValue{
			"id": &types.AttributeValueMemberS{Value: claims.ID},
		},
	})
	if err != nil {
		return nil, fmt.Errorf("error getting user: %w", err)
	}

	if len(result.Item) == 0 {
		return nil, fmt.Errorf("user not found")
	}

	var user User
	if err := attributeValueToStruct(result.Item, &user); err != nil {
		return nil, fmt.Errorf("error unmarshaling user: %w", err)
	}

	return &user, nil
}

// IsAdmin checks if a user has admin role
func IsAdmin(user *User) bool {
	return user != nil && user.Role == "admin"
}

// Helper function to convert DynamoDB attribute values to a struct
func attributeValueToStruct(av map[string]types.AttributeValue, out interface{}) error {
	// Convert DynamoDB attribute values to a map
	item := make(map[string]interface{})
	for key, value := range av {
		switch v := value.(type) {
		case *types.AttributeValueMemberS:
			item[key] = v.Value
		case *types.AttributeValueMemberN:
			item[key] = v.Value
		case *types.AttributeValueMemberBOOL:
			item[key] = v.Value
		// Add other DynamoDB types as needed
		default:
			// For complex types, we may need more sophisticated handling
			log.Printf("Unsupported type for key %s: %T", key, value)
		}
	}

	// Marshal and unmarshal to convert to the desired struct type
	data, err := json.Marshal(item)
	if err != nil {
		return err
	}

	return json.Unmarshal(data, out)
}
