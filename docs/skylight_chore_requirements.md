# Skylight Calendar Chore Experience — Research Brief

## Research Log
- [How to Manage Chores and Family Tasks with Skylight Calendar](https://myskylight.com/how-to-manage-chores-and-family-tasks-with-skylight-calendar/) — official blog post detailing setup, profiles, routines, rewards, emoji feedback, and best practices for chore workflows.
- [How can I set up Chore Chart on my Skylight Calendar?](https://skylight.zendesk.com/hc/en-us/articles/8139191033627-How-can-I-set-up-Chore-Chart-on-my-Skylight-Calendar) — support article with step-by-step creation, editing, deletion, and repeat scheduling for chores.
- [Using the Tasks Tab: Routines and Chores](https://skylight.zendesk.com/hc/en-us/articles/36846381293979-Using-the-Tasks-Tab-Routines-and-Chores) — deep dive into task views, time-of-day filtering, profile organization, completion flows, and mobile app parity.
- [Skylight Calendar — Smart Digital Family Calendar](https://skylightcalendars.com/) — marketing site summarizing connected calendar sync, lists, meal planner, notifications, and hardware form factors.
- [Skylight Calendar — Keeping Our Sports-Filled Family On Track](https://workingsavvymom.com/2025/01/24/skylight-calendar-keeping-our-sports-filled-family-on-track/) — user review highlighting real-world use of chore stars, rewards, grocery voice input, photo frame mode, and pain points.
- [Skylight 15-inch Touchscreen Wall Calendar & Chore Chart Review](https://theinsidereview.com/03_appliances/skylight-15-inch-touchscreen-wall-calendar-chore-chart-review-pros-cons-rumors-debunked/) — aggregated sentiment report covering strengths, recurring subscription concerns, and reliability feedback.
- [Skylight | Chore Chart](https://myskylight.com/lp/chore-chart/) and [Skylight | Rewards](https://myskylight.com/lp/rewards/) — feature landing pages outlining habit building, recurring chores, mobile updates, and star-powered motivation.
- [Using the Rewards Tab](https://skylight.zendesk.com/hc/en-us/articles/36846860676123-Using-the-Rewards-Tab) — support article describing Calendar Plus gating, reward creation, redemption, and app/device responsibilities.

## Product Overview
Skylight Calendar bundles a wall-mounted touchscreen with a companion mobile app to centralise family scheduling, chore tracking, routines, meal planning, and shared lists. The "Chore Chart" lives inside the Tasks tab and is visually column-based by profile. Families create personal profiles with colours/emojis, assign chores and routines, and manage completion from the device or app. Optional "Calendar Plus" subscription layers gamified rewards, photo screensavers, Magic Import, and other premium capabilities. The goal is a frictionless, highly visible workflow that keeps every household member aligned without manual reminders.

## Current Home Assistant Baseline
- **Calendar parity:** Dashboard at `http://192.168.1.251:8123/dashboard-test/1` already implements the calendar experience; new work should avoid regressing existing calendar widgets.
- **Chore data source:** Each family member owns a dedicated Todoist project surfaced through the custom integration. The four chore sensors exposed today are `sensor.nas_chores`, `sensor.simona_chores`, `sensor.hari_chores`, and `sensor.anyone_chores`.
- **Assignment model:** Todoist limits assignee identifiers per account. Adding a new chore profile requires provisioning a standalone Todoist account so the integration can map a unique `assignee_id`; treat this as a costly operation and design UI to work with the existing four profiles by default.
- **Lists roadmap:** Shopping/todo lists will eventually consume AnyList data; keep architecture modular so chores board can coexist with future list widgets without data coupling.

## Personas & Access Patterns
- **Parents/Caregivers (Admins):** Configure profiles, import calendars, create chores/routines, assign star values, review progress, redeem rewards, and manage premium features.
- **Kids/Dependents (Assignees):** View their column, mark chores complete, earn emoji confetti, track progress toward rewards, and optionally redeem stars.
- **Mobile App Users:** Mirror device capabilities on the go, add tasks, give/take stars, manage rewards, update lists, and receive notifications.
- **Multi-device Households:** Optionally use multiple Skylight displays that stay in sync via cloud services and companion apps.

## Core Chore & Routine Features
- **Profiles & Colour Coding**
  - Named profiles per person; each has a color and optional emoji to make assignments visible and child-friendly.
  - Supports "Household" or shared profiles for up-for-grabs chores.
  - Profiles show as column headers in Tasks view alongside completion counts (e.g., "Nas (1/3)").

- **Task Types**
  - Two types: **Chores** (individual tasks, optionally scheduled) and **Routines** (habit-forming sequences anchored to time-of-day buckets).
  - Tasks created via "Add" (+) button on device or mobile app. Emojis can replace text for pre-readers.

- **Scheduling & Repeats**
  - Chores may include optional due date, due time, repeat cadence (daily/weekly/monthly/custom), and "repeat until" end date.
  - Routines repeat daily or weekly and must be tagged with Morning, Afternoon, and/or Evening segments; device auto-filters routines based on current time-of-day (Midnight–Noon, Noon–6pm, 6pm–Midnight).
  - Multi-profile assignment duplicates chores per assignee; all derived instances track separately.

- **Task Management**
  - Tasks list shows unfinished items organised by profile with progress meter icons summarising completion counts.
  - Tapping a task opens detail modal to edit, mark complete/incomplete, or delete single occurrence/future/all instances.
  - Bulk filtering toggles (Chores, Morning, Afternoon, Evening) show/hide categories to keep the interface focused.
  - Emoji confetti animation triggers when a profile finishes every chore in their list; fosters positive reinforcement.

- **Completion Flow**
  - Tap white circle to mark complete; checkmark toggles to revert.
  - Completed tasks disappear or move to completed state (exact behavior depends on filter context) while counters update.
  - Mobile app mirrors completion controls; supports offline check-ins that sync once connected.

## Rewards & Gamification (Calendar Plus)
- **Star Economy**
  - Calendar Plus subscribers can assign numeric star values to chores/routines via mobile app; not configurable from device.
  - Stars accumulate per profile when tasks marked complete; can be manually adjusted (give/take) in app.

- **Rewards Catalog**
  - Parents create rewards with title, optional description, emoji icon, star cost, assigned profiles, and auto-renew flag.
  - Device shows progress bars on reward cards and exposes "Redeem" button when star threshold met.
  - Redeeming subtracts stars and optionally renews reward for repeated use.

- **Motivational UX**
  - Marketing emphasises "emoji explosions" and celebratory feedback to reinforce habit building.
  - Rewards page highlights adaptability for all ages and ability to track milestones centrally.

## Supporting Modules Around Chores
- **Calendar Sync**
  - Auto-sync with Google, iCloud, Outlook, Yahoo, Cozi, etc.; colour-coded events mirror per profile calendars.
  - Multiple Skylight devices stay synced in real time.
  - Magic Import (Plus) ingests emailed events/screenshots.

- **Lists & Grocery Management**
  - Shared lists for groceries, packing, to-do; reorder, color code, voice add (via app) according to user review.

- **Meal Planner**
  - Dedicated dinner planner view on main calendar; weekly meal transparency reduces "what's for dinner" friction.

- **Notifications**
  - Optional mobile notifications for upcoming appointments, chore due dates, meal plans; configurable per user.

- **Photo Frame & Sleep Mode**
  - Calendar Plus unlocks photo slideshow on idle state; sleep mode schedules backlight dimming/off hours.

## Hardware & UX Considerations
- Touch-first interface with large tap targets sized for children.
- Available in 10", 15", 27"; mounts or stands for central household placement.
- Designed as always-on central hub in high-traffic area; emphasises glanceability and quick interactions.
- Confetti animations and bright colour palette drive engagement; request for dark mode noted in reviews.

## Reference UI Details (from screenshots)
- **Column palette:** Each profile column uses a soft pastel background (e.g., peach, lavender, mint, sky blue) with a matching darker accent for text chips. Columns sit on a light neutral canvas and include rounded corners (~24 px radius) to separate them visually.
- **Profile header:** Circular avatars with initials anchored at top left, flanked by progress capsule (✓ and fraction), optional star counter, and icon buttons for Morning/Afternoon/Evening/Chores. Icons reside inside outlined circles with subtle drop shadows.
- **Task cards:** Rounded rectangles (~16 px radius) with light tonal fill and thin border. Each card contains task title, frequency text, optional emoji, and a circular checkbox on the right. Overdue items show red helper text (e.g., "5 hours late") beneath the title.
- **Lists & toggles:** Filter and Today controls appear as pill-shaped chips with chevron arrows. The "hide completed" control uses an eye icon with label. A floating action button (FAB) in the bottom right uses a blue circular button with "＋" icon.
- **Iconography:** Morning/Afternoon/Evening icons use simple line art (sun, moon, broom). Rewards and stars appear next to the progress capsule. Emojis embedded in task titles (toothbrush, dog, etc.) reinforce context for kids.
- **Spacing:** Columns maintain consistent width with generous gutter between cards, providing breathing room. Headers include stacked sections for Morning/Evening/Chores separators, each with section titles in uppercase and thin dividers.

## Pain Points & Constraints Identified
- Pricing & Subscription: Users cite hardware cost and recurring Calendar Plus fee as primary friction. Some features (rewards, photo slideshow, Magic Import) locked behind paywall.
- Sync Reliability: Occasional calendar sync hiccups (esp. Yahoo/Cozi) and app stability issues reported; expect need for robust error handling and diagnostics.
- Feature Requests: Dark mode, strike-through of completed days, richer app UI surfaces appear in feedback.

## Functional Requirements for Skylight-Style Chore Clone
1. **Profiles & Access**
   - CRUD for user profiles with name, colour, optional emoji/icon, assignment permissions.
   - Support shared/household pseudo-profile.

2. **Chore Creation**
   - Add chores with title (emoji optional), description, assignees (one-to-many), due date/time (optional), repeat rules (daily/weekly/monthly/custom), and start/end boundaries.
   - For multi-assignee chores, instantiate discrete assignments per profile with shared metadata.
   - Provide quick-add templates and mobile parity.

3. **Routine Creation**
   - Distinguish routine type with forced Morning/Afternoon/Evening tags and daily/weekly cadence selection.
   - Auto-hide routines outside relevant time window; allow manual toggles to reveal suppressed segments.

4. **Task Board UI**
   - Columnar layout grouped by profile with progress counters (completed/total) and tap-to-complete controls.
   - Filter chips for Chores vs Morning/Afternoon/Evening segments.
   - Responsive design for wall display + tablet; ensure accessible font sizes and high contrast.
   - Provide celebratory animation when column reaches zero remaining chores.

5. **Detail & Editing**
   - Task detail modal with ability to edit fields, convert chore↔routine, delete single/future/all occurrences, and mark complete/incomplete.
   - Activity logging for audit/history (optional but valuable for accountability).

6. **Rewards System (Optional Tier)**
   - Configurable star values per task; stored per profile.
   - Rewards catalog with star cost, emoji, description, auto-renew toggle.
   - Redemption workflow subtracts stars, persists history, and optionally notifies parents.
   - Admin override to add/remove stars manually.

7. **Notifications & Reminders**
   - Scheduled push/HA notifications for chore due reminders, overdue tasks, reward availability.
   - Digest summarising remaining chores per profile.

8. **Integration & Sync**
   - Link with external calendars (Google/iCloud/Outlook) to avoid double entry where relevant.
   - Mirror state to mobile clients; real-time updates via websockets or HA events.
   - Expose API/service endpoints for automations (Home Assistant events when task status changes, so dashboards & voice assistants stay in sync).

9. **Lists & Meal Planning (for parity)**
   - Provide list management with categories (grocery, packing, etc.) and voice/quick entry support.
   - Weekly meal planner dashboard tile to complement chores, optionally linking tasks (e.g., "Set Table" tied to dinner plan).

10. **Permissions & Roles**
    - Distinguish adult vs child capabilities (e.g., child can mark complete but not delete tasks/rewards).
    - Parental controls for editing rewards/star balances.

11. **Visual Feedback & Accessibility**
    - Emoji support for task names, reward cards, and completion confetti.
    - Provide alt text/descriptions for accessibility; ensure animations can be disabled.

12. **Offline/Sync Resilience**
    - Cache locally, queue updates when offline, and reconcile on reconnect (addressing review complaints about sync hiccups).

## Non-Functional Considerations
- **Reliability:** Expect consistent uptime; design for graceful degradation when third-party calendar sync fails.
- **Performance:** Instant tap feedback on wall display; background refresh for heavy queries (lists, calendars).
- **Security & Privacy:** Profiles may represent minors; secure auth, limit data exposure, respect household boundaries.
- **Scalability:** Handle multiple devices and mobile clients updating concurrently.
- **Extensibility:** Architect tasks module to support future add-ons (allowances, chore streaks, AI suggestions).

## Open Questions / Further Research
- **Resolved:** Completion celebration uses randomised emoji/confetti bursts once a profile column is fully complete.
- **Resolved:** Overdue chores roll forward while retaining prior-day context; UI labels remaining items with red "late" text until completed.
- **Deferred:** Calendar Plus deep-dive not required for initial scope; treat premium add-ons as future enhancement backlog.
- **Direction:** Voice input should eventually support cross-device capture (Google Nest, Alexa, other assistants), though immediate focus remains on core UI.
- **Outstanding:** Investigate accessibility features (screen reader support, high contrast mode) to ensure parity.

This brief should guide requirement scoping for a Home Assistant dashboard and backend that emulate Skylight Calendar’s chore ecosystem while integrating with existing Todoist/Home Assistant infrastructure.
