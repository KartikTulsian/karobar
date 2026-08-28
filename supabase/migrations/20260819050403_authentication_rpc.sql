-- Allow owners and managers to update their shop's details
CREATE POLICY "Owners and managers can update tenant details" 
ON public.tenants
FOR UPDATE 
USING (
    id IN (
        SELECT tenant_id FROM public.tenant_memberships 
        WHERE user_id = auth.uid() 
          AND role IN ('owner', 'manager') 
          AND is_active = true
    )
)
WITH CHECK (
    id IN (
        SELECT tenant_id FROM public.tenant_memberships 
        WHERE user_id = auth.uid() 
          AND role IN ('owner', 'manager') 
          AND is_active = true
    )
);

-- 1. Allow shop owners/managers to CREATE (Insert) invitations for their shop
CREATE POLICY "Shop managers can create invitations" 
ON public.tenant_invitations
FOR INSERT 
WITH CHECK (
    tenant_id IN (
        SELECT tenant_id FROM public.tenant_memberships 
        WHERE user_id = auth.uid() AND is_active = true
    )
);

-- 2. Allow shop owners/managers to VIEW (Select) pending invitations for their shop's table
CREATE POLICY "Shop managers can view shop invitations" 
ON public.tenant_invitations
FOR SELECT 
USING (
    tenant_id IN (
        SELECT tenant_id FROM public.tenant_memberships 
        WHERE user_id = auth.uid() AND is_active = true
    )
);

-- 3. Allow shop owners/managers to CANCEL (Delete) invitations
CREATE POLICY "Shop managers can delete invitations" 
ON public.tenant_invitations
FOR DELETE 
USING (
    tenant_id IN (
        SELECT tenant_id FROM public.tenant_memberships 
        WHERE user_id = auth.uid() AND is_active = true
    )
);

-- 1. Grant the service role permission to read the tenants table for the join
GRANT SELECT ON public.tenants TO service_role;

-- 2. Grant the service role permission to read the customers table for shadow-claims
GRANT SELECT ON public.customers TO service_role;

-- 3. (Optional but recommended) Grant standard authenticated users read access for client-side joins
GRANT SELECT ON public.tenants TO authenticated;
GRANT SELECT ON public.customers TO authenticated;

-- Grant explicit table privileges to service role and authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tenant_invitations TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tenant_invitations TO authenticated;

-- Ensure RLS is configured properly or temporarily disabled if needed for onboarding lookups
ALTER TABLE public.tenant_invitations ENABLE ROW LEVEL SECURITY;

-- Create an RLS policy allowing users to read their own pending invitations by email
CREATE POLICY "Users can view their own pending invitations" 
ON public.tenant_invitations
FOR SELECT 
USING (auth.jwt() ->> 'email' = email);

CREATE OR REPLACE FUNCTION public.create_tenant_with_owner(
    p_name TEXT,
    p_slug TEXT,
    p_email TEXT DEFAULT NULL,
    p_gstin TEXT DEFAULT NULL,
    p_state_code TEXT DEFAULT NULL,
    p_address TEXT DEFAULT NULL,
    p_city TEXT DEFAULT NULL,
    p_pincode TEXT DEFAULT NULL,
    p_country TEXT DEFAULT 'India',
    p_country_code TEXT DEFAULT '+91',
    p_phone TEXT DEFAULT NULL
) RETURNS uuid AS $$
DECLARE
    v_tenant_id uuid;
    v_user_id uuid;
BEGIN
    -- Get the securely authenticated user ID
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    -- 1. Insert into tenants
    INSERT INTO public.tenants (
        name, slug, email, gstin, state_code, address, city, pincode, country, country_code, phone
    )
    VALUES (
        p_name, p_slug, p_email, p_gstin, p_state_code, p_address, p_city, p_pincode, p_country, p_country_code, p_phone
    )
    RETURNING id INTO v_tenant_id;

    -- 2. Bind the user as the owner
    INSERT INTO public.tenant_memberships (user_id, tenant_id, role)
    VALUES (v_user_id, v_tenant_id, 'owner');

    RETURN v_tenant_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE EXECUTE ON FUNCTION public.create_tenant_with_owner(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.create_tenant_with_owner(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION public.accept_tenant_invitation(p_token TEXT) 
RETURNS uuid AS $$
DECLARE
    v_invite record;
    v_user_id uuid;
    v_user_email TEXT;
BEGIN
    v_user_id := auth.uid();
    v_user_email := auth.jwt() ->> 'email';
    
    -- 1. Fetch and lock the invitation row
    SELECT * INTO v_invite 
    FROM public.tenant_invitations 
    WHERE token = p_token FOR UPDATE;

    -- 2. Strict Security Validations
    IF v_invite IS NULL THEN
        RAISE EXCEPTION 'Invalid invitation token';
    END IF;
    IF lower(v_invite.email) <> lower(v_user_email) THEN
        RAISE EXCEPTION 'This invitation was sent to a different email address.';
    END IF;
    IF v_invite.is_accepted THEN
        RAISE EXCEPTION 'Invitation already accepted';
    END IF;
    IF v_invite.expires_at < now() THEN
        RAISE EXCEPTION 'Invitation has expired';
    END IF;
    IF v_invite.revoked_at IS NOT NULL THEN
        RAISE EXCEPTION 'Invitation was revoked by the shop owner';
    END IF;

    -- 3. Mark accepted and insert membership
    UPDATE public.tenant_invitations SET is_accepted = true WHERE id = v_invite.id;
    
    INSERT INTO public.tenant_memberships (user_id, tenant_id, role, invited_by, is_active)
    VALUES (v_user_id, v_invite.tenant_id, v_invite.role, v_invite.invited_by, true)
    ON CONFLICT (user_id, tenant_id) 
    DO UPDATE SET 
        role = EXCLUDED.role, 
        invited_by = EXCLUDED.invited_by, 
        is_active = true;

    RETURN v_invite.tenant_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE EXECUTE ON FUNCTION public.accept_tenant_invitation(TEXT) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.accept_tenant_invitation(TEXT) TO authenticated;