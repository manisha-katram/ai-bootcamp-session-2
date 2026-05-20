# Coding Guidelines - TODO App

## 1. Code Style and Formatting
- Use Prettier for all JavaScript, TypeScript, JSON, CSS, and Markdown formatting.
- Format code before committing changes.
- Do not manually fight formatter output; align code with project formatting rules.
- Keep line length and whitespace consistent with Prettier defaults or project config.

## 2. Imports and Module Structure
- Ensure imports are always organized.
- Group imports in this order: third-party packages, internal modules, relative modules.
- Remove unused imports and dead exports.
- Prefer named exports for shared utilities unless a default export improves clarity.
- Avoid circular dependencies between modules.

## 3. Naming Conventions
- Use clear, descriptive names for variables, functions, classes, and files.
- Use camelCase for variables and functions.
- Use PascalCase for React components and classes.
- Use UPPER_SNAKE_CASE for true constants.
- Name files to match their primary responsibility.

## 4. Function and Component Design
- Keep functions small and focused on a single responsibility.
- Prefer pure functions for business logic where practical.
- Keep React components focused and split large components into smaller units.
- Avoid deeply nested conditionals; extract helper functions when logic becomes complex.
- Favor composition over duplication.

## 5. State and Data Handling
- Keep state minimal and derive values when possible.
- Validate all external input at boundaries (API requests, forms, query params).
- Handle error states explicitly.
- Avoid mutating shared state directly.

## 6. Error Handling and Logging
- Fail fast with clear, actionable error messages.
- Catch and handle expected runtime errors in API and async flows.
- Do not swallow errors silently.
- Use consistent logging patterns and avoid noisy logs in production paths.

## 7. Testing Expectations
- New features should include appropriate tests.
- Bug fixes should include regression tests when feasible.
- Keep tests deterministic, isolated, and readable.
- Prefer behavior-based assertions over implementation details.

## 8. Security and Reliability
- Never hardcode secrets, tokens, or credentials.
- Use environment variables for configuration.
- Sanitize and validate user input.
- Apply least-privilege access patterns for backend operations.

## 9. Accessibility and UX Code Quality
- Use semantic elements and accessible labels for interactive UI.
- Ensure keyboard operability for core workflows.
- Keep visible focus states intact.
- Do not rely on color alone to communicate status.

## 10. Git and Review Practices
- Keep pull requests small and focused.
- Write clear commit messages describing intent.
- Run linting and tests before opening or merging a pull request.
- Address review comments with code changes or clear rationale.

## 11. Documentation and Maintainability
- Update relevant docs when behavior or architecture changes.
- Add concise comments only when logic is non-obvious.
- Remove obsolete code paths instead of leaving commented-out code.
- Prefer explicitness over clever shortcuts when readability is impacted.
