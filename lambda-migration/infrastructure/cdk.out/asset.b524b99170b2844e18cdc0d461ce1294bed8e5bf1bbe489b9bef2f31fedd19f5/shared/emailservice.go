package shared

import (
	"context"
	"fmt"
	"log"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/ses"
	"github.com/aws/aws-sdk-go-v2/service/ses/types"
)

// EmailService handles sending emails using AWS SES
type EmailService struct {
	client      *ses.Client
	defaultFrom string
}

// EmailResult contains the result of sending an email
type EmailResult struct {
	Success   bool
	MessageID string
	Error     error
}

// BatchEmailResult contains the results of sending multiple emails
type BatchEmailResult struct {
	Success int
	Failed  int
	Errors  []map[string]string
}

// NewEmailService creates a new EmailService instance
func NewEmailService(ctx context.Context) (*EmailService, error) {
	cfg, err := config.LoadDefaultConfig(ctx)
	if err != nil {
		return nil, fmt.Errorf("unable to load SDK config: %w", err)
	}

	// Use environment variable for region if available
	region := os.Getenv("AWS_REGION")
	if region != "" {
		cfg.Region = region
	} else {
		cfg.Region = "us-east-1" // Default region
	}

	// Default sender address
	defaultFrom := os.Getenv("FROM_EMAIL")
	if defaultFrom == "" {
		defaultFrom = "noreply@gabi.yoga"
	}

	return &EmailService{
		client:      ses.NewFromConfig(cfg),
		defaultFrom: defaultFrom,
	}, nil
}

// GetBaseURL returns the base URL for links in emails
func GetBaseURL() string {
	stage := os.Getenv("STAGE")
	if stage == "prod" {
		return "https://gabi.yoga"
	}
	return "https://dev.gabi.yoga"
}

// FormatDateTimeString formats a date and time for email display
func FormatDateTimeString(dateStr, timeStr string) string {
	if dateStr == "" {
		return "N/A"
	}

	date, err := time.Parse("2006-01-02", dateStr)
	if err != nil {
		return "N/A"
	}

	formattedString := date.Format("Monday, January 2, 2006")

	if timeStr != "" {
		// Convert 24h time format to 12h format
		timeParts := strings.Split(timeStr, ":")
		if len(timeParts) >= 2 {
			hours, _ := strconv.Atoi(timeParts[0])
			minutes := timeParts[1]
			ampm := "AM"
			if hours >= 12 {
				ampm = "PM"
			}
			displayHours := hours % 12
			if displayHours == 0 {
				displayHours = 12
			}
			formattedString += fmt.Sprintf(" at %d:%s %s", displayHours, minutes, ampm)
		}
	}

	return formattedString
}

// SendEmail sends an email using Amazon SES
func (es *EmailService) SendEmail(ctx context.Context, to, subject, htmlBody, textBody string) (string, error) {
	input := &ses.SendEmailInput{
		Source: aws.String(es.defaultFrom),
		Destination: &types.Destination{
			ToAddresses: []string{to},
		},
		Message: &types.Message{
			Subject: &types.Content{
				Data:    aws.String(subject),
				Charset: aws.String("UTF-8"),
			},
			Body: &types.Body{
				Html: &types.Content{
					Data:    aws.String(htmlBody),
					Charset: aws.String("UTF-8"),
				},
				Text: &types.Content{
					Data:    aws.String(textBody),
					Charset: aws.String("UTF-8"),
				},
			},
		},
	}

	result, err := es.client.SendEmail(ctx, input)
	if err != nil {
		return "", fmt.Errorf("error sending email: %w", err)
	}

	return *result.MessageId, nil
}

