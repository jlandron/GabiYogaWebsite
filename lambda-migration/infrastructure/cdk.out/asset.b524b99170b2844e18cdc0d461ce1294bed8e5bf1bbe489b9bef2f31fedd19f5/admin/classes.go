package admin

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"os"
	"time"

	"github.com/aws/aws-lambda-go/events"
	"github.com/aws/aws-lambda-go/lambda"
	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/feature/dynamodb/attributevalue"
	"github.com/aws/aws-sdk-go-v2/feature/dynamodb/expression"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb/types"
	"github.com/google/uuid"

	"github.com/jlandron/GabiYogaWebsite/lambda/shared"
)

// Class represents a yoga class entity
type Class struct {
	ID              string  `json:"id"`
	Title           string  `json:"title"`
	Description     string  `json:"description,omitempty"`
	ScheduleDate    string  `json:"scheduleDate"`
	StartTime       string  `json:"startTime"`
	EndTime         string  `json:"endTime"`
	MaxParticipants int     `json:"maxParticipants"`
	Location        string  `json:"location,omitempty"`
	Price           float64 `json:"price,omitempty"`
	Status          string  `json:"status"`
	Instructor      string  `json:"instructor,omitempty"`
	CreatedAt       string  `json:"createdAt"`
	UpdatedAt       string  `json:"updatedAt"`
	CreatedBy       string  `json:"createdBy"`
}

// Booking represents a class booking
type Booking struct {
	ID        string `json:"id"`
	UserID    string `json:"userId"`
	ClassID   string `json:"classId"`
	Status    string `json:"status"`
	CreatedAt string `json:"createdAt"`
	UpdatedAt string `json:"updatedAt"`
}

// Handler is the Lambda function handler for admin classes operations
func Handler(ctx context.Context, event events.APIGatewayProxyRequest) (events.APIGatewayProxyResponse, error) {
	log.Printf("Event: %+v", event)

	// Handle CORS preflight
	if event.HTTPMethod == "OPTIONS" {
		return shared.CreateSuccessResponse(map[string]interface{}{}, 200), nil
	}

	// Verify admin role
	user, err := shared.GetUserFromToken(ctx, event)
	if err != nil || user == nil || !shared.IsAdmin(user) {
		return shared.CreateErrorResponse("Unauthorized - Admin access required", 403, nil), nil
	}

	switch event.HTTPMethod {
	case "GET":
		return handleGetClasses(ctx, event)
	case "POST":
		return handleCreateClass(ctx, event, user)
	case "PUT":
		return handleUpdateClass(ctx, event)
	case "DELETE":
		return handleDeleteClass(ctx, event)
	default:
		return shared.CreateErrorResponse(fmt.Sprintf("Method %s not allowed", event.HTTPMethod), 405, nil), nil
	}
}

