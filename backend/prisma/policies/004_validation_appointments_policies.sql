-- ============================================================
-- RLS POLICIES — validation_appointments
-- Dépend de : 001_rls_helper_functions.sql
-- ============================================================

ALTER TABLE validation_appointments ENABLE ROW LEVEL SECURITY;

-- Lecture : utilisateur voit ses propres RDV
CREATE POLICY validation_appointments_select_own ON validation_appointments
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Lecture : admin voit tous les RDV de son organisation
CREATE POLICY validation_appointments_select_admin ON validation_appointments
  FOR SELECT TO authenticated
  USING (
    get_my_role() = 'admin'
    AND organisation_id = get_my_org_id()
  );

-- Insertion : seul l'admin peut créer des RDV
CREATE POLICY validation_appointments_insert_admin ON validation_appointments
  FOR INSERT TO authenticated
  WITH CHECK (
    get_my_role() = 'admin'
    AND organisation_id = get_my_org_id()
  );

-- Mise à jour : seul l'admin peut modifier les RDV (annulation, report)
CREATE POLICY validation_appointments_update_admin ON validation_appointments
  FOR UPDATE TO authenticated
  USING (
    get_my_role() = 'admin'
    AND organisation_id = get_my_org_id()
  )
  WITH CHECK (
    get_my_role() = 'admin'
    AND organisation_id = get_my_org_id()
  );
