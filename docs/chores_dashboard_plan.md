# Chores Dashboard Plan

## Context
- Aim: recreate a multi-column chore board (Todoist-backed) similar to the reference screenshot.
- Data source: custom Todoist integration, one project per person (`sensor.<name>_chores` + `todo.<name>_chores`).
- UI stack: Lovelace manual YAML using `custom:button-card`, Browser Mod popups, and Markdown cards for stats.

## What Worked
- Browser Mod popups render reliably when using the updated `data` + `content` syntax. The Add Chore modal loads and triggers `script.add_chore_router`.
- Separating the navigation buttons into their own `horizontal-stack` keeps the main chore grid full-width and visually clean.
- Completed-task sections render correctly after renaming template variables (`completed_html`) and hard-coding styles inside each `custom_fields` block.
- Using `pointer-events: none` on icons/text prevents accidental double-highlighting when wrapping each task in a clickable container.

## What Did Not (Yet)
- Task completion clicks still misfire: inline handlers defined in the template (`onclick='window.choreClickNas(this)'`) generate scoped-name errors; `config.event` is not available inside `service_data` templates, so the current approach cannot mark individual tasks complete.
- Global helper functions injected into `window` from multiple button instances collide or fail if declared more than once; Home Assistant’s sandboxed eval makes persistent globals brittle.
- Reusing shared style templates (“templates.chore_list_item_styles”) from within the JavaScript template fails because that object is undefined in the sandbox; all styles must be inlined per card.

## Working Directions
1. Replace per-item `onclick` handlers with a single `tap_action: action: fire-dom-event` and listen via `browser_mod` or `custom:button-card` `card_click` events to extract the clicked element in a script helper.
2. Alternatively, switch to the [`custom:button-card` `chip` + `template` pattern](https://github.com/custom-cards/button-card#tap_action) that passes `tap_action.variables` and use `[[[ return entity.attributes.tasks[index] ]]]` to pre-bind item ids instead of DOM scraping.
3. Persist layout win: keep navigation bar separate; add helper inputs for date navigation later if needed.

## Skylight Visual Parity Goals
- Columns must replicate the Skylight layout shown in `docs/Skylight/mceclip*.png`, including column width, gutter spacing, 24 px column radius, and 16 px task card radius.
- Header stack includes avatar, name, progress capsule (✓ plus `open/total`), and star counter; spacing and alignment must match the screenshots.
- Section dividers (Morning, Afternoon, Evening, Anytime) appear inside each column with uppercase labels, thin separators, and inline filter icons matching the Skylight treatment.
- Task cards surface emoji, overdue helper text, and checkbox; completed tasks switch to muted background/typography while preserving structure.
- Hover/focus interactions mirror Skylight: subtle elevation on hover, accent checkbox fill on focus/tap, and consistent cursor feedback.
- Add/edit/delete modals copy Skylight layouts: header icon, stacked input spacing, segmented controls for time buckets, and destructive button styling.

## Execution Plan
1. **Interaction Layer**
	- Finalise `script.complete_todo_item` logic using `task_id` + `todo_entity` payloads; ensure the same handler supports hover/focus state updates for checkbox visuals.
	- Expose additional service hooks for edit/delete to be consumed by modal actions.
2. **Template Refactor**
	- Expand `button_card_templates.chore_header` with progress capsule + star counter markup and ensure dynamic values pull from sensor attributes.
	- Introduce section header partials so Morning/Afternoon/Evening groups render consistently across profiles.
	- Rework `chore_task` template to surface emoji, overdue styling, completed-state palette, and hover/focus transitions.
3. **Modal Suite**
	- Build Browser Mod schema for add/edit/delete flows that match Skylight spacing, typography, and button hierarchy.
	- Wire modal actions to Todoist services, then validate closing behaviour refreshes the coordinator to keep UI in sync.
4. **Styling Tokens & Theme**
	- Define CSS variables (colours, radii, spacing) in the theme or shared card-mod block to guarantee parity across profiles.
	- Measure UI against reference screenshots using overlays to confirm relative sizes and adjust padding/margins accordingly.
5. **Verification**
	- Capture before/after comparisons for each column, hover state, and modal; annotate any necessary deviations in the docs.
	- Add regression notes so future changes keep parity (e.g., linking to `docs/chore_ui_parity_task_list.md`).

## Next Steps
- Finalise `script.complete_todo_item` with stable payloads and integrate it across all task cards.
- Ensure Todoist `task.id` surfaces via sensors/templates to guarantee unique references during modal actions.
- Replace the Nas debug card with the production `custom:auto-entities` stack and fix the fallback logic, then replicate parity updates across Simona, Hari, and Anyone columns.
- Implement the execution plan above (sections, templates, modals, tokens) while ticking through `docs/chore_ui_parity_task_list.md` as the authoritative checklist.
- Conduct overlay-based QA against the Skylight screenshots and capture findings in this document once complete.
