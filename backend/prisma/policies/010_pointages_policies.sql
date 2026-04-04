-- ============================================================
-- 010 — RLS : pointages
-- Dépend de : 001_rls_helper_functions.sql, 009
-- ============================================================

ALTER TABLE pointages ENABLE ROW LEVEL SECURITY;

-- Bénévole : voit ses propres pointages (via intervention)
CREATE POLICY "pointages_select_benevole"
ON pointages FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM mission_interventions mi
    WHERE mi.id = pointages.intervention_id
      AND mi.benevole_id = auth.uid()
  )
);

-- Admin : voit tous les pointages de son org
CREATE POLICY "pointages_select_admin"
ON pointages FOR SELECT
TO authenticated
USING (
  get_my_role() = 'admin'
  AND EXISTS (
    SELECT 1 FROM mission_interventions mi
    JOIN missions m ON m.id = mi.mission_id
    WHERE mi.id = pointages.intervention_id
      AND m.organisation_id = get_my_org_id()
  )
);

-- Bénévole : peut créer son pointage (check-in)
CREATE POLICY "pointages_insert_benevole"
ON pointages FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM mission_interventions mi
    WHERE mi.id = pointages.intervention_id
      AND mi.benevole_id = auth.uid()
      AND mi.status = 'planned'
  )
);

-- Bénévole : peut mettre à jour son pointage (check-out)
CREATE POLICY "pointages_update_benevole"
ON pointages FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM mission_interventions mi
    WHERE mi.id = pointages.intervention_id
      AND mi.benevole_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM mission_interventions mi
    WHERE mi.id = pointages.intervention_id
      AND mi.benevole_id = auth.uid()
  )
);
