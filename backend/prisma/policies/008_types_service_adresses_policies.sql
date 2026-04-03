-- ============================================================
-- RLS POLICIES — types_service, adresses
-- Dépend de : 001_rls_helper_functions.sql
-- ============================================================

ALTER TABLE types_service ENABLE ROW LEVEL SECURITY;
ALTER TABLE adresses ENABLE ROW LEVEL SECURITY;

-- types_service : lecture pour tous les membres de l'org
CREATE POLICY types_service_select ON types_service
  FOR SELECT TO authenticated
  USING (organisation_id = get_my_org_id());

-- types_service : gestion par admin uniquement
CREATE POLICY types_service_insert_admin ON types_service
  FOR INSERT TO authenticated
  WITH CHECK (
    get_my_role() = 'admin'
    AND organisation_id = get_my_org_id()
  );

CREATE POLICY types_service_update_admin ON types_service
  FOR UPDATE TO authenticated
  USING (get_my_role() = 'admin' AND organisation_id = get_my_org_id())
  WITH CHECK (get_my_role() = 'admin' AND organisation_id = get_my_org_id());

-- adresses : lecture pour tous les membres de l'org
CREATE POLICY adresses_select ON adresses
  FOR SELECT TO authenticated
  USING (organisation_id = get_my_org_id());

-- adresses : insertion par admin uniquement
CREATE POLICY adresses_insert_admin ON adresses
  FOR INSERT TO authenticated
  WITH CHECK (
    get_my_role() = 'admin'
    AND organisation_id = get_my_org_id()
  );
