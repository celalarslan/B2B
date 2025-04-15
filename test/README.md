# Testing Documentation for B2B Call Assistant

This directory contains tests for the B2B Call Assistant web application. The testing setup includes both unit/integration tests using Jest and React Testing Library, as well as end-to-end tests using Playwright.

## Test Structure

```
test/
├── __mocks__/              # Mock files for tests
├── components/             # Unit tests for React components
├── e2e/                    # End-to-end tests with Playwright
├── mocks/                  # MSW handlers for API mocking
├── store/                  # Tests for state management
├── coverage.config.js      # Coverage configuration
├── jest.setup.js           # Jest setup file
├── README.md               # This documentation
└── setup-msw.js            # MSW setup for API mocking
```

## Running Tests

### Unit and Integration Tests

Run all unit and integration tests:

```bash
npm test
```

Run tests in watch mode (for development):

```bash
npm run test:watch
```

Generate coverage report:

```bash
npm run test:coverage
```

### End-to-End Tests

Run all E2E tests:

```bash
npm run test:e2e
```

Run E2E tests with UI:

```bash
npm run test:e2e:ui
```

## Test Coverage

The project aims for at least 70% test coverage across statements, branches, functions, and lines. Coverage reports are generated in the `coverage` directory when running `npm run test:coverage`.

## Testing Approach

### Unit Tests

Unit tests focus on testing individual components and functions in isolation. We use Jest and React Testing Library for these tests.

Key components tested:
- PhoneNumberInput
- CopyButton (within ForwardingCodeDisplay)
- LanguageSwitcher
- CodeDisplay (ForwardingCodeDisplay)
- UserAssistant

### Integration Tests

Integration tests verify that multiple components work together correctly. These tests also use Jest and React Testing Library.

Key integrations tested:
- ForwardingForm with its child components
- UserChatStore with API interactions

### End-to-End Tests

E2E tests simulate real user interactions with the application. We use Playwright for these tests.

Key flows tested:
- Complete call forwarding flow
- User assistant interaction
- Internationalization
- Accessibility
- Responsiveness
- Performance

## Mocking

We use Mock Service Worker (MSW) to intercept and mock API requests during tests. This allows us to test the application without making actual API calls.

Key APIs mocked:
- OpenAI API (chat completions and audio transcriptions)
- ElevenLabs API (text-to-speech)
- Supabase API (database and authentication)

## Continuous Integration

These tests are designed to be run in a CI environment. The configuration includes:
- Retry logic for flaky tests
- Parallel test execution
- Screenshot capture on failure
- HTML report generation

## Adding New Tests

When adding new components or features, please add corresponding tests:

1. Unit tests for new components in `test/components/`
2. Integration tests for new features that span multiple components
3. E2E tests for new user flows in `test/e2e/`

## Best Practices

- Keep tests focused and isolated
- Use descriptive test names
- Avoid testing implementation details
- Test user interactions and outcomes
- Maintain test independence (tests should not depend on each other)
- Use appropriate assertions for each test case