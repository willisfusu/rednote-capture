<!--
  Sync Impact Report
  ==================
  Version change: (new) → 1.0.0

  Added Principles:
  - I. Code Quality Standards
  - II. User Experience Consistency
  - III. Test-Driven Development
  - IV. Documentation Standards
  - V. Simplicity First

  Added Sections:
  - Quality Gates
  - Development Workflow
  - Governance

  Templates Validation:
  - .specify/templates/plan-template.md ✅ (compatible - Constitution Check section exists)
  - .specify/templates/spec-template.md ✅ (compatible - requirements/success criteria align)
  - .specify/templates/tasks-template.md ✅ (compatible - test-first workflow supported)

  Follow-up TODOs: None
-->

# RedNotes Constitution

## Core Principles

### I. Code Quality Standards

All code committed to the repository MUST meet these non-negotiable standards:

- **Readability**: Code MUST be self-documenting with clear naming conventions.
  Variable names MUST describe their purpose; function names MUST describe their action.
- **Consistency**: All files MUST follow the established style guide for their language.
  Formatting MUST be enforced via automated tooling (linters, formatters).
- **No Dead Code**: Unused imports, variables, functions, or commented-out code blocks
  MUST NOT be committed. Remove rather than comment out.
- **Error Handling**: All external inputs and API boundaries MUST have explicit error
  handling. Silent failures are prohibited.

**Rationale**: Consistent, readable code reduces cognitive load, speeds up onboarding,
and minimizes bugs introduced during maintenance.

### II. User Experience Consistency

User-facing features MUST maintain a cohesive experience:

- **Visual Consistency**: UI components MUST follow established design patterns.
  Spacing, colors, typography, and interaction patterns MUST be consistent.
- **Feedback**: All user actions MUST provide clear feedback (loading states,
  success confirmations, error messages).
- **Error Messages**: User-facing errors MUST be actionable and human-readable.
  Technical details belong in logs, not user interfaces.
- **Accessibility**: Features MUST be accessible. Minimum requirements: keyboard
  navigation, sufficient color contrast, semantic HTML/components.
- **Performance**: User-facing operations MUST feel responsive. Loading indicators
  MUST appear within 100ms for operations taking longer than that threshold.

**Rationale**: Users judge quality by experience consistency. Inconsistent UX erodes
trust and increases support burden.

### III. Test-Driven Development

Testing follows a strict workflow:

- **Test First**: For new features, tests MUST be written before implementation.
  Tests MUST fail before implementation proceeds.
- **Coverage**: All business logic MUST have corresponding tests. Edge cases
  identified in specs MUST have dedicated test cases.
- **Contract Tests**: API boundaries MUST have contract tests that validate
  request/response shapes and error conditions.
- **Regression**: Bug fixes MUST include a failing test that reproduces the bug
  before the fix is applied.

**Rationale**: Test-first development forces clearer requirements thinking and
prevents regression. Tests are documentation that stays current.

### IV. Documentation Standards

Documentation MUST be maintained alongside code:

- **Code Comments**: Comments MUST explain "why", not "what". If code needs a
  "what" comment, refactor for clarity instead.
- **API Documentation**: All public APIs MUST be documented with types, parameters,
  return values, and example usage.
- **Architecture Decisions**: Significant design choices MUST be recorded with
  context and alternatives considered.
- **User-Facing Docs**: Features MUST include user documentation before release.
  Screenshots/examples MUST be updated when UI changes.

**Rationale**: Documentation reduces knowledge silos and enables asynchronous
collaboration. Undocumented features create maintenance debt.

### V. Simplicity First

Complexity MUST be justified:

- **YAGNI**: Features MUST NOT be built for hypothetical future requirements.
  Implement what is needed now.
- **Minimal Dependencies**: New dependencies MUST be justified. Prefer standard
  library solutions when functionally equivalent.
- **Avoid Premature Abstraction**: Extract patterns only after duplication is
  proven. Three instances minimum before abstracting.
- **Direct Solutions**: The simplest solution that meets requirements MUST be
  chosen unless explicitly justified otherwise.

**Rationale**: Every abstraction and dependency is a maintenance cost. Simplicity
enables faster iteration and easier debugging.

## Quality Gates

Code changes MUST pass these gates before merging:

1. **Automated Checks**: Linting, formatting, and type checking MUST pass with
   zero errors.
2. **Test Suite**: All existing tests MUST pass. New tests MUST be included for
   new functionality.
3. **Code Review**: Changes MUST be reviewed by at least one other contributor
   who verifies:
   - Constitution compliance
   - Code quality standards
   - UX consistency (for user-facing changes)
4. **Documentation**: API and user-facing documentation MUST be updated if
   behavior changes.

## Development Workflow

The standard development cycle:

1. **Specification**: Features start with a spec defining user stories, acceptance
   criteria, and success metrics.
2. **Planning**: Implementation plans MUST reference this constitution and justify
   any deviations.
3. **Test-First Implementation**: Write failing tests, implement to pass, refactor.
4. **Review**: All code passes through the quality gates defined above.
5. **Validation**: Features MUST be validated against original acceptance criteria
   before release.

## Governance

This constitution establishes the non-negotiable standards for the RedNotes project.

- **Supremacy**: This constitution supersedes conflicting practices, conventions,
  or ad-hoc decisions.
- **Amendment Process**: Changes to this constitution require:
  1. Documented proposal with rationale
  2. Review of impact on existing codebase
  3. Migration plan for affected code/docs
  4. Version increment following semantic versioning
- **Compliance Review**: All pull requests and code reviews MUST verify compliance
  with these principles.
- **Complexity Justification**: Any deviation from Simplicity First MUST be
  documented in the implementation plan with explicit justification.

**Version**: 1.0.0 | **Ratified**: 2026-01-03 | **Last Amended**: 2026-01-03
