# Testing Guidelines - TODO App

## 1. Testing Goals
- Ensure the TODO app behaves correctly for core user flows.
- Prevent regressions as features are added or refactored.
- Keep tests fast, readable, and maintainable.

## 2. Test Types

### Unit Tests
- Use Jest to test individual functions and React components in isolation.
- Unit test files must use the naming convention `*.test.js` or `*.test.ts`.
- Backend unit tests must be placed in `packages/backend/__tests__/`.
- Frontend unit tests must be placed in `packages/frontend/src/__tests__/`.
- Name unit test files to match what they test (for example: `app.test.js` for `app.js`).
- Cover core task operations such as add, edit, complete, delete, due date updates, and filtering/sorting logic.

### Integration Tests
- Use Jest and Supertest to test backend API endpoints with real HTTP requests.
- Integration tests must be placed in `packages/backend/__tests__/integration/`.
- Integration test files must use the naming convention `*.test.js` or `*.test.ts`.
- Name integration tests based on the endpoint area they cover (for example: `todos-api.test.js`).
- Validate critical flows such as creating tasks, editing tasks, completing tasks, clearing completed tasks, and filtering/search behavior.

### End-to-End (E2E) Tests
- Use Playwright as the required framework to test complete UI workflows through browser automation.
- E2E tests must be placed in `tests/e2e/`.
- E2E test files must use the naming convention `*.spec.js` or `*.spec.ts`.
- Name E2E test files based on user journey (for example: `todo-workflow.spec.js`).
- Limit E2E coverage to 5 to 8 critical user journeys focused on happy paths and key edge cases.
- Playwright tests must use one browser only.
- Playwright tests must use the Page Object Model (POM) pattern.

## 3. Test Design Principles
- Prefer behavior-focused tests over implementation-detail tests.
- Use clear Arrange-Act-Assert structure.
- All tests must be isolated and independent.
- Avoid shared mutable state across tests.
- Each test should verify one primary behavior.
- Setup and teardown hooks are required so tests can run successfully multiple times.

## 4. Coverage Expectations
- Maintain meaningful coverage on business logic and critical flows.
- Prioritize coverage for:
	- Task CRUD behavior
	- Due date and overdue logic
	- Filtering/sorting/search behavior
	- Error and edge-case handling
- Do not chase coverage percentage at the expense of test quality.

## 5. Accessibility and UI Testing
- Include tests that verify accessible names and labels for controls.
- Assert keyboard accessibility for key workflows (tab navigation, submit actions).
- Validate important status text and feedback messages shown to users.
- Prefer querying UI by role/label/text rather than implementation-specific selectors.

## 6. API and Data Layer Testing
- Validate request/response handling and error states.
- Test input validation and data transformation logic.
- Ensure persistence logic correctly saves and restores task state.

## 7. Error and Edge Cases
- Test empty states (no tasks).
- Test invalid input (for example, empty task title).
- Test long text and special characters in task title/description.
- Test boundary dates and overdue transitions.
- Test failure paths (network/service failure, storage read/write failure).

## 8. Port Configuration for Tests and Runtime
- Always use environment variables with sensible defaults for port configuration.
- Backend should use `const PORT = process.env.PORT || 3030;`.
- Frontend defaults to port 3000 and can be overridden with the `PORT` environment variable.
- This supports CI/CD workflows where ports may be assigned dynamically.

## 9. Test Data and Fixtures
- Use minimal, realistic fixtures focused on scenario needs.
- Keep fixtures reusable but avoid over-generalized data builders.
- Name fixtures descriptively (for example: overdueTask, completedTask).

## 10. Execution in CI
- Run tests automatically on pull requests and main branch updates.
- Fail the pipeline on test failures.
- Keep CI test runs stable and fast to support rapid feedback.

## 11. Code Review Expectations for Tests
- New features should include appropriate unit and/or integration tests.
- Bug fixes should include a regression test when feasible.
- Test names should describe user-observable behavior.
- Flaky tests must be fixed or removed promptly.

## 12. Suggested Tooling (Project-Appropriate)
- Use Jest as the test runner.
- Use React Testing Library for frontend component/integration tests.
- Use Supertest for backend HTTP integration tests.
- Use Playwright for E2E browser workflows.

## 13. Definition of Done (Testing)
A feature is considered test-complete when:
- Relevant unit tests are added or updated.
- Integration tests cover critical workflow behavior.
- E2E tests are added or updated when user journey behavior changes.
- Existing tests continue to pass.
- No new high-risk untested path is introduced.