// handleGetClasses handles GET requests for classes
func handleGetClasses(ctx context.Context, event events.APIGatewayProxyRequest) (events.APIGatewayProxyResponse, error) {
	dbClient, err := shared.GetDynamoDBClient(ctx)
	if err != nil {
		log.Printf("Error getting DynamoDB client: %v", err)
		return shared.CreateErrorResponse("Internal server error", 500, nil), nil
	}

	classesTable := os.Getenv("CLASSES_TABLE")
	if classesTable == "" {
		return shared.CreateErrorResponse("CLASSES_TABLE environment variable not set", 500, nil), nil
	}

	// Check if a specific class ID is provided
	classID, hasClassID := event.PathParameters["id"]
	if hasClassID {
		// Get specific class by ID
		result, err := dbClient.GetItem(ctx, &dynamodb.GetItemInput{
			TableName: aws.String(classesTable),
			Key: map[string]types.AttributeValue{
				"id": &types.AttributeValueMemberS{Value: classID},
			},
		})
		if err != nil {
			log.Printf("Error getting class: %v", err)
			return shared.CreateErrorResponse("Error retrieving class", 500, nil), nil
		}

		if len(result.Item) == 0 {
			return shared.CreateErrorResponse("Class not found", 404, nil), nil
		}

		// Parse the item into a Class struct
		var class Class
		if err := attributevalue.UnmarshalMap(result.Item, &class); err != nil {
			log.Printf("Error unmarshalling class: %v", err)
			return shared.CreateErrorResponse("Error processing class data", 500, nil), nil
		}

		return shared.CreateSuccessResponse(map[string]interface{}{
			"class": class,
		}, 200), nil
	}

	// Otherwise, list all classes
	result, err := dbClient.Scan(ctx, &dynamodb.ScanInput{
		TableName: aws.String(classesTable),
	})
	if err != nil {
		log.Printf("Error scanning classes table: %v", err)
		return shared.CreateErrorResponse("Error retrieving classes", 500, nil), nil
	}

	// Parse items into Class structs
	classes := []Class{}
	if err := attributevalue.UnmarshalListOfMaps(result.Items, &classes); err != nil {
		log.Printf("Error unmarshalling classes: %v", err)
		return shared.CreateErrorResponse("Error processing class data", 500, nil), nil
	}

	return shared.CreateSuccessResponse(map[string]interface{}{
		"classes": classes,
		"count":   len(classes),
	}, 200), nil
}

// handleCreateClass handles POST requests to create a new class
func handleCreateClass(ctx context.Context, event events.APIGatewayProxyRequest, user *shared.User) (events.APIGatewayProxyResponse, error) {
	// Parse request body
	var classData Class
	if err := json.Unmarshal([]byte(event.Body), &classData); err != nil {
		return shared.CreateErrorResponse("Invalid request body", 400, nil), nil
	}

	// Validate required fields
	if classData.Title == "" || classData.ScheduleDate == "" || classData.StartTime == "" ||
		classData.EndTime == "" || classData.MaxParticipants <= 0 {
		missingFields := []string{}
		if classData.Title == "" {
			missingFields = append(missingFields, "title")
		}
		if classData.ScheduleDate == "" {
			missingFields = append(missingFields, "scheduleDate")
		}
		if classData.StartTime == "" {
			missingFields = append(missingFields, "startTime")
		}
		if classData.EndTime == "" {
			missingFields = append(missingFields, "endTime")
		}
		if classData.MaxParticipants <= 0 {
			missingFields = append(missingFields, "maxParticipants")
		}
		return shared.CreateErrorResponse(fmt.Sprintf("Missing required fields: %v", missingFields), 400, nil), nil
	}

	// Set up new class with generated ID and timestamps
	timestamp := time.Now().UTC().Format(time.RFC3339)
	classData.ID = uuid.New().String()
	classData.Status = "active"
	classData.CreatedAt = timestamp
	classData.UpdatedAt = timestamp
	classData.CreatedBy = user.ID

	// Save to DynamoDB
	dbClient, err := shared.GetDynamoDBClient(ctx)
	if err != nil {
		log.Printf("Error getting DynamoDB client: %v", err)
		return shared.CreateErrorResponse("Internal server error", 500, nil), nil
	}

	classesTable := os.Getenv("CLASSES_TABLE")
	if classesTable == "" {
		return shared.CreateErrorResponse("CLASSES_TABLE environment variable not set", 500, nil), nil
	}

	// Convert class to DynamoDB attribute values
	item, err := attributevalue.MarshalMap(classData)
	if err != nil {
		log.Printf("Error marshalling class data: %v", err)
		return shared.CreateErrorResponse("Error processing class data", 500, nil), nil
	}

	// Save to DynamoDB
	_, err = dbClient.PutItem(ctx, &dynamodb.PutItemInput{
		TableName: aws.String(classesTable),
		Item:      item,
	})
	if err != nil {
		log.Printf("Error saving class: %v", err)
		return shared.CreateErrorResponse("Error saving class", 500, nil), nil
	}

	return shared.CreateSuccessResponse(map[string]interface{}{
		"message": "Class created successfully",
		"class":   classData,
	}, 201), nil
}

