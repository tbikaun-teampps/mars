-- ============================================================================
-- NOTIFICATION TYPES ENUM
-- ============================================================================

CREATE TYPE notification_type AS ENUM (
    'review_assigned',
    'review_status_changed',
    'comment_added'
);

-- ============================================================================
-- NOTIFICATIONS TABLE
-- ============================================================================

CREATE TABLE public.notifications (
    notification_id SERIAL PRIMARY KEY,

    -- Recipient
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

    -- Notification metadata
    notification_type notification_type NOT NULL,
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,

    -- Related entities (nullable, depends on notification type)
    review_id INTEGER REFERENCES public.material_reviews(review_id) ON DELETE CASCADE,
    material_number INTEGER REFERENCES public.sap_material_data(material_number) ON DELETE SET NULL,
    comment_id INTEGER REFERENCES public.review_comments(comment_id) ON DELETE SET NULL,

    -- Actor who triggered the notification (optional)
    triggered_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,

    -- Status
    is_read BOOLEAN DEFAULT false,
    read_at TIMESTAMPTZ,

    -- Audit
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Index for fetching unread notifications (most common query pattern)
CREATE INDEX idx_notifications_user_unread
    ON notifications(user_id, created_at DESC)
    WHERE is_read = false;

-- Index for fetching all notifications for a user
CREATE INDEX idx_notifications_user_all
    ON notifications(user_id, created_at DESC);

-- Index for cascade deletes when a review is deleted
CREATE INDEX idx_notifications_review
    ON notifications(review_id);
