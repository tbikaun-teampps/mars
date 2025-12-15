-- ============================================================================
-- ROLES & PERMISSIONS
-- ============================================================================

CREATE TABLE public.roles (
    role_id SERIAL PRIMARY KEY,
    role_code VARCHAR(50) NOT NULL UNIQUE,      -- 'inventory_controller', 'sme_mechanical', etc.
    role_name VARCHAR(100) NOT NULL,            -- 'Inventory Controller'
    role_type VARCHAR(30) NOT NULL,             -- 'workflow', 'sme', 'approval', 'admin'
    description TEXT,
    
    -- Permission flags
    can_create_reviews BOOLEAN DEFAULT false,
    can_edit_reviews BOOLEAN DEFAULT false,
    can_delete_reviews BOOLEAN DEFAULT false,
    can_approve_reviews BOOLEAN DEFAULT false,
    can_provide_sme_review BOOLEAN DEFAULT false,
    can_assign_reviews BOOLEAN DEFAULT false,
    can_manage_users BOOLEAN DEFAULT false,
    can_manage_settings BOOLEAN DEFAULT false,
    can_view_all_reviews BOOLEAN DEFAULT false,
    can_export_data BOOLEAN DEFAULT false,
    
    -- Approval authority
    approval_limit NUMERIC,                      -- Max value this role can approve (NULL = unlimited)
    
    -- Audit
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- User-Role assignments (users can have multiple roles)
CREATE TABLE public.user_roles (
    user_role_id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    role_id INTEGER NOT NULL REFERENCES public.roles(role_id),
       
    -- Validity period (for temporary assignments)
    valid_from DATE DEFAULT CURRENT_DATE,
    valid_to DATE,                              -- NULL = indefinite
    
    -- Audit
    assigned_by UUID REFERENCES public.profiles(id),
    assigned_at TIMESTAMPTZ DEFAULT now(),
    revoked_by UUID REFERENCES public.profiles(id),
    revoked_at TIMESTAMPTZ,
    
    is_active BOOLEAN DEFAULT true,
    
    UNIQUE(user_id, role_id)
);

CREATE INDEX idx_user_roles_user ON user_roles(user_id) WHERE is_active = true;
CREATE INDEX idx_user_roles_role ON user_roles(role_id) WHERE is_active = true;

-- ============================================================================
-- SME EXPERTISE (Who can review what types of materials)
-- ============================================================================

CREATE TABLE public.sme_expertise (
    expertise_id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    
    -- What they're expert in (can be multiple criteria)
    sme_type VARCHAR(50) NOT NULL,              -- From lookup_options: 'sme_mechanical', 'sme_electrical'
    material_group VARCHAR(50),                 -- Specific mat_group they cover (NULL = all)
    plant VARCHAR(50),                          -- Specific plant (NULL = all)
    
    -- Capacity management
    max_concurrent_reviews INTEGER DEFAULT 10,
    current_review_count INTEGER DEFAULT 0,     -- Denormalized for performance
    
    -- Availability
    is_available BOOLEAN DEFAULT true,
    unavailable_until DATE,
    unavailable_reason VARCHAR(200),
    
    -- Backup SME when unavailable
    backup_user_id UUID REFERENCES public.profiles(id),
    
    -- Audit
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    
    UNIQUE(user_id, sme_type, material_group, plant)
);

CREATE INDEX idx_sme_expertise_type ON sme_expertise(sme_type) WHERE is_available = true;
CREATE INDEX idx_sme_expertise_material_group ON sme_expertise(material_group) WHERE is_available = true;

-- ============================================================================
-- REVIEW ASSIGNMENTS (Who is assigned to each review in what capacity)
-- ============================================================================

CREATE TABLE public.review_assignments (
    assignment_id SERIAL PRIMARY KEY,
    review_id INTEGER NOT NULL REFERENCES public.material_reviews(review_id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id),
    
    -- Assignment type
    assignment_type VARCHAR(30) NOT NULL,       -- 'owner', 'sme', 'approver', 'watcher'
    
    -- For SME assignments
    sme_type VARCHAR(50),                       -- Which SME discipline
    
    -- For approval assignments
    approval_tier INTEGER,                      -- Which tier (1, 2, 3, etc.)
    approval_sequence INTEGER,                  -- Order in approval chain (for sequential approvals)
    
    -- Status
    status VARCHAR(30) NOT NULL DEFAULT 'pending',  -- 'pending', 'accepted', 'declined', 'completed', 'reassigned'
    
    -- SLA tracking
    assigned_at TIMESTAMPTZ DEFAULT now(),
    due_at TIMESTAMPTZ,
    accepted_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    
    -- Response
    response_notes TEXT,
    
    -- Reassignment tracking
    reassigned_from_user_id UUID REFERENCES public.profiles(id),
    reassigned_reason TEXT,
    
    -- Audit
    assigned_by UUID NOT NULL REFERENCES public.profiles(id) DEFAULT auth.uid()
);

CREATE UNIQUE INDEX idx_unique_active_assignment 
ON review_assignments(review_id, assignment_type, COALESCE(approval_tier, 0))
WHERE status NOT IN ('declined', 'reassigned');

CREATE INDEX idx_review_assignments_review ON review_assignments(review_id);
CREATE INDEX idx_review_assignments_user ON review_assignments(user_id, status);
CREATE INDEX idx_review_assignments_pending ON review_assignments(user_id, due_at) WHERE status = 'pending';

-- ============================================================================
-- ASSIGNMENT HISTORY (Full audit trail)
-- ============================================================================

CREATE TABLE public.review_assignment_history (
    history_id SERIAL PRIMARY KEY,
    assignment_id INTEGER NOT NULL REFERENCES public.review_assignments(assignment_id),
    
    action VARCHAR(30) NOT NULL,                -- 'created', 'accepted', 'declined', 'completed', 'reassigned', 'escalated'
    
    from_user_id UUID REFERENCES public.profiles(id),
    to_user_id UUID REFERENCES public.profiles(id),
    
    notes TEXT,
    
    performed_by UUID NOT NULL REFERENCES public.profiles(id) DEFAULT auth.uid(),
    performed_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_assignment_history_assignment ON review_assignment_history(assignment_id);

-- ============================================================================
-- SEED DEFAULT ROLES
-- ============================================================================

INSERT INTO roles (role_code, role_name, role_type, description, 
                   can_create_reviews, can_edit_reviews, can_approve_reviews, 
                   can_provide_sme_review, can_assign_reviews, can_view_all_reviews,
                   can_manage_users, can_manage_settings, approval_limit) VALUES

-- Workflow roles
('inventory_analyst', 'Inventory Analyst', 'workflow', 
 'Creates and manages material reviews',
 true, true, false, false, false, false, false, false, NULL),

('inventory_controller', 'Inventory Controller', 'workflow', 
 'Senior analyst with assignment capability',
 true, true, true, false, true, true, false, false, 5000),

('inventory_manager', 'Inventory Manager', 'approval', 
 'Approves reviews and manages team',
 true, true, true, false, true, true, false, false, 50000),

('supply_chain_manager', 'Supply Chain Manager', 'approval', 
 'Senior approval authority',
 true, true, true, false, true, true, false, false, 500000),

('supply_chain_director', 'Supply Chain Director', 'approval', 
 'Executive approval authority',
 false, false, true, false, true, true, false, true, NULL),

('finance_director', 'Finance Director', 'approval', 
 'Final approval for high-value write-offs',
 false, false, true, false, false, true, false, false, NULL),

-- SME roles (these map to sme_type in lookup_options)
('sme_mechanical', 'SME - Mechanical Engineering', 'sme', 
 'Mechanical engineering subject matter expert',
 false, false, false, true, false, false, false, false, NULL),

('sme_electrical', 'SME - Electrical Engineering', 'sme', 
 'Electrical engineering subject matter expert',
 false, false, false, true, false, false, false, false, NULL),

('sme_reliability', 'SME - Reliability Engineering', 'sme', 
 'Reliability engineering subject matter expert',
 false, false, false, true, false, false, false, false, NULL),

('sme_maintenance_planning', 'SME - Maintenance Planning', 'sme', 
 'Maintenance planning subject matter expert',
 false, false, false, true, false, false, false, false, NULL),

('sme_workshop', 'SME - Workshop / Repairs', 'sme', 
 'Workshop and repairs subject matter expert',
 false, false, false, true, false, false, false, false, NULL),

('sme_procurement', 'SME - Procurement', 'sme', 
 'Procurement and supply chain subject matter expert',
 false, false, false, true, false, false, false, false, NULL),

('sme_safety', 'SME - Safety / HSE', 'sme', 
 'Health, safety and environment subject matter expert',
 false, false, false, true, false, false, false, false, NULL),

-- Admin roles
('system_admin', 'System Administrator', 'admin', 
 'Full system access',
 true, true, true, true, true, true, true, true, NULL),

('user_admin', 'User Administrator', 'admin', 
 'Manages users and roles',
 false, false, false, false, false, true, true, false, NULL);


 -- ============================================================================
-- UPDATE PROFILES TABLE
-- ============================================================================

ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS email VARCHAR(255),
    ADD COLUMN IF NOT EXISTS display_name VARCHAR(100),
    ADD COLUMN IF NOT EXISTS job_title VARCHAR(100),
    ADD COLUMN IF NOT EXISTS department VARCHAR(100),
    ADD COLUMN IF NOT EXISTS site VARCHAR(50),
    ADD COLUMN IF NOT EXISTS phone VARCHAR(50),
    ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
    ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS notification_preferences JSONB DEFAULT '{"email": true, "in_app": true}'::jsonb;