// handleUpdateClass handles PUT requests to update an existing class
func handleUpdateClass(ctx context.Context, event events.APIGatewayProxyRequest) (events.APIGatewayProxyResponse, error) {
	// Get class ID from path parameters
	classID, ok := event.PathParameters["id"]
	if !ok || classID == "" {
		return shared.CreateErrorResponse("Class ID is required", 400, nil), nil
	}

	// Parse request body
	var updates map[string]interface{}
	if err := json.Unmarshal([]byte(event.Body), &updates); err != nil {
		return shared.CreateErrorResponse("Invalid request body", 400, nil), nil
	}

	// Get DynamoDB client
	dbClient, err := shared.GetDynamoDBClient(ctx)
	if err != nil {
		log.Printf("Error getting DynamoDB client: %v", err)
		return shared.CreateErrorResponse("Internal server error", 500, nil), nil
	}

	classesTable := os.Getenv("CLASSES_TABLE")
	if classesTable == "" {
		return shared.CreateErrorResponse("CLASSES_TABLE environment variable not set", 500, nil), nil
	}

	// Check if class exists
	result, err := dbClient.GetItem(ctx, &dynamodb.GetItemInput{
		TableName: aws.String(classesTable),
		Key: map[string]types.AttributeValue{
			"id": &types.AttributeValueMemberS{Value: classID},
		},
	})
	if err != nil {
		log.Printf("Error getting class: %v", err)
		return shared.CreateErrorResponse("Error retrieving class", 500, nil), nil
	}

	if len(result.Item) == 0 {
		return shared.CreateErrorResponse("Class not found", 404, nil), nil
	}

	// Build update expression
	expr := expression.NewBuilder()
	update := expression.UpdateBuilder{}

	// Add updatedAt timestamp
	timestamp := time.Now().UTC().Format(time.RFC3339)
	update = update.Set(expression.Name("updatedAt"), expression.Value(timestamp))

	// Add other fields from the updates map (except id, createdAt, and createdBy which shouldn't be updated)
	for key, value := range updates {
		if key != "id" && key != "createdAt" && key != "createdBy" {
			update = update.Set(expression.Name(key), expression.Value(value))
		}
	}

	expr = expr.WithUpdate(update)
	exprBuilder, err := expr.Build()
	if err != nil {
		log.Printf("Error building expression: %v", err)
		return shared.CreateErrorResponse("Error building update expression", 500, nil), nil
	}

	// Update the class in DynamoDB
	updateResult, err := dbClient.UpdateItem(ctx, &dynamodb.UpdateItemInput{
		TableName:                 aws.String(classesTable),
		Key:                       map[string]types.AttributeValue{"id": &types.AttributeValueMemberS{Value: classID}},
		UpdateExpression:          exprBuilder.Update(),
		ExpressionAttributeNames:  exprBuilder.Names(),
		ExpressionAttributeValues: exprBuilder.Values(),
		ReturnValues:              types.ReturnValueAllNew,
	})
	if err != nil {
		log.Printf("Error updating class: %v", err)
		return shared.CreateErrorResponse("Error updating class", 500, nil), nil
	}

	// Parse the updated item
	var updatedClass Class
	if err := attributevalue.UnmarshalMap(updateResult.Attributes, &updatedClass); err != nil {
		log.Printf("Error unmarshalling updated class: %v", err)
		return shared.CreateErrorResponse("Error processing updated class data", 500, nil), nil
	}

	return shared.CreateSuccessResponse(map[string]interface{}{
		"message": "Class updated successfully",
		"class":   updatedClass,
	}, 200), nil
}

