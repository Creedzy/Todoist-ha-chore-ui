# Todoist Integration Modernization Plan

## Validation Summary
- Specification aligns with Home Assistant architectural guidelines and leverages the official `todoist-api-python` async SDK for REST v2 coverage.
- Proposed coordinator-centric design resolves prior fragmentation by centralizing task, project, and label retrieval with resilient error handling.
- Expanded service layer (e.g., `todoist.update_task`, `todoist.get_task`) is feasible via Home Assistant service schemas, enabling fine-grained task management.
- HACS packaging requirements (manifest versioning, `hacs.json`, semantic releases) are compatible with the repository layout and ensure distributable builds.
- Automation examples rely on newly exposed task attributes; the enriched data model supports these use cases without breaking existing entities when defaults are preserved.

## Phase 1 – Environment & Baseline
- Duplicate the core `homeassistant/components/todoist` integration into `custom_components/todoist` for development parity.
- Add `.devcontainer` configuration (optional but recommended) and document restart workflow for local Home Assistant instances.
- Update `manifest.json` with `todoist-api-python>=3.1.0`, explicit `version`, and `iot_class: cloud_polling`; remove legacy dependencies.
- Introduce foundational constants (`DOMAIN`, service names, option keys) in `const.py` to support new modules.

## Phase 2 – API Client Integration
- Create an async factory to instantiate `TodoistAPIAsync` with config entry credentials and options (language, include archived, etc.).
- Establish structured error handling for authentication, throttling, and request timeouts; surface failures via `ConfigEntryNotReady` when appropriate.
- Define lightweight adapters to convert Pydantic models (`Task`, `Project`, `Label`) into Home Assistant friendly dicts while preserving raw objects for diagnostics.

## Phase 3 – DataUpdateCoordinator Core
- Implement `TodoistDataUpdateCoordinator` with concurrent retrieval of projects, tasks, and labels; respect user options for filters and query params.
- Cache complete task payloads keyed by project and task IDs; include metadata like `last_synced` for downstream consumers.
- Provide helper methods on the coordinator for CRUD operations (create/update/close task) that refresh data post-mutation.

## Phase 4 – Entity Refactors
- Refactor `todo.py` entities to inherit from `CoordinatorEntity`, expose full task dictionaries in `extra_state_attributes`, and retain backward-compatible state values.
- Update calendar entities to read from coordinator caches, constructing events with accurate due datetime, description, URL, and section context.
- Add diagnostics support (if absent) to export the cached data for troubleshooting.

## Phase 5 – Services & Schema Enhancements
- Expand `services.yaml` to cover new optional task fields (description, due datetime, labels, priority, assignment, reminders, comments).
- Implement service handlers in `services.py`, validating inputs and invoking coordinator helper methods; include option to return the full task payload in service response or via events.
- Ensure existing service signatures remain functional; default to minimal updates unless advanced parameters supplied.

## Phase 6 – Options Flow & Configuration
- Extend `config_flow.py` to capture toggles such as advanced mode, project/label filters, inclusion of archived items, and response verbosity.
- Persist options, wire them into coordinator initialization, and expose reconfigure flow for adjustments.
- Provide translations in `strings.json` for new options and error messages.

## Phase 7 – Testing & QA
- Add unit tests covering coordinator fetch logic, service handlers, and entity attribute serialization using fixtures for Pydantic models.
- Mock Todoist API responses for recurring tasks, sections, assignments, and error cases.
- Validate that default configuration reproduces existing behavior; advanced mode tests should confirm enriched payload availability and service flexibility.

## Phase 8 – Documentation & Distribution
- Document usage in `README.md` (or dedicated docs) covering setup, new options, services, and automation examples.
- Author `hacs.json`, outline release workflow, and maintain semantic versioning for GitHub releases.
- Provide migration notes for users upgrading from the core integration, including instructions for removing the stock component before enabling the custom one.

## Phase 9 – Post-Implementation Checklist
- Manual QA in a test Home Assistant instance verifying entity updates, calendar accuracy, and service responses.
- Monitor Todoist API quota usage; adjust coordinator interval or implement backoff if necessary.
- Gather user feedback via issues/discussions; triage for upstream PR preparation once stabilized.
