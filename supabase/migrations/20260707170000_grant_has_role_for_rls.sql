-- Public SELECT policies reference has_role() in OR branches.
-- PostgREST still needs EXECUTE on the helper to evaluate those policies.
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO anon, authenticated;
