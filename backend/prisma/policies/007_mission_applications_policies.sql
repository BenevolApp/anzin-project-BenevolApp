-- ============================================================
-- RLS POLICIES — mission_applications
-- Dépend de : 001_rls_helper_functions.sql
-- ============================================================

ALTER TABLE mission_applications ENABLE ROW LEVEL SECURITY;

-- Lecture : bénévole voit ses propres candidatures
CREATE POLICY mission_applications_select_own ON mission_applications
  FOR SELECT TO authenticated
  USING (benevole_id = auth.uid());

-- Lecture : admin voit toutes les candidatures de son org
CREATE POLICY mission_applications_select_admin ON mission_applications
  FOR SELECT TO authenticated
  USING (
    get_my_role() = 'admin'
    AND EXISTS (
      SELECT 1 FROM missions
      WHERE missions.id = mission_applications.mission_id
        AND missions.organisation_id = get_my_org_id()
    )
  );

-- Insertion : bénévole peut postuler à une mission publiée de son org
CREATE POLICY mission_applications_insert_benevole ON mission_applications
  FOR INSERT TO authenticated
  WITH CHECK (
    get_my_role() = 'benevole'
    AND benevole_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM missions
      WHERE missions.id = mission_applications.mission_id
        AND missions.organisation_id = get_my_org_id()
        AND missions.status = 'published'
    )
  );

-- Mise à jour : admin gère le statut des candidatures
CREATE POLICY mission_applications_update_admin ON mission_applications
  FOR UPDATE TO authenticated
  USING (
    get_my_role() = 'admin'
    AND EXISTS (
      SELECT 1 FROM missions
      WHERE missions.id = mission_applications.mission_id
        AND missions.organisation_id = get_my_org_id()
    )
  )
  WITH CHECK (
    get_my_role() = 'admin'
  );

-- Suppression : bénévole peut retirer sa candidature (si pending)
CREATE POLICY mission_applications_delete_benevole ON mission_applications
  FOR DELETE TO authenticated
  USING (
    benevole_id = auth.uid()
    AND status = 'pending'
  );
