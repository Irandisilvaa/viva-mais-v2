REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.check_slot_capacity() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.indicadores_gerais(date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.indicadores_gerais(date) TO authenticated;