# Skylight Chore UI Visual Requirements

This brief captures the critical presentation details from the latest Skylight reference captures (see `docs/Skylight`). It augments the broader product brief in `docs/skylight_chore_requirements.md` with pixel-level expectations for the Home Assistant add-on.

## Layout & Sizing
- The dashboard is framed by generous breathing room: 32 px padding on desktop, collapsing to 24 px on tablets and 16 px on mobile.
- Filter chips for **Chores**, **Morning**, **Afternoon**, **Evening** sit on a single horizontal row, left-aligned, with pill shapes (24 px height, 16 px horizontal padding) and subtle drop shadows.
- Four profile columns render side by side on wide screens, two-up on medium breakpoints and single-column on narrow viewports. Each column is 304 px wide on desktop, expanding fluidly with available width.

## Column Styling
- Columns use rounded rectangles (24 px radius) with soft pastel vertical gradients unique to each profile (e.g., peach for Nas, lavender for Simona). A translucent white border (1 px) outlines the card.
- Header stack:
  - Avatar circle (48 px) showing initials on matching accent colour.
  - Name in a friendly sans-serif (Skylight uses a Quicksand-style typeface) at 20–22 px with 600 weight.
  - Progress/stars pill row beneath: `✓ completed/total` capsule followed by a ⭐ counter capsule, both on white translucent backgrounds.
- Section dividers for **CHORES**, **MORNING**, etc. use uppercase micro text (10 px) with 2 px letter spacing. A fine rule (1 px) extends to the right to reinforce the separation.
- When all chores are complete, a celebratory emoji (🎉) appears in the header; otherwise this slot stays empty.

## Task Card Treatment
- Task cards inherit the column palette but lighten further (16 px radius, 1 px border, faint pastel drop shadow).
- Completion affordance: left-aligned circular checkbox (40 px) with coloured border. Tapping the circle marks completion with a quick scale animation.
- Text stack inside each card:
  - Title/emojis at 16–18 px, bold weight.
  - Subtitle line for due information (e.g., `Due Sun, Oct 19`) in 14 px muted tone.
  - Overdue helper text in red (`17 days late`) directly beneath the due line.
  - Optional description at 14 px gray.
- Recurring chores show a "REPEATS" pill in a warm gold accent at the top right of the card.

## Add Button & Empty State
- Each column ends with a frosted glass input bar: rounded pill (full width) housing the placeholder text "Add a new chore" and a circular + button (36 px) in the profile accent colour.
- If no incomplete tasks exist in a filtered segment, display a bordered empty state card reading "All done!" with matching accent colour text.

## Typography & Colour Tokens
- Base font: Quicksand or similar rounded sans-serif. Body copy uses a neutral grey (#475569). Background of the board washes from #F8FAFC to #E2E8F0.
- Accent palettes gathered from captures:
  - Nas: Rose (#FBCFE8 → #F9A8D4, accent #EC4899).
  - Simona: Purple (#E9D5FF → #C4B5FD, accent #8B5CF6).
  - Hari: Sky (#BAE6FD → #7DD3FC, accent #0EA5E9).
  - Anyone: Mint (#BBF7D0 → #6EE7B7, accent #10B981).

## Interaction Notes
- Segment filters behave as toggles; at least one segment remains active at all times.
- Completion calls the Todoist `todo.update_item` service and immediately reflects in counts and card removal.
- Confetti animation (via Browser Mod or similar) should trigger when progress shows `✓ total/total` for a column.

Use this checklist when iterating on the React styling so the add-on mirrors the Skylight visual language precisely.
