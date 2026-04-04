-- ============================================================
-- 012 — RLS : attendance_tokens
-- Dépend de : 001_rls_helper_functions.sql
-- ============================================================

ALTER TABLE attendance_tokens ENABLE ROW LEVEL SECURITY;

-- Admin : accès complet aux tokens de son org
CREATE POLICY "attendance_tokens_select_admin"
ON attendance_tokens FOR SELECT
TO authenticated
USING (
  get_my_role() = 'admin'
  AND EXISTS (
    SELECT 1 FROM mission_interventions mi
    JOIN missions m ON m.id = mi.mission_id
    WHERE mi.id = attendance_tokens.intervention_id
      AND m.organisation_id = get_my_org_id()
  )
);

-- Bénévole : peut lire les tokens de ses propres interventions
CREATE POLICY "attendance_tokens_select_benevole"
ON attendance_tokens FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM mission_interventions mi
    WHERE mi.id = attendance_tokens.intervention_id
      AND mi.benevole_id = auth.uid()
  )
);

-- Admin uniquement peut créer des tokens
CREATE POLICY "attendance_tokens_insert_admin"
ON attendance_tokens FOR INSERT
TO authenticated
WITH CHECK (
  get_my_role() = 'admin'
  AND EXISTS (
    SELECT 1 FROM mission_interventions mi
    JOIN missions m ON m.id = mi.mission_id
    WHERE mi.id = attendance_tokens.intervention_id
      AND m.organisation_id = get_my_org_id()
  )
);

-- Bénévole peut marquer un token comme utilisé (used = true)
CREATE POLICY "attendance_tokens_update_benevole"
ON attendance_tokens FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM mission_interventions mi
    WHERE mi.id = attendance_tokens.intervention_id
      AND mi.benevole_id = auth.uid()
  )
  AND used = false
  AND valid_until > now()
)
WITH CHECK (used = true);
