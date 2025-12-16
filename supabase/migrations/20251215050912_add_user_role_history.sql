-- ============================================================================
-- USER ROLE HISTORY (Audit trail for role assignments)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.user_role_history (
    history_id SERIAL PRIMARY KEY,
    user_role_id INTEGER NOT NULL REFERENCES public.user_roles(user_role_id),
    action VARCHAR(30) NOT NULL,  -- 'assigned', 'revoked', 'updated'
    old_values JSONB,
    new_values JSONB,
    performed_by UUID NOT NULL REFERENCES public.profiles(id),
    performed_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_user_role_history_assignment ON user_role_history(user_role_id);
CREATE INDEX idx_user_role_history_performed_at ON user_role_history(performed_at DESC);
