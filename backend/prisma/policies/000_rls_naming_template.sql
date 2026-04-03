-- =============================================================================
-- 000_rls_naming_template.sql — Template de référence RLS
-- =============================================================================
-- NE PAS exécuter directement. Copier et adapter pour chaque table.
--
-- Convention de nommage : {table}_{action}_{qui}
--   {table}  : nom exact de la table (snake_case)
--   {action} : select | insert | update | delete | all
--   {qui}    : benevole | beneficiaire | admin | owner | anon
--
-- Exemples valides :
--   missions_select_benevole
--   missions_all_admin
--   profiles_update_owner
--   profiles_sensitive_select_admin
--   audit_logs_insert_service_role  (service_role bypass RLS nativement — pas besoin de policy)
-- =============================================================================


-- -----------------------------------------------------------------------------
-- ÉTAPE 1 — Activer RLS (deny-all par défaut)
-- -----------------------------------------------------------------------------
ALTER TABLE {table} ENABLE ROW LEVEL SECURITY;
ALTER TABLE {table} FORCE ROW LEVEL SECURITY; -- bloque aussi le owner de la table


-- -----------------------------------------------------------------------------
-- PATTERN A — SELECT : propriétaire uniquement
-- Usage : profiles, profiles_sensitive, disponibilites
-- -----------------------------------------------------------------------------
CREATE POLICY {table}_select_owner
  ON {table}
  FOR SELECT
  USING (
    auth.uid() = user_id
  );


-- -----------------------------------------------------------------------------
-- PATTERN B — SELECT : bénévole (accès limité à sa propre organisation)
-- Usage : missions, types_service, adresses publiques
-- -----------------------------------------------------------------------------
CREATE POLICY {table}_select_benevole
  ON {table}
  FOR SELECT
  USING (
    organisation_id = (
      SELECT organisation_id FROM profiles WHERE id = auth.uid()
    )
    AND
    auth.uid() IN (
      SELECT id FROM profiles WHERE role = 'benevole'
    )
  );


-- -----------------------------------------------------------------------------
-- PATTERN C — SELECT : bénéficiaire (accès limité à sa propre organisation)
-- Usage : missions publiées, types_service
-- -----------------------------------------------------------------------------
CREATE POLICY {table}_select_beneficiaire
  ON {table}
  FOR SELECT
  USING (
    organisation_id = (
      SELECT organisation_id FROM profiles WHERE id = auth.uid()
    )
    AND
    auth.uid() IN (
      SELECT id FROM profiles WHERE role = 'beneficiaire'
    )
  );


-- -----------------------------------------------------------------------------
-- PATTERN D — ALL : admin (lecture + écriture sur toute son organisation)
-- Usage : missions, mission_applications, notifications, admin_notes
-- -----------------------------------------------------------------------------
CREATE POLICY {table}_all_admin
  ON {table}
  FOR ALL
  USING (
    organisation_id = (
      SELECT organisation_id FROM profiles WHERE id = auth.uid()
    )
    AND
    auth.uid() IN (
      SELECT id FROM profiles WHERE role = 'admin'
    )
  )
  WITH CHECK (
    organisation_id = (
      SELECT organisation_id FROM profiles WHERE id = auth.uid()
    )
    AND
    auth.uid() IN (
      SELECT id FROM profiles WHERE role = 'admin'
    )
  );


-- -----------------------------------------------------------------------------
-- PATTERN E — INSERT : avec vérification de cohérence organisation
-- Usage : mission_applications, pointages, disponibilites
-- -----------------------------------------------------------------------------
CREATE POLICY {table}_insert_benevole
  ON {table}
  FOR INSERT
  WITH CHECK (
    organisation_id = (
      SELECT organisation_id FROM profiles WHERE id = auth.uid()
    )
    AND
    auth.uid() IN (
      SELECT id FROM profiles WHERE role = 'benevole'
    )
  );


-- -----------------------------------------------------------------------------
-- PATTERN F — UPDATE : propriétaire uniquement, ne peut pas changer l'org
-- Usage : profiles (mise à jour profil), disponibilites
-- -----------------------------------------------------------------------------
CREATE POLICY {table}_update_owner
  ON {table}
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND organisation_id = (SELECT organisation_id FROM profiles WHERE id = auth.uid())
  );


-- -----------------------------------------------------------------------------
-- PATTERN G — Compte co-géré (proxy admin)
-- Usage : profiles, profiles_sensitive quand managed_by_admin_id IS NOT NULL
-- L'admin peut lire/écrire pour le bénéficiaire qu'il gère
-- -----------------------------------------------------------------------------
CREATE POLICY {table}_select_proxy_admin
  ON {table}
  FOR SELECT
  USING (
    -- Soit c'est l'utilisateur lui-même
    auth.uid() = user_id
    OR
    -- Soit c'est l'admin assigné comme proxy
    auth.uid() = (
      SELECT managed_by_admin_id FROM profiles WHERE id = {table}.user_id
    )
  );


-- =============================================================================
-- Tables accédées via service_role (backend Express)
-- Le service_role bypasse RLS automatiquement — aucune policy nécessaire.
-- Documenter ici pour traçabilité :
-- =============================================================================
--   audit_logs          — écriture de toutes les traces sensibles
--   attendance_tokens   — création/validation des tokens HMAC
--   profiles_sensitive  — exports RGPD complets
--   notifications       — envoi de notifications système (is_human = false)
--   beneficiary_qr      — génération des QR codes


-- =============================================================================
-- CHECKLIST avant chaque migration RLS
-- =============================================================================
-- [ ] ALTER TABLE ... ENABLE ROW LEVEL SECURITY
-- [ ] ALTER TABLE ... FORCE ROW LEVEL SECURITY
-- [ ] Un policy SELECT explicite pour chaque rôle qui doit lire
-- [ ] INSERT avec WITH CHECK (jamais seulement USING)
-- [ ] UPDATE avec USING + WITH CHECK
-- [ ] Nommage {table}_{action}_{qui} respecté sur tous les policies
-- [ ] Testé en anon (doit tout bloquer)
-- [ ] Testé par rôle (benevole ne voit pas une autre org, etc.)
-- [ ] Ajouté dans scripts/check-rls.js si c'est une nouvelle table
-- =============================================================================
