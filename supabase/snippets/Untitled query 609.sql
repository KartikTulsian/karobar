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