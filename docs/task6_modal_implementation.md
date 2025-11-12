# Task 6: Modal Flows Implementation

## Overview
This implementation completes Task 6 from the chore UI parity task list by creating add/edit/delete modals that reproduce Skylight layouts with proper styling and functionality.

## Modal Components

### 1. Add Task Modal (`chore_add_task_modal`)
- **Trigger**: Floating Action Button (FAB) at bottom-right
- **Features**:
  - Task name input field
  - Profile selection (Nas, Simona, Hari) with visual buttons
  - Time slot selection (Morning, Afternoon, Evening, Anytime)
  - Optional description textarea
  - Cancel and Create Task buttons
- **Styling**: Skylight-matched gradients, spacing, and button styles
- **Action**: Calls `script.add_chore_router` with selected parameters

### 2. Edit Task Modal (`chore_edit_task_modal`)
- **Trigger**: Long-press/hold on any task card
- **Features**:
  - Pre-populated task name and description fields
  - Status toggle (Complete/Incomplete) with visual feedback
  - Save Changes, Cancel, and Delete buttons
  - Profile-aware accent color theming
- **Styling**: Profile-specific accent colors with Skylight button styles
- **Actions**: 
  - Save: `script.update_chore_router`
  - Delete: `script.delete_chore_router` (with confirmation)

### 3. Enhanced Task Interaction
- **Tap Action**: Quick complete/uncomplete toggle via `script.todoist_complete_task`
- **Hold Action**: Opens edit modal with full task details
- **Visual States**: Completed tasks show muted palette, overdue tasks show red accent

## Scripts Integration

### Add Chore Router (`add_chore_router`)
- Routes task creation to appropriate Todoist project based on profile
- Handles time slot to due date conversion:
  - Morning → 9am today
  - Afternoon → 2pm today  
  - Evening → 7pm today
  - Anytime → today (no specific time)

### Update Chore Router (`update_chore_router`)
- Updates task content and description
- Handles completion status changes
- Maintains task ID consistency

### Delete Chore Router (`delete_chore_router`)
- Safely removes tasks from Todoist
- Includes confirmation dialog

### Toggle Completion (`todoist_complete_task`)
- Intelligent toggle based on current task state
- Preserves existing functionality while adding modal support

## Skylight Design Parity

### Visual Elements
- **Header Icons**: Profile-themed gradients with proper shadows
- **Input Fields**: Rounded corners, focus states, proper spacing
- **Button Styles**: 
  - Primary: Gradient backgrounds with shadows
  - Secondary: Light backgrounds with borders
  - Destructive: Red accents for delete actions
- **Segmented Controls**: Grid layouts for profile and time selection
- **Typography**: Consistent with Skylight font weights and sizing

### Interactions
- **Hover States**: Subtle shadow and scale transitions
- **Focus States**: Accent color borders on form inputs
- **Selection States**: Visual feedback for selected options
- **Animations**: Smooth transitions matching Skylight behavior

## Browser Mod Integration
- Uses `browser_mod.popup` for modal presentation
- Proper cleanup and state management
- Responsive modal sizing with max-width constraints
- Backdrop dismissal support

## Required Dependencies
1. **Browser Mod**: For popup modal functionality
2. **Todoist Integration**: For task CRUD operations
3. **Input Helpers**: Time filter and modal state management
4. **Button Card**: For modal template rendering

## File Structure
```
Dashboards/chores/
├── cards/
│   ├── profiles_family.yaml     # Updated with FAB and modal triggers
│   └── templates.yaml           # Added modal templates
├── scripts.yaml                 # New: Task management scripts
└── helpers.yaml                 # Existing: Input helpers for filters
```

## Implementation Notes
- Modal content uses inline JavaScript for interactivity
- Profile selection updates visual states dynamically
- Form validation prevents incomplete submissions
- Error handling with user-friendly alerts
- Maintains existing tap-to-complete functionality

## Testing Checklist
- [ ] FAB opens add task modal
- [ ] Add modal creates tasks for correct profiles
- [ ] Hold action opens edit modal with correct data
- [ ] Edit modal saves changes properly
- [ ] Delete confirmation prevents accidental deletions
- [ ] Quick tap still toggles completion status
- [ ] Modal styling matches Skylight reference
- [ ] All form validations work correctly
- [ ] Browser Mod popups display and close properly

This implementation brings the chore dashboard to full Skylight parity with professional modal flows and complete task management functionality.