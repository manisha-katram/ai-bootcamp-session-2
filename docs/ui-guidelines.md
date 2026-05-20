# UI Guidelines - TODO App

## 1. Design System Foundation
- The app should use Material UI (MUI) as the primary component library.
- Use MUI theme configuration to centralize typography, spacing, colors, and component variants.
- Prefer composition of MUI components over custom-built controls when equivalent components are available.
- Keep custom styling consistent with MUI tokens and spacing scale.

## 2. Core Component Usage
- Use `AppBar` for the top navigation and app title.
- Use `Container`, `Box`, and `Grid` for responsive layout structure.
- Use `Card` or `Paper` to group task list sections and task details.
- Use `TextField` for task title, notes, and search input.
- Use `Checkbox` for task completion state.
- Use `Chip` for tags, labels, and status indicators.
- Use `Select`, `MenuItem`, and `Autocomplete` for filters and category selection.
- Use `DatePicker` (MUI X) for due date entry.
- Use `Dialog` for confirmation flows like delete and clear completed.
- Use `Snackbar` and `Alert` for success/error feedback.
- Use `IconButton` for compact actions such as edit, delete, and archive.

## 3. Accessibility Requirements
- All interactive elements must be keyboard accessible and reachable with tab navigation.
- Use semantic HTML and accessible MUI patterns for forms, lists, and dialogs.
- Every form control must have a visible label or an accessible name.
- Ensure actionable icons include `aria-label` values.
- Maintain visible focus indicators for all focusable components.
- Support screen readers by using descriptive button text and status messaging.
- Ensure color is not the only signal for status; combine with text or icon indicators.
- Maintain minimum color contrast:
  - Normal text: 4.5:1 or better
  - Large text: 3:1 or better
  - UI components and focus indicators: 3:1 or better
- Respect user preferences for reduced motion where animations are used.

## 4. Color Palette Guidance
- Build palettes through the MUI theme with clear token naming: `primary`, `secondary`, `success`, `warning`, `error`, `info`, `background`, and `text`.
- Ensure each palette has accessible contrast pairs for text on filled surfaces.

### Recommended Palette A (Calm Productivity)
- Primary: #1565C0
- Secondary: #00897B
- Background: #F7F9FC
- Surface: #FFFFFF
- Text Primary: #1F2937
- Text Secondary: #4B5563
- Success: #2E7D32
- Warning: #ED6C02
- Error: #D32F2F

### Recommended Palette B (Warm Focus)
- Primary: #AD1457
- Secondary: #5D4037
- Background: #FFF8F3
- Surface: #FFFFFF
- Text Primary: #2C1F1A
- Text Secondary: #5F4A42
- Success: #2E7D32
- Warning: #EF6C00
- Error: #C62828

### Recommended Palette C (Modern Neutral)
- Primary: #37474F
- Secondary: #546E7A
- Background: #F3F5F7
- Surface: #FFFFFF
- Text Primary: #111827
- Text Secondary: #4B5563
- Success: #1B5E20
- Warning: #E65100
- Error: #B71C1C

## 5. Button Style Guidelines
- Use three button hierarchies consistently:
  - Primary actions: `Button` variant `contained`
  - Secondary actions: `Button` variant `outlined`
  - Tertiary actions: `Button` variant `text`
- Use `color="primary"` for the main action in each view.
- Use `color="error"` for destructive actions (delete, clear completed) and pair with confirmation dialogs.
- Minimum touch target should be 44x44 px for all tappable actions.
- Maintain consistent corner radius using MUI shape tokens.
- Prefer sentence case for button labels (example: "Add task", "Save changes").
- Keep labels action-oriented and concise.
- Disabled buttons must remain readable and clearly non-interactive.

## 6. Layout and Responsiveness
- Support mobile-first layouts and scale up for tablet/desktop.
- Use responsive breakpoints from the MUI theme.
- Keep primary task actions visible without horizontal scrolling.
- On small screens, collapse less-used filters into a drawer or modal.
- Maintain consistent spacing rhythm using 8px increments.

## 7. Feedback and States
- Define clear component states: default, hover, focus, active, disabled, loading, error, and success.
- Show inline validation messages for form errors.
- Show empty-state messaging when there are no tasks.
- Use loading indicators (`CircularProgress` or `LinearProgress`) for async actions.
- Confirm destructive or high-impact actions before completion.

## 8. Content and Microcopy
- Use plain, direct language for labels and helper text.
- Prefer specific messages over generic errors (example: "Task title is required").
- Keep status text consistent across the app (example: "Completed", "Overdue", "Due today").

## 9. Implementation Notes
- Create and export a shared MUI theme from a single source file.
- Define reusable component wrappers for repeated task patterns (task row, filter bar, empty state).
- Validate accessibility with automated checks (for example, axe) and manual keyboard/screen-reader testing.
- Review color contrast during implementation for all themes and states before release.
