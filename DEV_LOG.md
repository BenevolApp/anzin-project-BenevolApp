# DEV_LOG.md — BénévolApp

> Journal de développement chronologique.
> Chaque session y consigne : fichiers créés/modifiés, décisions techniques, erreurs rencontrées, prochaine étape.
> **Référencé depuis CLAUDE.md §13 — c'est ici qu'on lit le détail.**

---

## Format d'une entrée

```
### YYYY-MM-DD — [titre court]
**Branche :** mobile | web | les deux
**Statut :** terminé | en cours | bloqué

#### Fichiers créés
- `chemin/fichier.ts` — description

#### Fichiers modifiés
- `chemin/fichier.ts` — ce qui a changé

#### Décisions techniques
- Décision prise + raison

#### Erreurs / Pièges rencontrés
- Description + solution appliquée

#### Prochaine étape
- ...
```

---

## 2026-04-03 — Fondation + Architecture

**Branche :** mobile + web (init)
**Statut :** terminé

#### Fichiers créés
- `backend/prisma/schema.prisma` — 18 modèles, 9 ENUMs, migration initiale `20260401`
- `backend/prisma/policies/000_rls_naming_template.sql` — template référence nommage RLS
- `.github/workflows/` — CI/CD GitHub Actions (node 24)
- `turbo.json`, `pnpm-workspace.yaml` — config monorepo Turborepo

#### Décisions techniques
- Architecture Supabase Client direct (vs proxy Express) — RLS + Realtime + Storage natifs
- Express/backend réservé : exports PDF/CSV, anti-fraude async, `service_role`, webhooks
- Branches git séparées : `web` pour Next.js, `mobile` pour Expo

#### Erreurs / Pièges rencontrés
- `xss-clean` deprecated → warning npm non bloquant, ignoré
- `tsconfig.json` backend : `"include": ["src/**/*"]` nécessaire pour éviter erreurs hors `rootDir`

#### Prochaine étape
- Epic 2 : Auth + session sur web et mobile

---

## 2026-04-04 — Epic 2 + Epic 3 (web + mobile)

**Branche :** web + mobile (sessions séparées)
**Statut :** terminé

#### Fichiers créés — Web
- `web/middleware.ts` — export proxy
- `web/proxy.ts` — session refresh + protection routes
- `web/utils/supabase/client.ts`, `server.ts`
- `web/app/(auth)/login/`, `register/` — auth screens
- `web/app/auth/callback/route.ts`, `signout/route.ts`
- `web/app/(app)/dashboard/page.tsx` — status-aware (pending/rejected)
- `web/app/(app)/missions/page.tsx`, `[id]/page.tsx`
- `web/app/(app)/admin/pending-users/` — liste + validation + RDV
- `web/app/(app)/admin/missions/new/`, `[id]/edit/`, `_components/`

#### Fichiers créés — Mobile
- `mobile/app/_layout.tsx` — root layout + session guard
- `mobile/app/(auth)/login.tsx`, `register.tsx`
- `mobile/app/(app)/index.tsx` — dashboard status-aware
- `mobile/app/(app)/missions/index.tsx`, `[id].tsx`
- `mobile/app/(app)/admin/pending-users.tsx`
- `mobile/app/(app)/admin/missions/new.tsx`, `[id]/edit.tsx`, `_components/`
- `mobile/utils/supabase/client.ts` — createClient + SecureStore adapter
- `backend/prisma/policies/001_rls_helper_functions.sql` — `get_my_role()`, `get_my_org_id()` SECURITY DEFINER
- `backend/prisma/policies/002_profiles_policies.sql`
- `backend/prisma/policies/003_profiles_sensitive_policies.sql`
- `backend/prisma/policies/004_validation_appointments_policies.sql`
- `backend/prisma/policies/005_notifications_policies.sql`
- `backend/prisma/policies/006_missions_policies.sql`
- `backend/prisma/policies/007_mission_applications_policies.sql`
- `backend/prisma/policies/008_types_service_adresses_policies.sql`

#### Décisions techniques
- Pas de TanStack Query pour Epics 2–3 — Server Components (web) + `useState/useEffect` (mobile) suffisent
- Pas de shadcn/ui — Tailwind pur pour garder le bundle léger
- Formulaire mobile mission : `TextInput` pour dates/heures (YYYY-MM-DD / HH:MM) — pas de picker externe

#### Erreurs / Pièges rencontrés
- **`cookies()` async Next.js 16** → toujours `await cookies()`, sinon erreur runtime
- **`params` async Next.js 16** → toujours `await params` dans pages dynamiques
- **SecureStore keys** → caractères spéciaux interdits, sanitiser avec `.replace(/[^a-zA-Z0-9._-]/g, '_')`
- **Récursion RLS `profiles`** → utiliser `get_my_role()` SECURITY DEFINER, jamais `SELECT FROM profiles` dans une policy `profiles`
- **`as never` cast Supabase** → jointures imbriquées mal inférées, cast `as unknown as Type[]` acceptable MVP

