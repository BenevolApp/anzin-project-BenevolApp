-- ============================================================
-- RLS HELPER FUNCTIONS — SECURITY DEFINER
-- Évite la récursion infinie dans les policies qui interrogent
-- la table profiles depuis une policy profiles.
-- À appliquer en premier via Supabase SQL Editor.
-- ============================================================

-- Retourne l'organisation_id de l'utilisateur courant
CREATE OR REPLACE FUNCTION get_my_org_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT organisation_id FROM profiles WHERE id = auth.uid()
$$;

-- Retourne le rôle de l'utilisateur courant
CREATE OR REPLACE FUNCTION get_my_role()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT role::text FROM profiles WHERE id = auth.uid()
$$;
