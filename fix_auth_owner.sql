DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN SELECT proname, oid::regprocedure FROM pg_proc WHERE pronamespace = 'auth'::regnamespace
    LOOP
        EXECUTE 'ALTER FUNCTION ' || r.oid || ' OWNER TO supabase_auth_admin';
    END LOOP;
END$$;
