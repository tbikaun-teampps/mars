-- ============================================================================
-- ADD ACKNOWLEDGEMENT PERMISSION
-- ============================================================================

-- Add acknowledgement permission column
ALTER TABLE public.roles
    ADD COLUMN IF NOT EXISTS can_manage_acknowledgements BOOLEAN DEFAULT false;

-- Grant permission to appropriate roles (workflow, approval, and admin roles)
UPDATE public.roles
SET can_manage_acknowledgements = true
WHERE role_code IN (
    'inventory_analyst',
    'inventory_controller',
    'inventory_manager',
    'supply_chain_manager',
    'supply_chain_director',
    'system_admin'
);
