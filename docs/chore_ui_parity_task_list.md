# Chore UI Parity Task List

Goal: replicate the Skylight chore column experience in Home Assistant with matching positioning, relative sizing, colour palette (both active and completed states), hover behaviour, and modal flows as documented in `docs/Skylight/mceclip*.png`.

## Visual Parity Requirements
- Columns use identical widths, padding, and corner radii across profiles; the board respects the gutter spacing shown in the Skylight reference.
- Header blocks include avatar, progress capsule (check icon + fraction), and star counter aligned on a single baseline.
- Section dividers (Morning, Afternoon, Evening, Anytime) display as uppercase labels with thin separators and toggle icons where applicable.
- Task cards render emoji, title, helper text, and checkbox with the same relative font sizes and spacing; completed tasks swap to the muted palette (lighter fill, desaturated text, accent checkbox fill) but retain layout.
- Hover and tap states apply subtle shadow/scale transitions that mirror the Skylight screenshots.
- Modals for view/edit/add/delete inherit the Skylight spacing, typography, and button styles, including icon placement and destructive button colouring.

## Task List
1. **Grid & Column Sizing**
   - Set explicit min/max column widths and gutter spacing in the grid layout so the board matches the reference proportion at common breakpoints (desktop/tablet/mobile).
   - Update card padding and border-radius tokens to match the Skylight measurements; verify against screenshots with overlay testing.
2. **Header Composition**
   - Extend the `chore_header` template to render the progress capsule (✓ icon plus `open/total` count) and star counter bubble on the right side of the header.
   - Ensure avatar, name, counts, and controls share the same vertical alignment and spacing as the reference.
3. **Filter & Section Controls**
   - Rebuild time-of-day chips to match Skylight pill sizes, iconography, and hover/active states; confirm typography weight.
   - Add inline section headers (Morning/Afternoon/Evening/Anytime) inside each column with matching dividers and quick-filter icons.
4. **Task Card Styling**
   - Adjust task card background colours, shadow, and corner radius for both incomplete and completed states to match the pastel/grey reference palette; document the exact hex values pulled from the screenshot sampler.
   - Surface task emojis in the left column, ensure overdue helper text colour and font size match the screenshots, and confirm checkbox sizing/colour for complete vs incomplete tasks.
   - Implement hover/tap interactions (shadow lift, checkbox highlight) consistent with Skylight behaviour.
5. **State Handling**
   - Fix conditional logic so empty-state messaging only appears when the column truly has zero visible tasks.
   - Verify the “completed” toggle respects the Skylight colour swap (e.g., muted text, accent checkbox) while keeping counts accurate.
6. **Modal Flows**
   - Create add/edit/delete modals that reproduce Skylight layouts: header icon, input spacing, segmented controls for time-of-day, and consistent button styling (primary, secondary, destructive) including hover/press states.
   - Wire modals to completion scripts and ensure animations/transitions feel consistent with the device reference.
7. **Hover/Button Assets**
   - Replace generic hover icons with Skylight-matched SVG/MDI icons and ensure focus states comply with accessibility guidelines without deviating from the visual parity.
8. **Validation & QA**
   - Capture comparison screenshots overlaying the HA dashboard atop `docs/Skylight/mceclip*.png` to confirm visual match; include measurements for avatar diameter, card height, checkbox size, and modal button widths.
   - Document any intentional deviations (e.g., HA theme constraints) in `docs/chores_dashboard_plan.md` once tasks are complete.
