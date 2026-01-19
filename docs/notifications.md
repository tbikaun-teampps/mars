# In-app notification system

This document describes the in-app notification system architecture and how to extend it with new notification types.

---

## Overview

MARS includes a polling-based in-app notification system that alerts users about:
- **Review status changes** - when a review they're involved in changes status
- **New comments** - when someone comments on a review they're involved in
- **Review assignments** - (future) when assigned to review a material

Users can configure per-event-type preferences to enable/disable specific notification types.

---

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Frontend      │     │   Backend       │     │   Database      │
│   Components    │◀───▶│   Services      │◀───▶│   Tables        │
├─────────────────┤     ├─────────────────┤     ├─────────────────┤
│ NotificationBell│     │ NotificationSvc │     │ notifications   │
│ NotificationPrefs│    │ (create/query)  │     │ profiles.notif_ │
│ useUnreadCount  │     │                 │     │   preferences   │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

### Delivery mechanism

The frontend polls the `/api/notifications/unread-count` endpoint every 30 seconds to update the notification badge. Full notification lists are fetched on-demand when the user opens the dropdown.

---

## Database schema

### notifications table

```sql
CREATE TABLE public.notifications (
    notification_id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.profiles(id),
    notification_type notification_type NOT NULL,
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    review_id INTEGER REFERENCES public.material_reviews(review_id),
    material_number INTEGER REFERENCES public.sap_material_data(material_number),
    comment_id INTEGER REFERENCES public.review_comments(comment_id),
    triggered_by UUID REFERENCES public.profiles(id),
    is_read BOOLEAN DEFAULT false,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);
```

### notification_type enum

```sql
CREATE TYPE notification_type AS ENUM (
    'review_assigned',
    'review_status_changed',
    'comment_added'
);
```

### User preferences

Stored in `profiles.notification_preferences` as a JSON field:

```json
{
  "review_assigned": true,
  "review_status_changed": true,
  "comment_added": false
}
```

---

## Backend components

### NotificationService

Location: `backend/app/services/notification_service.py`

Key methods:

| Method | Purpose |
|--------|---------|
| `get_user_preferences(user_id)` | Get user's notification preferences |
| `should_notify(user_id, type)` | Check if user wants this notification type |
| `create_notification(...)` | Create notification if preferences allow |
| `notify_status_change(review, old, new, by)` | Notify involved users of status change |
| `notify_comment_added(review, comment, by)` | Notify involved users of new comment |
| `_get_involved_users(review)` | Get initiator + decider + all commenters |

### API endpoints

Location: `backend/app/api/notifications.py`

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/notifications` | GET | Paginated notification list |
| `/notifications/unread-count` | GET | Badge count (polled every 30s) |
| `/notifications/{id}/read` | PUT | Mark single notification as read |
| `/notifications/mark-all-read` | PUT | Mark all as read |
| `/notifications/preferences` | GET | Get user preferences |
| `/notifications/preferences` | PUT | Update preferences |

---

## Frontend components

### NotificationBell

Location: `client/src/components/notification-bell.tsx`

- Displays bell icon with unread count badge
- Dropdown shows recent notifications (click to mark as read)
- "Mark all read" button
- Notifications link to the relevant material detail page

### NotificationPreferences

Location: `client/src/pages/AccountPage.tsx` (integrated into Account page)

- Toggle switches for each notification type
- Located in the Account page under "Notification Preferences" card

### React Query hooks

Location: `client/src/api/queries.ts`

| Hook | Purpose |
|------|---------|
| `useUnreadNotificationCount()` | Polls every 30s for badge count |
| `useNotifications(params)` | Fetch paginated notification list |
| `useMarkNotificationRead()` | Mutation to mark single as read |
| `useMarkAllNotificationsRead()` | Mutation to mark all as read |
| `useNotificationPreferences()` | Get current preferences |
| `useUpdateNotificationPreferences()` | Update preferences |

---

## Adding a new notification type

### Step 1: Update database enum

Create a new migration:

```sql
ALTER TYPE notification_type ADD VALUE 'your_new_type';
```

### Step 2: Update backend models

In `backend/app/models/notification.py`:

```python
class NotificationType(str, Enum):
    REVIEW_ASSIGNED = "review_assigned"
    REVIEW_STATUS_CHANGED = "review_status_changed"
    COMMENT_ADDED = "comment_added"
    YOUR_NEW_TYPE = "your_new_type"  # Add this
```

### Step 3: Update preferences models

In `backend/app/models/notification.py`:

```python
class NotificationPreferences(BaseModel):
    review_assigned: bool = True
    review_status_changed: bool = True
    comment_added: bool = True
    your_new_type: bool = True  # Add this

class NotificationPreferencesUpdate(BaseModel):
    review_assigned: Optional[bool] = None
    review_status_changed: Optional[bool] = None
    comment_added: Optional[bool] = None
    your_new_type: Optional[bool] = None  # Add this
```

### Step 4: Add notification method to service

In `backend/app/services/notification_service.py`:

```python
async def notify_your_new_event(
    self,
    # ... relevant parameters
) -> Optional[NotificationDB]:
    """Notify users about your new event."""
    title = "Your notification title"
    message = "Your notification message"

    return await self.create_notification(
        user_id=target_user_id,
        notification_type=NotificationType.YOUR_NEW_TYPE,
        title=title,
        message=message,
        review_id=review_id,  # if applicable
        material_number=material_number,  # if applicable
        triggered_by=triggering_user_id,
    )
```

### Step 5: Trigger the notification

In the relevant API endpoint (e.g., `backend/app/api/your_endpoint.py`):

```python
from app.services.notification_service import NotificationService

# After the relevant action completes:
notification_service = NotificationService(db)
await notification_service.notify_your_new_event(...)
```

### Step 6: Update frontend preferences UI

In `client/src/pages/AccountPage.tsx`, add the new type to the `NOTIFICATION_TYPES` array:

```tsx
const NOTIFICATION_TYPES = [
  // ... existing types
  {
    key: "your_new_type" as const,
    label: "Your New Event",
    description: "Get notified when your new event happens",
  },
];
```

Also update the `handleNotificationToggle` function type to include the new key.

### Step 7: Regenerate types

```bash
npm run generate:types
npm run typecheck
```

---

## Message templates

Current notification messages follow this pattern:

| Type | Title | Message |
|------|-------|---------|
| `review_assigned` | "Review assigned: Material {n}" | "You have been assigned to review material {n}." |
| `review_status_changed` | "Status changed: Material {n}" | "Review status changed from '{old}' to '{new}'." |
| `comment_added` | "New comment: Material {n}" | "A new comment was added to the review for material {n}." |

---

## User targeting

The `_get_involved_users()` method determines who receives notifications for a review:

1. **Review initiator** - the user who created the review
2. **Review decider** - the user who made the final decision (if different)
3. **All commenters** - users who have commented on the review

**Important**: Users are never notified about their own actions (checked in `create_notification()`).

---

## Future enhancements

- **Email delivery**: Add an email channel alongside in-app notifications
- **Real-time delivery**: Replace polling with Supabase Realtime or WebSockets
- **Notification grouping**: Batch similar notifications (e.g., "5 new comments on Material X")
- **Review assignment notifications**: Trigger when `assigned_to` field is implemented
