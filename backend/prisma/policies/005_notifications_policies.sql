-- ============================================================
-- RLS POLICIES — notifications
-- Dépend de : 001_rls_helper_functions.sql
-- ============================================================

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Lecture : chaque utilisateur voit ses propres notifications
CREATE POLICY notifications_select_own ON notifications
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Insertion : admin peut envoyer des notifications aux membres de son org
CREATE POLICY notifications_insert_admin ON notifications
  FOR INSERT TO authenticated
  WITH CHECK (
    get_my_role() = 'admin'
    AND organisation_id = get_my_org_id()
  );

-- Mise à jour : utilisateur peut marquer ses notifications comme lues
CREATE POLICY notifications_update_own ON notifications
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
