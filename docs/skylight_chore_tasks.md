# Skylight Chore Board — Implementation Task List
## Backend Preparation
1. **Verify Todoist sensor payloads**
   - Inspect `sensor.nas_chores`, `sensor.simona_chores`, `sensor.hari_chores`, `sensor.anyone_chores` in Developer Tools → States and confirm `extra_state_attributes.tasks` includes `due`, `is_completed`, `labels`, and `description` fields. These built-in sensors from the custom integration will power every column.

2. **Add helper entities for UI state**
     - Use Jinja to convert `due.datetime` into local time and assign to time buckets; if no time, default to `anytime`.

3. **Add helper entities for UI state**
3. **Define completion script**
   - Implement `script.todoist_complete_task` to call `todo.update_item` (status `completed`) or `todoist.close_task` using the Todoist integration, then refresh the coordinator (e.g., `homeassistant.update_entity` on relevant sensor).
   - Include logic to evaluate if all open tasks for that profile are complete (`sensor.<profile>_chores` state drops to `0`); when true, call celebration script.
4. **Define completion script**
4. **Create celebration script**
   - Include logic to evaluate if the associated `*_chore_segments` sensor reports `total_open == 0`; when true, call celebration script.

5. **Create celebration script**
   - Add `script.todoist_confetti` that selects a random emoji string (use `choice` Jinja) and triggers `browser_mod.command` or notification blueprint to display confetti animation.
5. **Install required custom cards via HACS**

## Frontend Setup
6. **Define theme tokens**
   - Ensure the following are installed and added as Lovelace resources: `bubble-card`, `button-card`, `auto-entities`, `layout-card`, `card-mod` (likely already), optional `browser_mod` frontend module.

7. **Define theme tokens**
   - Update theme or `lovelace` resource to include CSS variables for chore colors and paddings:
7. **Create button-card templates**
     - Set card radii (24 px column/16 px task) and shared font sizes.

8. **Create button-card templates**
   - Define templates in `ui-lovelace.yaml` (or Dashboard edit → Raw config):
     - `chore_column` (handles background, padding, header layout).
     - `chore_task` (displays emoji, summary, due label, checkbox icon with tap action to completion script).
8. **Assemble dashboard layout**

9. **Assemble dashboard layout**
   - Modify `dashboard-test/chores` view (or create new view) using `custom:grid-layout` to enforce four columns (desktop), two columns (tablet), one column (mobile).
   - Add top-level filter chips (mushroom or bubble-card) bound to `input_select.chore_time_filter` and `input_boolean.chore_show_completed`.
     2. Section stacks for selected time buckets populated via auto-entities referencing `sensor.<profile>_chores` and applying Jinja/JS filters inside the card to render only tasks matching the active time bucket.
     1. Header row (avatar chip, progress pill, star counter).
9. **Implement task popups**

10. **Implement task popups**
10. **Add floating action button**

11. **Add floating action button**
11. **Hook up confetti overlay**

12. **Hook up confetti overlay**
    - Integrate celebration script with front-end by adding `browser_mod` animation resource or custom JS snippet to display random emoji/confetti when triggered.
12. **Functional testing**
## Validation
13. **Functional testing**
    - Reload template entities and scripts; verify sensors populate segmentation data.
    - Open dashboard, ensure columns render with pastel styling and counts match Todoist app.
    - Verify filter chips adjust visible tasks according to time bucket.
13. **Responsive testing**

14. **Responsive testing**
14. **Document usage**

15. **Document usage**
    - Update project docs (e.g., add section in `docs/skylight_chore_requirements.md`) with instructions for maintaining template sensors, scripts, and dash resources.
