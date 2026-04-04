-- ============================================================
-- 011 — RLS : beneficiary_qr
-- Dépend de : 001_rls_helper_functions.sql
-- ============================================================

ALTER TABLE beneficiary_qr ENABLE ROW LEVEL SECURITY;

-- Bénéficiaire : voit son propre QR
CREATE POLICY "beneficiary_qr_select_own"
ON beneficiary_qr FOR SELECT
TO authenticated
USING (beneficiary_id = auth.uid());

-- Admin : voit tous les QR de son org
CREATE POLICY "beneficiary_qr_select_admin"
ON beneficiary_qr FOR SELECT
TO authenticated
USING (
  get_my_role() = 'admin'
  AND EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = beneficiary_qr.beneficiary_id
      AND p.organisation_id = get_my_org_id()
  )
);

-- Bénévole : peut lire un QR pour valider un pointage (SELECT by token)
-- La policy select_own + select_admin ne suffisent pas pour la lecture cross-user
-- On autorise tout membre authentifié à lire (token = secret non devinable)
CREATE POLICY "beneficiary_qr_select_benevole"
ON beneficiary_qr FOR SELECT
TO authenticated
USING (
  get_my_role() = 'benevole'
  AND EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = beneficiary_qr.beneficiary_id
      AND p.organisation_id = get_my_org_id()
  )
);

-- Bénéficiaire : peut créer son propre QR (premier accès)
CREATE POLICY "beneficiary_qr_insert_own"
ON beneficiary_qr FOR INSERT
TO authenticated
WITH CHECK (beneficiary_id = auth.uid());

-- Admin : peut créer un QR pour un bénéficiaire
CREATE POLICY "beneficiary_qr_insert_admin"
ON beneficiary_qr FOR INSERT
TO authenticated
WITH CHECK (
  get_my_role() = 'admin'
  AND EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = beneficiary_qr.beneficiary_id
      AND p.organisation_id = get_my_org_id()
  )
);
