-- 1. Grant the service role permission to read the tenants table for the join
GRANT SELECT ON public.tenants TO service_role;

-- 2. Grant the service role permission to read the customers table for shadow-claims
GRANT SELECT ON public.customers TO service_role;

-- 3. (Optional but recommended) Grant standard authenticated users read access for client-side joins
GRANT SELECT ON public.tenants TO authenticated;
GRANT SELECT ON public.customers TO authenticated;