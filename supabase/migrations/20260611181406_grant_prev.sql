-- 1. Grant basic schema usage
GRANT USAGE ON SCHEMA public TO anon, authenticated;

-- 2. Grant CRUD privileges ONLY to logged-in users (authenticated)
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;

-- 3. Grant ONLY read access to unlogged-in users (anon)
-- GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;

-- 4. Ensure any new tables created in the future inherit these secure rules
ALTER DEFAULT PRIVILEGES IN SCHEMA public 
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO authenticated;

-- ALTER DEFAULT PRIVILEGES IN SCHEMA public 
-- GRANT SELECT ON TABLES TO anon;

-- 5. Grant sequence usage (needed if you ever use auto-incrementing integers)
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public 
GRANT USAGE, SELECT ON SEQUENCES TO authenticated;
