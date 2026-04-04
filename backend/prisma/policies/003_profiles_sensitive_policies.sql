-- ============================================================
-- RLS POLICIES — profiles_sensitive
-- Dépend de : 001_rls_helper_functions.sql
-- ============================================================

ALTER TABLE profiles_sensitive ENABLE ROW LEVEL SECURITY;

-- Lecture : chaque utilisateur voit ses propres données sensibles
CREATE POLICY profiles_sensitive_select_own ON profiles_sensitive
  FOR SELECT TO authenticated
  USING (id = auth.uid());

-- Lecture : admin voit les données sensibles de son organisation
CREATE POLICY profiles_sensitive_select_admin ON profiles_sensitive
  FOR SELECT TO authenticated
  USING (
    get_my_role() = 'admin'
    AND organisation_id = get_my_org_id()
  );

-- Mise à jour : chaque utilisateur peut modifier ses propres données sensibles
CREATE POLICY profiles_sensitive_update_own ON profiles_sensitive
  FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());