// SendClassCancellationEmail sends a class cancellation email
func (es *EmailService) SendClassCancellationEmail(ctx context.Context, email, firstName string, classInfo map[string]string) (EmailResult, error) {
	baseURL := GetBaseURL()
	classDate := FormatDateTimeString(classInfo["scheduleDate"], classInfo["startTime"])

	subject := "Class Cancellation Notice"

	htmlContent := fmt.Sprintf(`
		<html>
		<head>
			<style>
				body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
				.container { max-width: 600px; margin: 0 auto; padding: 20px; }
				.header { background-color: #6B8E23; padding: 10px; color: white; text-align: center; }
				.content { padding: 20px; background-color: #f9f9f9; }
				.footer { text-align: center; margin-top: 20px; font-size: 0.8em; color: #666; }
				.button { display: inline-block; background-color: #6B8E23; color: white; text-decoration: none; padding: 10px 15px; border-radius: 5px; }
			</style>
		</head>
		<body>
			<div class="container">
				<div class="header">
					<h2>Class Cancellation Notice</h2>
				</div>
				<div class="content">
					<p>Hello %s,</p>
					<p>Unfortunately, we need to inform you that the following class has been cancelled:</p>
					<p><strong>%s</strong> on <strong>%s</strong></p>
					<p>We apologize for any inconvenience this may cause. Your booking has been automatically cancelled, and if there was any payment associated with this class, it will be refunded according to our refund policy.</p>
					<p>Please check our schedule for alternative classes or contact us if you have any questions.</p>
					<p><a href="%s/schedule" class="button">View Class Schedule</a></p>
				</div>
				<div class="footer">
					<p>This email was sent to %s from Gabi Yoga.</p>
					<p>&copy; Gabi Yoga. All rights reserved.</p>
				</div>
			</div>
		</body>
		</html>
	`, firstName, classInfo["title"], classDate, baseURL, email)

	textContent := fmt.Sprintf(`
Hello %s,

Unfortunately, we need to inform you that the following class has been cancelled:

%s on %s

We apologize for any inconvenience this may cause. Your booking has been automatically cancelled, and if there was any payment associated with this class, it will be refunded according to our refund policy.

Please check our schedule for alternative classes or contact us if you have any questions.

View Class Schedule: %s/schedule

This email was sent to %s from Gabi Yoga.
© Gabi Yoga. All rights reserved.
	`, firstName, classInfo["title"], classDate, baseURL, email)

	messageID, err := es.SendEmail(ctx, email, subject, htmlContent, textContent)

	result := EmailResult{
		Success:   err == nil,
		MessageID: messageID,
		Error:     err,
	}

	return result, err
}

// SendClassCancellationEmailsToAll sends cancellation emails to all registered users
func (es *EmailService) SendClassCancellationEmailsToAll(ctx context.Context, classInfo map[string]interface{}, registeredUsers []map[string]interface{}) BatchEmailResult {
	results := BatchEmailResult{
		Success: 0,
		Failed:  0,
		Errors:  []map[string]string{},
	}

	// Convert classInfo to string map for the email function
	classStringMap := make(map[string]string)
	for k, v := range classInfo {
		if s, ok := v.(string); ok {
			classStringMap[k] = s
		} else {
			classStringMap[k] = fmt.Sprintf("%v", v)
		}
	}

	// Process in batches to avoid throttling
	const batchSize = 10
	for i := 0; i < len(registeredUsers); i += batchSize {
		end := i + batchSize
		if end > len(registeredUsers) {
			end = len(registeredUsers)
		}

		batch := registeredUsers[i:end]

		// Process each user in the batch
		for _, user := range batch {
			email, _ := user["email"].(string)
			firstName, _ := user["firstName"].(string)

			if email == "" {
				results.Failed++
				results.Errors = append(results.Errors, map[string]string{
					"email": fmt.Sprintf("%v", user["email"]),
					"error": "Invalid email address",
				})
				continue
			}

			result, err := es.SendClassCancellationEmail(ctx, email, firstName, classStringMap)
			if err != nil {
				results.Failed++
				results.Errors = append(results.Errors, map[string]string{
					"email": email,
					"error": err.Error(),
				})
			} else {
				results.Success++
			}
		}

		// Add a short delay between batches to avoid throttling
		if i+batchSize < len(registeredUsers) {
			time.Sleep(time.Second)
		}
	}

	// Log the results
	log.Printf("Class cancellation notifications: %d sent, %d failed", results.Success, results.Failed)
	if results.Failed > 0 {
		log.Printf("Errors: %v", results.Errors)
	}

	return results
}

// CheckSESStatus checks the SES service status
func (es *EmailService) CheckSESStatus(ctx context.Context) (map[string]interface{}, error) {
	// Check account sending enabled
	sendingEnabledOutput, err := es.client.GetAccountSendingEnabled(ctx, &ses.GetAccountSendingEnabledInput{})
	if err != nil {
		return nil, fmt.Errorf("error checking SES account status: %w", err)
	}

	// Get send quota
	sendQuotaOutput, err := es.client.GetSendQuota(ctx, &ses.GetSendQuotaInput{})
	if err != nil {
		return nil, fmt.Errorf("error getting SES send quota: %w", err)
	}

	// List identities
	identitiesOutput, err := es.client.ListIdentities(ctx, &ses.ListIdentitiesInput{
		IdentityType: types.IdentityTypeDomain,
	})
	if err != nil {
		return nil, fmt.Errorf("error listing SES identities: %w", err)
	}

	// Determine if in sandbox mode
	inSandbox := *sendQuotaOutput.MaxSendRate < 10 // Rough estimate

	return map[string]interface{}{
		"sendingEnabled": sendingEnabledOutput.Enabled,
		"sendQuota": map[string]interface{}{
			"max24HourSend":   *sendQuotaOutput.Max24HourSend,
			"maxSendRate":     *sendQuotaOutput.MaxSendRate,
			"sentLast24Hours": *sendQuotaOutput.SentLast24Hours,
		},
		"identities":  identitiesOutput.Identities,
		"sandboxMode": inSandbox,
	}, nil
}
