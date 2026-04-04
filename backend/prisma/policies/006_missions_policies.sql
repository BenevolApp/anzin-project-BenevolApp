-- ============================================================
-- RLS POLICIES — missions, mission_schedules
-- Dépend de : 001_rls_helper_functions.sql
-- ============================================================

ALTER TABLE missions ENABLE ROW LEVEL SECURITY;
ALTER TABLE mission_schedules ENABLE ROW LEVEL SECURITY;

-- Lecture : admin voit toutes les missions de son org
CREATE POLICY missions_select_admin ON missions
  FOR SELECT TO authenticated
  USING (
    get_my_role() = 'admin'
    AND organisation_id = get_my_org_id()
  );

-- Lecture : bénévoles voient les missions publiées de leur org
CREATE POLICY missions_select_benevole ON missions
  FOR SELECT TO authenticated
  USING (
    get_my_role() = 'benevole'
    AND organisation_id = get_my_org_id()
    AND status = 'published'
  );

-- Lecture : bénéficiaire voit ses propres missions
CREATE POLICY missions_select_beneficiaire ON missions
  FOR SELECT TO authenticated
  USING (
    get_my_role() = 'beneficiaire'
    AND organisation_id = get_my_org_id()
    AND beneficiaire_id = auth.uid()
  );

-- Insertion : admin uniquement
CREATE POLICY missions_insert_admin ON missions
  FOR INSERT TO authenticated
  WITH CHECK (
    get_my_role() = 'admin'
    AND organisation_id = get_my_org_id()
  );

-- Mise à jour : admin uniquement
CREATE POLICY missions_update_admin ON missions
  FOR UPDATE TO authenticated
  USING (
    get_my_role() = 'admin'
    AND organisation_id = get_my_org_id()
  )
  WITH CHECK (
    get_my_role() = 'admin'
    AND organisation_id = get_my_org_id()
  );

-- mission_schedules : hérite de l'accès à la mission parente
CREATE POLICY mission_schedules_select ON mission_schedules
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM missions
      WHERE missions.id = mission_schedules.mission_id
    )
  );

CREATE POLICY mission_schedules_insert_admin ON mission_schedules
  FOR INSERT TO authenticated
  WITH CHECK (
    get_my_role() = 'admin'
  );

CREATE POLICY mission_schedules_update_admin ON mission_schedules
  FOR UPDATE TO authenticated
  USING (get_my_role() = 'admin')
  WITH CHECK (get_my_role() = 'admin');

CREATE POLICY mission_schedules_delete_admin ON mission_schedules
  FOR DELETE TO authenticated
  USING (get_my_role() = 'admin');
