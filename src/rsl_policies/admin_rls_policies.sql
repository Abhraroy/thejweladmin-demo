-- Row Level Security (RLS) Policies for admin_key table
-- Execute these in Supabase SQL Editor to secure the admin_key table

-- Enable RLS on admin_key table
ALTER TABLE public.admin_key ENABLE ROW LEVEL SECURITY;

-- Policy 1: Only authenticated users can read their own admin key records
-- This allows the login system to verify admin keys
CREATE POLICY "Users can read their own admin key" ON public.admin_key
    FOR SELECT
    USING (auth.uid() = admin);

-- Policy 2: Only service role can insert admin keys (during seeding)
-- This prevents regular users from creating admin keys
CREATE POLICY "Service role can insert admin keys" ON public.admin_key
    FOR INSERT
    WITH CHECK (auth.role() = 'service_role');

-- Policy 3: No one can update admin keys (immutable after creation)
-- Admin keys should never be updated for security
CREATE POLICY "No updates allowed on admin keys" ON public.admin_key
    FOR UPDATE
    USING (false);

-- Policy 4: No one can delete admin keys
-- Admin keys should be permanent for security
CREATE POLICY "No deletions allowed on admin keys" ON public.admin_key
    FOR DELETE
    USING (false);

-- Optional: Policy to allow admins to view all admin keys (for admin management)
-- Uncomment if you need admin-to-admin key management features
-- CREATE POLICY "Admins can read all admin keys" ON public.admin_key
--     FOR SELECT
--     USING (
--         EXISTS (
--             SELECT 1 FROM auth.users
--             WHERE auth.users.id = auth.uid()
--             AND auth.users.raw_user_meta_data->>'TYPE' = 'ADMIN'
--         )
--     );

-- Security Notes:
-- 1. Only the authenticated admin can read their own key during login verification
-- 2. Only the service role (used in seed_admin.js) can create admin keys
-- 3. Admin keys are immutable and cannot be updated or deleted
-- 4. The hashed key is stored, never the plain text key
-- 5. The key verification happens server-side only, never client-side
-- 6. Failed login attempts are logged but don't reveal sensitive information