// handleDeleteClass handles DELETE requests to delete a class
func handleDeleteClass(ctx context.Context, event events.APIGatewayProxyRequest) (events.APIGatewayProxyResponse, error) {
	// Get class ID from path parameters
	classID, ok := event.PathParameters["id"]
	if !ok || classID == "" {
		return shared.CreateErrorResponse("Class ID is required", 400, nil), nil
	}

	requestID := "unknown"
	if event.RequestContext.RequestID != "" {
		requestID = event.RequestContext.RequestID
	}

	// Get DynamoDB client
	dbClient, err := shared.GetDynamoDBClient(ctx)
	if err != nil {
		log.Printf("Error getting DynamoDB client: %v", err)
		return shared.CreateErrorResponse("Internal server error", 500, nil), nil
	}

	classesTable := os.Getenv("CLASSES_TABLE")
	bookingsTable := os.Getenv("BOOKINGS_TABLE")
	usersTable := os.Getenv("USERS_TABLE")

	if classesTable == "" || bookingsTable == "" || usersTable == "" {
		return shared.CreateErrorResponse("Required environment variables not set", 500, nil), nil
	}

	// Check if class exists
	classResult, err := dbClient.GetItem(ctx, &dynamodb.GetItemInput{
		TableName: aws.String(classesTable),
		Key: map[string]types.AttributeValue{
			"id": &types.AttributeValueMemberS{Value: classID},
		},
	})
	if err != nil {
		log.Printf("Error getting class: %v", err)
		return shared.CreateErrorResponse("Error retrieving class", 500, nil), nil
	}

	if len(classResult.Item) == 0 {
		return shared.CreateErrorResponse("Class not found", 404, nil), nil
	}

	// Parse the class details
	var classDetails Class
	if err := attributevalue.UnmarshalMap(classResult.Item, &classDetails); err != nil {
		log.Printf("Error unmarshalling class: %v", err)
		shared.LogWithContext("error", "Error unmarshalling class", map[string]interface{}{
			"requestId": requestID,
			"classId":   classID,
			"error":     err.Error(),
		})
		return shared.CreateErrorResponse("Error processing class data", 500, nil), nil
	}

	// Find all bookings for this class
	// First build the query expression
	keyExpr := expression.Key("classId").Equal(expression.Value(classID))
	filterExpr := expression.Name("status").Equal(expression.Value("confirmed"))

	expr, err := expression.NewBuilder().
		WithKeyCondition(keyExpr).
		WithFilter(filterExpr).
		Build()
	if err != nil {
		log.Printf("Error building expression: %v", err)
		shared.LogWithContext("error", "Error building expression for booking query", map[string]interface{}{
			"requestId": requestID,
			"classId":   classID,
			"error":     err.Error(),
		})
		return shared.CreateErrorResponse("Error building query expression", 500, nil), nil
	}

	// Execute the query
	queryResult, err := dbClient.Query(ctx, &dynamodb.QueryInput{
		TableName:                 aws.String(bookingsTable),
		IndexName:                 aws.String("ClassBookingsIndex"),
		KeyConditionExpression:    expr.KeyCondition(),
		FilterExpression:          expr.Filter(),
		ExpressionAttributeNames:  expr.Names(),
		ExpressionAttributeValues: expr.Values(),
	})
	if err != nil {
		log.Printf("Error querying bookings: %v", err)
		shared.LogWithContext("error", "Error querying bookings", map[string]interface{}{
			"requestId": requestID,
			"classId":   classID,
			"error":     err.Error(),
		})
		return shared.CreateErrorResponse("Error retrieving bookings", 500, nil), nil
	}

	// Parse the bookings
	var bookings []Booking
	if err := attributevalue.UnmarshalListOfMaps(queryResult.Items, &bookings); err != nil {
		log.Printf("Error unmarshalling bookings: %v", err)
		shared.LogWithContext("error", "Error unmarshalling bookings", map[string]interface{}{
			"requestId": requestID,
			"classId":   classID,
			"error":     err.Error(),
		})
		return shared.CreateErrorResponse("Error processing booking data", 500, nil), nil
	}

	shared.LogWithContext("info", fmt.Sprintf("Found %d bookings for class being deleted", len(bookings)), map[string]interface{}{
		"requestId": requestID,
		"classId":   classID,
		"className": classDetails.Title,
	})

	// Delete the class
	_, err = dbClient.DeleteItem(ctx, &dynamodb.DeleteItemInput{
		TableName: aws.String(classesTable),
		Key: map[string]types.AttributeValue{
			"id": &types.AttributeValueMemberS{Value: classID},
		},
	})
	if err != nil {
		log.Printf("Error deleting class: %v", err)
		shared.LogWithContext("error", "Error deleting class", map[string]interface{}{
			"requestId": requestID,
			"classId":   classID,
			"error":     err.Error(),
		})
		return shared.CreateErrorResponse("Error deleting class", 500, nil), nil
	}

	// Process bookings and get user details
	var users []map[string]interface{}
	timestamp := time.Now().UTC().Format(time.RFC3339)

	for _, booking := range bookings {
		// Get user details
		userResult, err := dbClient.GetItem(ctx, &dynamodb.GetItemInput{
			TableName: aws.String(usersTable),
			Key: map[string]types.AttributeValue{
				"id": &types.AttributeValueMemberS{Value: booking.UserID},
			},
		})
		if err != nil {
			log.Printf("Error getting user: %v", err)
			continue
		}

		if len(userResult.Item) > 0 {
			var user map[string]interface{}
			if err := attributevalue.UnmarshalMap(userResult.Item, &user); err != nil {
				log.Printf("Error unmarshalling user: %v", err)
				continue
			}
			users = append(users, user)
		}

		// Update booking status to cancelled
		updateExpr := expression.Set(
			expression.Name("status"),
			expression.Value("canceled"),
		).Set(
			expression.Name("updatedAt"),
			expression.Value(timestamp),
		).Set(
			expression.Name("cancelReason"),
			expression.Value("Class cancelled by admin"),
		)

		expr, err := expression.NewBuilder().WithUpdate(updateExpr).Build()
		if err != nil {
			log.Printf("Error building expression: %v", err)
			continue
		}

		_, err = dbClient.UpdateItem(ctx, &dynamodb.UpdateItemInput{
			TableName: aws.String(bookingsTable),
			Key: map[string]types.AttributeValue{
				"id": &types.AttributeValueMemberS{Value: booking.ID},
			},
			UpdateExpression:          expr.Update(),
			ExpressionAttributeNames:  expr.Names(),
			ExpressionAttributeValues: expr.Values(),
		})
		if err != nil {
			log.Printf("Error updating booking status: %v", err)
		}
	}

	// Send cancellation emails to affected users
	if len(users) > 0 {
		// Create the email service
		emailService, err := shared.NewEmailService(ctx)
		if err != nil {
			log.Printf("Error creating email service: %v", err)
			shared.LogWithContext("error", "Error creating email service", map[string]interface{}{
				"requestId": requestID,
				"classId":   classID,
				"error":     err.Error(),
			})
		} else {
			// Convert class details to map for email service
			classInfo := map[string]interface{}{
				"id":           classDetails.ID,
				"title":        classDetails.Title,
				"scheduleDate": classDetails.ScheduleDate,
				"startTime":    classDetails.StartTime,
				"endTime":      classDetails.EndTime,
			}

			// Send emails in a goroutine to avoid blocking
			go func() {
				results := emailService.SendClassCancellationEmailsToAll(context.Background(), classInfo, users)
				shared.LogWithContext("info", fmt.Sprintf("Class cancellation notifications: %d sent, %d failed", results.Success, results.Failed), map[string]interface{}{
					"requestId": requestID,
					"classId":   classID,
				})

				if results.Failed > 0 {
					shared.LogWithContext("warn", "Some cancellation emails failed to send", map[string]interface{}{
						"requestId": requestID,
						"classId":   classID,
						"errors":    results.Errors,
					})
				}
			}()
		}
	}

	return shared.CreateSuccessResponse(map[string]interface{}{
		"message": fmt.Sprintf("Class deleted successfully. %d affected bookings are being cancelled.", len(bookings)),
		"classId": classID,
	}, 200), nil
}

func main() {
	lambda.Start(Handler)
}
