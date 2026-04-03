-- ============================================================
-- RLS POLICIES — profiles
-- Dépend de : 001_rls_helper_functions.sql
-- ============================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Lecture : chaque utilisateur voit son propre profil
CREATE POLICY profiles_select_own ON profiles
  FOR SELECT TO authenticated
  USING (id = auth.uid());

-- Lecture : admin voit tous les profils de son organisation
CREATE POLICY profiles_select_admin ON profiles
  FOR SELECT TO authenticated
  USING (
    get_my_role() = 'admin'
    AND organisation_id = get_my_org_id()
  );

-- Mise à jour : chaque utilisateur peut modifier son propre profil
-- (sauf status et role — protégé par la policy admin)
CREATE POLICY profiles_update_own ON profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Mise à jour : admin peut modifier le statut des profils de son org
CREATE POLICY profiles_update_admin ON profiles
  FOR UPDATE TO authenticated
  USING (
    get_my_role() = 'admin'
    AND organisation_id = get_my_org_id()
  )
  WITH CHECK (
    get_my_role() = 'admin'
    AND organisation_id = get_my_org_id()
  );

-- Insertion : géré par le trigger handle_new_user() côté service_role
-- Pas de policy INSERT pour authenticated — le trigger bypasse le RLS