#### Prochaine étape
- Epic 4 : Présence & Pointage QR (mobile d'abord)

---

## 2026-04-04 — Epic 4 mobile (Stories 4.1–4.5, commité)

**Branche :** mobile
**Statut :** terminé (mobile) — RLS 009–012 à appliquer manuellement dans Supabase SQL Editor

#### Packages installés (mobile)
- `react-native-mmkv ^4.3.0` — stockage clé-valeur offline rapide
- `react-native-qrcode-svg ^6.3.21` — génération QR bénéficiaire
- `expo-camera ~17.0.10` — scan QR bénévole

#### Fichiers créés
- `mobile/app/(app)/beneficiaire/qr.tsx` — affiche le QR permanent du bénéficiaire (`react-native-qrcode-svg`)
- `mobile/app/(app)/admin/interventions/new.tsx` — admin crée une intervention planifiée (mission → bénévole → date/heure)
- `mobile/app/(app)/pointage/scan.tsx` — scan QR via caméra (`expo-camera`), extrait et vérifie le token
- `mobile/app/(app)/pointage/fallback.tsx` — saisie manuelle code 6 chiffres si scan impossible
- `mobile/app/(app)/pointage/confirm.tsx` — confirmation pointage, enregistrement Supabase ou mise en queue offline
- `mobile/utils/offline-queue.ts` — file d'attente MMKV pour pointages en mode hors-ligne
- `backend/prisma/policies/009_mission_interventions_policies.sql`
- `backend/prisma/policies/010_pointages_policies.sql`
- `backend/prisma/policies/011_beneficiary_qr_policies.sql`
- `backend/prisma/policies/012_attendance_tokens_policies.sql`

#### Fichiers modifiés
- `mobile/app/(app)/_layout.tsx` — ajout routes : `admin/interventions/new`, `beneficiaire/qr`, `pointage/scan`, `pointage/fallback`, `pointage/confirm`
- `mobile/app.json` — ajout plugin `expo-camera` avec permissions caméra
- `mobile/package.json` — ajout des 3 nouvelles dépendances
- `pnpm-lock.yaml` — mis à jour automatiquement

#### Décisions techniques
- La vérification HMAC se fait **côté backend** (`service_role`) — la clé secrète ne doit jamais être exposée au client mobile
- `beneficiary_qr` encode `{ beneficiary_id, token }` — token permanent, rotatable par admin
- `attendance_tokens` : tokens HMAC à usage unique avec expiration configurable
- File offline MMKV : la queue est drainée automatiquement à la reconnexion

#### Fichiers modifiés (session 2)
- `mobile/app/(app)/missions/[id].tsx` — section interventions admin (liste + bouton "Planifier") + `fetchInterventions()`
- `mobile/utils/offline-queue.ts` — fix API `react-native-mmkv` v4 : `new MMKV()` → `createMMKV()`

#### Erreurs / Pièges rencontrés
- **`react-native-mmkv` v4** — `MMKV` est maintenant un type uniquement, la valeur s'appelle `createMMKV`. `new MMKV({ id })` → `createMMKV({ id })`.
- ⚠️ **`expo-camera` + Expo Go** → incompatible, nécessite `expo-dev-client` ou EAS Build pour tester
- ⚠️ **`react-native-mmkv` + Expo Go** → même contrainte, build natif obligatoire

#### Prochaine étape
- [ ] Appliquer RLS 009–012 dans Supabase SQL Editor (ordre : 009 → 010 → 011 → 012)
- [ ] Implémenter endpoint backend HMAC verification (`POST /api/pointage/verify`) — Epic 7 anti-fraude
- [x] Epic 5 : Export heures CSV (mobile client-side + backend endpoint)
- [x] Epic 6 : Dashboard admin mobile (alertes 🔴🟠🟡)

---

## 2026-04-04 — Epic 5 (export heures) + Epic 6 (dashboard admin alertes)

**Branche :** mobile
**Statut :** terminé

#### Packages installés (mobile)
- `expo-file-system ~18.0.6` — écriture fichier CSV local
- `expo-sharing ~12.0.4` — partage natif (share sheet iOS/Android)

#### Fichiers créés
- `mobile/app/(app)/benevole/mes-heures.tsx` — historique complet des pointages + total heures + export CSV via expo-sharing
- `mobile/app/(app)/admin/dashboard.tsx` — tableau de bord admin : résumé (missions actives, candidatures, comptes en attente) + alertes 🔴🟠🟡 cliquables
- `backend/src/routes/export.ts` — `GET /api/export/heures/:benevole_id` — CSV côté serveur Prisma (service_role), auth via `X-Export-Secret`

#### Fichiers modifiés
- `mobile/app/(app)/_layout.tsx` — ajout routes `admin/dashboard` et `benevole/mes-heures`
- `mobile/app/(app)/index.tsx` — bénévole : ajout bouton "Mes heures" ; admin : shortcut → dashboard (au lieu de pending-users)
- `mobile/package.json` — ajout expo-file-system, expo-sharing
- `backend/src/server.ts` — enregistrement route `/api/export`

#### Décisions techniques
- Export CSV **côté mobile** via `expo-file-system` + `expo-sharing` : bénévole peut partager son propre CSV directement depuis le téléphone, sans dépendre du backend déployé
- Export CSV **côté backend** (`/api/export/heures/:id`) : pour usage admin ou intégration futur conseiller RSA ; protégé par `X-Export-Secret` header (secret partagé env var)
- Dashboard admin : 5 requêtes Supabase en `Promise.all` pour charger les stats sans waterfall
- Alertes cliquables → routage direct vers l'écran concerné

#### Erreurs / Pièges à surveiller
- `expo-file-system` + `expo-sharing` nécessitent un **build natif** (incompatible Expo Go) — même contrainte qu'expo-camera et react-native-mmkv
- `X-Export-Secret` doit être ajouté aux secrets GitHub et dans `.env` backend

#### Prochaine étape
- [ ] Appliquer RLS 009–012 dans Supabase SQL Editor
- [ ] Epic 5 suite : export PDF (ex. `react-pdf` ou `pdfmake` côté backend)
- [ ] Epic 6 suite : Supabase Realtime — abonnement temps réel sur `mission_interventions` + `profiles` pour le dashboard admin
- [ ] Epic 7 : HMAC verification backend + anti-fraude
