-- ============================================================
-- 009 — RLS : mission_interventions
-- Dépend de : 001_rls_helper_functions.sql
-- ============================================================

ALTER TABLE mission_interventions ENABLE ROW LEVEL SECURITY;

-- Bénévole : voit ses propres interventions
CREATE POLICY "mission_interventions_select_benevole"
ON mission_interventions FOR SELECT
TO authenticated
USING (
  benevole_id = auth.uid()
);

-- Admin : voit toutes les interventions de son org
CREATE POLICY "mission_interventions_select_admin"
ON mission_interventions FOR SELECT
TO authenticated
USING (
  get_my_role() = 'admin'
  AND EXISTS (
    SELECT 1 FROM missions m
    WHERE m.id = mission_interventions.mission_id
      AND m.organisation_id = get_my_org_id()
  )
);

-- Admin : peut créer des interventions
CREATE POLICY "mission_interventions_insert_admin"
ON mission_interventions FOR INSERT
TO authenticated
WITH CHECK (
  get_my_role() = 'admin'
  AND EXISTS (
    SELECT 1 FROM missions m
    WHERE m.id = mission_interventions.mission_id
      AND m.organisation_id = get_my_org_id()
  )
);

-- Bénévole : peut passer son intervention de 'planned' → 'done' (après check-in)
CREATE POLICY "mission_interventions_update_benevole"
ON mission_interventions FOR UPDATE
TO authenticated
USING (
  benevole_id = auth.uid()
  AND status = 'planned'
)
WITH CHECK (
  benevole_id = auth.uid()
  AND status = 'done'
);

-- Admin : peut modifier le statut
CREATE POLICY "mission_interventions_update_admin"
ON mission_interventions FOR UPDATE
TO authenticated
USING (
  get_my_role() = 'admin'
  AND EXISTS (
    SELECT 1 FROM missions m
    WHERE m.id = mission_interventions.mission_id
      AND m.organisation_id = get_my_org_id()
  )
)
WITH CHECK (
  get_my_role() = 'admin'
);
