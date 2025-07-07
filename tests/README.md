# Testing Framework Documentation

This directory contains the testing framework for the yoga-website project. The testing is organized into different types to ensure comprehensive coverage and maintainability.

## Test Types

### Unit Tests

Unit tests are located in the `tests/unit` directory and focus on testing individual functions and components in isolation.

- Tests for backend utilities and functions
- Tests for JavaScript frontend modules

### DOM Tests

DOM tests are located in the `tests/dom` directory and focus on testing browser-specific functionality.

- Tests for DOM manipulation and interaction
- Tests for UI components and behavior
- Tests requiring JSDOM environment

### Integration Tests

Integration tests are located in the `tests/integration` directory and verify that multiple components work together properly.

- API endpoint tests
- Public page access tests
- Database interaction tests

## Running Tests

The following npm scripts are available for running tests:

- `npm test` - Run all tests
- `npm run test:unit` - Run only unit tests
- `npm run test:dom` - Run DOM-specific tests that require a browser environment
- `npm run test:integration` - Run integration tests (requires server running on port 5001)
- `npm run test:all` - Run all tests (unit, DOM, and integration) in sequence
- `npm run test:watch` - Run tests in watch mode for development
- `npm run test:coverage` - Run tests with coverage report

## Test Configuration

- `jest.config.js` - Main Jest configuration file
- `jest.dom.config.js` - Configuration for DOM-specific tests
- `tests/setup.js` - Global setup for all tests
- `tests/dom/setup.js` - Setup for DOM tests, includes mocks for browser APIs

## Environment Variables

Tests use environment variables from `.env` file by default. The test environment will:

1. Set `NODE_ENV=test` automatically
2. Use `JWT_SECRET=test-jwt-secret-for-unit-tests` if not provided
3. Default to port 5001 for integration tests

## Integration with Deployment

The `deploy.sh` script runs all tests before deployment:

1. Starts a test server on port 5001
2. Runs all test suites (unit, DOM, and integration)
3. Proceeds with deployment only if all tests pass

## Best Practices

1. **Test Isolation**: Each test should be independent and not rely on the state of other tests.
2. **Mocking**: External dependencies should be mocked when appropriate.
3. **Test Coverage**: Aim for comprehensive test coverage, focusing on critical paths.
4. **Descriptive Names**: Use descriptive test names that explain what's being tested.
5. **Test Organization**: Group related tests using `describe` blocks.

## Adding New Tests

When adding new tests:

1. Place unit tests in `tests/unit`
2. Place DOM-specific tests in `tests/dom`
3. Place integration tests in `tests/integration`
4. Follow the existing patterns for naming and organization
