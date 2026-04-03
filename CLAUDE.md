# CLAUDE.md — BénévolApp

> Ce fichier est lu automatiquement par Claude Code à chaque session.
> Il contient le contexte du projet, les conventions, et les notes de session.

> **Règle de branche — OBLIGATOIRE :**
> - Travail sur la version **web** → branche `web`
> - Travail sur la version **mobile** → branche `mobile`
> - Toujours vérifier la branche courante (`git branch`) avant de commencer.

---

## 1. Projet

**BénévolApp** — Plateforme de bénévolat encadré mettant en relation :

- **Bénéficiaires fragiles** (aide concrète, compte co-géré possible)
- **Bénévoles allocataires RSA** (activation sociale, export heures)
- **Administrateurs** (coordination, conformité, proxy bénéficiaire)

Modèle d'**entraide horizontale** : les bénévoles sont eux-mêmes en précarité. Le bénévolat = levier d'activation sociale, pas un rapport "forts → faibles".

### Différenciateurs clés

1. **Compte co-géré** — Admin agit en proxy pour un bénéficiaire non-autonome (traçabilité complète)
2. **Liste d'attente avec cascade automatique** — Désistement → le suivant est promu via PL/pgSQL
3. **Séparation inbox humaine / notifications système** — Communications admin isolées des alertes auto

### Critères de succès MVP

| Acteur | Critère |
|--------|---------|
| Bénévole | ≥1 mission/mois, historique heures exportable |
| Bénéficiaire | Aide concrète régulière, continuité relationnelle |
| Admin | <15 min de gestion/jour, zéro désistement non géré |
| Projet | 50 personnes en phase pilote, ≥90% de missions pourvues |
| Technique | <2-3 sec de temps de réponse, offline-first, conforme RGPD |

---

## 2. Architecture

### Monorepo Turborepo

```
benevolapp/
├── apps/
│   ├── mobile/           ← Expo React Native (tous les rôles : admin, bénévoles, bénéficiaires)
│   └── web/              ← Next.js 15 App Router (tous les rôles : admin, bénévoles, bénéficiaires)
├── backend/              ← Logique serveur, Prisma, services
│   ├── prisma/
│   │   └── schema.prisma
│   └── src/
│       └── lib/
│           └── prisma.ts
├── packages/
│   └── shared/           ← Source unique de vérité
│       ├── schemas/      ← Zod (base, user, organisation, mission)
│       └── types/        ← QueryKeys, AppErrorCodes, helpers dates
├── scripts/
│   ├── scaffold-feature.js
│   └── check-rls.js
└── CLAUDE.md             ← CE FICHIER
```

### Principes

- **Multi-tenant dès le MVP** — `organisation_id` UUID sur TOUTES les tables, isolation par RLS
- **Offline-first mobile** — MMKV + file d'attente sync différée (pointages QR)
- **RLS deny-all par défaut** — Chaque policy est explicitement whitelistée
- **Zod = source unique de vérité** — `packages/shared/schemas/` utilisé web + mobile + backend
- **Pas d'API proxy** — Supabase Client directement depuis Web/Mobile
- **Séparation RGPD** — `profiles` (public) + `profiles_sensitive` (email, phone, adresse, DOB)

### Flux de données

```
UI → React Hook Form (Zod) → TanStack Query → Supabase Client → PostgreSQL (RLS) → Response → Cache → UI
```

```
[Offline] Scan QR → MMKV → File d'attente → Reconnexion → Supabase → PostgreSQL (UNIQUE idempotence)
```

---

## 3. Stack technique

| Couche | Techno |
|--------|--------|
| Mobile | Expo SDK 54, React Native 0.76.9, Expo Router, NativeWind v4 |
| Web admin | Next.js 15 (App Router), Tailwind v4, shadcn/ui |
| Formulaires | React Hook Form + Zod (partagé) |
| State serveur | TanStack Query v5 |
| Auth | Supabase Auth (OAuth + email/password), expo-secure-store |
| BaaS | Supabase — EU West (Ireland), PostgreSQL 15 |
| ORM | Prisma v7.6.0 |
| Temps réel | Supabase Realtime (dashboard admin) |
| Stockage fichiers | Supabase Storage (photos profil) |
| Offline | react-native-mmkv |
| Monorepo | Turborepo v2.5.0, pnpm v10.33.0 |
| TypeScript | v6.0.2 strict |
| CI/CD | GitHub Actions (typecheck, lint, audit, RLS check) |
| Hébergement web | Vercel |
| Build mobile | Expo EAS Build + EAS Update (OTA) |

---

## 4. Conventions de code — OBLIGATOIRES

### Prisma / Base de données

- `@@map("snake_case")` + `@map("snake_case")` obligatoires sur tous les modèles
- Toutes les PKs en UUID (`gen_random_uuid()`)
- `TIMESTAMPTZ` pour toutes les dates/heures (jamais `DATETIME`)
- ENUMs en minuscules : `pending`, `active`, `benevole`, `draft`, etc.
- Le trigger `handle_new_user()` sur `auth.users` est géré hors Prisma (SQL Editor Supabase)

### RLS

- Nommage : `{table}_{action}_{qui}` (ex : `missions_select_benevole`)
- Deny-all par défaut, whitelist explicite
- Toute table sans policy = bloquée en CI (`check-rls.js`)

### TypeScript

- `strict: true` partout
- QueryKeys : uniquement dans `packages/shared/types/query-keys.ts`
- Erreurs : `createAppError()` — JAMAIS `throw new Error()`
- Dates : `toISOString()` pour toute source externe
- Async : `useSuspenseQuery` + `Suspense` + `ErrorBoundary`

### Zod

- Si ≥ 2 fichiers consomment un schema → `packages/shared/schemas/`
- Sinon → schema local au composant/module

### Tests

- Co-localisés : `Component.test.tsx` à côté du composant
- Web : Vitest + @testing-library/react
- Mobile : Jest + @testing-library/react-native

### Commits

- Format conventionnel : `feat:`, `fix:`, `chore:`, `docs:`, etc.

---

## 5. Base de données — Tables

18 tables au total. Toutes portent `organisation_id` (sauf `audit_logs` et `beneficiary_qr`).

### Tables fondatrices (Story 1.2)

| Table | Rôle |
|-------|------|
| `organisations` | Multi-tenant, FK de toutes les autres |
| `profiles` | Données publiques, `id` = `auth.users.id` |
| `profiles_sensitive` | RGPD : email, phone, adresse, DOB, RSA |

### Tables métier (Epics 2–7)

| Table | Rôle |
|-------|------|
| `types_service` | Catalogue des services proposés |
| `adresses` | Adresses (profils + missions) |
| `missions` | Missions avec status `draft/published/cancelled/completed` |
| `mission_schedules` | Planning : récurrence, jours, horaires |
| `mission_applications` | Candidatures bénévoles + liste d'attente ordonnée (`position`) |
| `mission_interventions` | Instances réelles de missions (date + status `planned/done/missed`) |
| `pointages` | Check-in/check-out par intervention (UNIQUE intervention_id) |
| `beneficiary_qr` | QR code permanent par bénéficiaire |
| `attendance_tokens` | Tokens HMAC anti-fraude, usage unique |
| `disponibilites` | Disponibilités hebdomadaires bénévoles |
| `validation_appointments` | RDV validation compte (remote/in_person) |
| `mission_followups` | Notes de suivi admin par mission |
| `admin_notes` | Notes privées admin (cible : profil XOR mission) |
| `notifications` | Système + inbox humaine (`is_human` boolean) |
| `audit_logs` | Trace complète actions sensibles (JSONB metadata) |

### Relations clés

- `profiles.managed_by_admin_id` → self-reference (proxy admin)
- `mission_applications` → UNIQUE(mission_id, benevole_id)
- `pointages` → UNIQUE(intervention_id)
- `admin_notes` → CHECK XOR (target_profile_id, target_mission_id)
- `notifications.is_human` → sépare inbox admin des notifs système

---

## 6. Fonctionnalités MVP

| Ref | Feature | Points clés |
|-----|---------|-------------|
| FR-01 | Inscription & Validation | 3 rôles, validation admin, RDV planifiable |
| FR-02 | Gestion missions | draft → published → completed/cancelled |
| FR-03 | Candidature & Liste d'attente | Cascade PL/pgSQL automatique |
| FR-04 | Pointage QR | Offline-first MMKV, HMAC, fallback code 6 chiffres |
| FR-05 | Export heures | PDF/CSV horodaté pour conseiller RSA |
| FR-06 | Dashboard admin | Alertes 🔴🟠🟡, advisory lock, Realtime |
| FR-07 | Inbox admin→user | Séparée des notifications système |
| FR-08 | Compte co-géré | Proxy admin, accès dual, logs traçables |
| FR-09 | RGPD | Export, anonymisation, audit trail |
| FR-10 | Anti-fraude | Device fingerprint + IP + user_agent, flagging async |

---

## 7. Commandes

```bash
pnpm dev            # Dev mobile + web en parallèle
pnpm build          # Build production
pnpm typecheck      # TypeScript strict (3 packages)
pnpm lint           # ESLint tous packages
pnpm test           # Vitest (web) + Jest (mobile)
pnpm new-feature    # Scaffold feature (mobile + web)
```

---

## 8. Variables d'environnement

```env
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_ANON_KEY=eyJ...
DATABASE_URL=postgresql://postgres.[ref]:[pwd]@aws-0-eu-west-1.pooler.supabase.com:6543/postgres
DIRECT_URL=postgresql://postgres.[ref]:[pwd]@aws-0-eu-west-1.pooler.supabase.com:5432/postgres
```

- `DATABASE_URL` → port 6543 (transaction mode, runtime)
- `DIRECT_URL` → port 5432 (direct mode, migrations Prisma)
- `SUPABASE_SERVICE_ROLE_KEY` → CI/CD secrets UNIQUEMENT, jamais côté client

### Config Supabase — points critiques

- **Région : EU West (Ireland)** — irréversible après création du projet, obligatoire RGPD
- Récupérer les credentials dans Supabase Dashboard → Settings → API
- Connexions database → Settings → Database (Transaction mode 6543 / Direct 5432)
- `SUPABASE_SERVICE_ROLE_KEY` → GitHub Actions secrets uniquement, ne jamais exposer en client

---

## 9. État d'avancement

| Epic | Titre | Status |
|------|-------|--------|
| Epic 1 | Fondation & Déploiement Continu | ✅ review |
| Story 1.1 | Init monorepo Turborepo | ✅ review |
| Story 1.2 | Supabase + Prisma base | ✅ review |
| Story 1.3 | CI/CD GitHub Actions | ✅ review |
| Story 1.4 | Déploiement écran vide prod | ✅ review |
| Story 1.5 | Monitoring + Backup | backlog |
| Epic 2 | Accès à la Plateforme | in-progress |
| Story 2.1 | Supabase client web + session proxy | ✅ review |
| Story 2.2 | Pages auth web (login, register, dashboard, callback) | ✅ review |
| Story 2.3 | Validation admin + RDV planifiable | ✅ review |
| Epic 3 | Gestion des Missions | backlog |
| Epic 4 | Présence & Pointage QR | backlog |
| Epic 5 | Suivi & Valorisation Heures | backlog |
| Epic 6 | Administration & Communication | backlog |
| Epic 7 | Conformité RGPD | backlog |

### Checklist restante (Story 1.1)

- [x] Template RLS naming (`backend/prisma/policies/000_rls_naming_template.sql`)

---

## 10. Documents de référence

| Document | Chemin |
|----------|--------|
| PRD | `_bmad-output/planning-artifacts/prd.md` |
| Architecture | `_bmad-output/planning-artifacts/architecture.md` |
| Epics & Stories | `_bmad-output/planning-artifacts/epics.md` |
| Story 1.1 | `_bmad-output/implementation-artifacts/1-1-*.md` |
| Story 1.2 | `_bmad-output/implementation-artifacts/1-2-*.md` |
| Story 1.3 | `_bmad-output/implementation-artifacts/1-3-*.md` |
| Readiness report | `_bmad-output/planning-artifacts/implementation-readiness-report-2026-03-27.md` |
| Synthèse complète | `PROJET_OVERVIEW.md` |

---

## 11. Notes de session

<!-- Claude Code : mets à jour cette section à chaque fin de tâche -->
<!-- Format : date + résumé de ce qui a été fait / décidé / bloqué -->

### 2026-04-04 — Fin de session

**Accompli :**
- Story 2.3 ✅ — Validation admin :
  - SQL RLS : `001_rls_helper_functions.sql` (fonctions SECURITY DEFINER pour éviter récursion)
  - SQL RLS : `002_profiles_policies.sql`, `003_profiles_sensitive_policies.sql`, `004_validation_appointments_policies.sql`, `005_notifications_policies.sql`
  - `(app)/admin/layout.tsx` — garde rôle admin server-side
  - `(app)/admin/pending-users/page.tsx` — liste les comptes pending
  - `pending-users/_components/pending-users-list.tsx` — approve / reject + notification
  - `pending-users/_components/schedule-appointment-form.tsx` — formulaire RDV (remote/in_person)
  - Dashboard mis à jour : lien admin si rôle = admin

**Prochaine étape : Story 2.4 (ou Epic 3)**
- À définir : inscription mobile (Expo) ou démarrer gestion des missions (Epic 3)

- Story 2.2 ✅ — Pages auth web complètes :
  - `middleware.ts` branchant le proxy Supabase
  - `(auth)/layout.tsx` + `login/page.tsx` + `login/_components/login-form.tsx`
  - `(auth)/register/page.tsx` + `register/_components/register-form.tsx`
  - `(app)/layout.tsx` (vérification session server-side)
  - `(app)/dashboard/page.tsx` (affiche rôle + prénom depuis user_metadata)
  - `auth/callback/route.ts` (échange code OAuth/magic link)
  - `auth/signout/route.ts` (POST → signOut + redirect /login)
  - `app/page.tsx` → redirect `/dashboard`
- Proxy.ts corrigé : routes publiques restreintes à `/auth/callback` et `/auth/signout`

**Prochaine étape : Story 2.3 — Validation admin**
- Page admin pour lister les comptes en attente (`status = pending`)
- Planification RDV de validation (remote / in_person) → table `validation_appointments`
- Notification à l'utilisateur lors du changement de statut

### 2026-04-03 — Fin de session

**Décision architecturale tranchée :**
- **Option A retenue** : web/mobile → Supabase Client direct (RLS + Auth natifs). Express uniquement pour : exports PDF/CSV (FR-05), anti-fraude async (FR-10), opérations service_role, webhooks Supabase.
- Raisons : RLS sur 18 tables × 3 rôles × multi-tenant serait trop lourd à recoder en middleware. Supabase Realtime (FR-06) et Storage nécessitent le client direct.

**Accompli :**
- Template RLS naming créé : `backend/prisma/policies/000_rls_naming_template.sql`
- Story 1.1 ✅ complète
- Story 1.4 ✅ — Next.js 16 déployé sur Vercel (branche web)

### 2026-04-01 — Fin de session

**Accompli :**
- Schéma Prisma complet (18 modèles, 9 ENUMs) + migration initiale vers Supabase
- CI/CD GitHub Actions (typecheck, lint, audit) sur Node.js 24
- ESLint configuré sur le backend
- Branches git : main, backend, web, mobile
- `.gitignore` racine + backend propres

---

## 12. Pièges connus

- **Prisma ne gère pas le RLS** → Écrire les policies en SQL brut dans les migrations custom (`prisma migrate dev --create-only`)
- **Le trigger `handle_new_user()` touche `auth.users`** → Impossible via Prisma, créer via SQL Editor Supabase
- **`tsconfig.json` backend** → `"include": ["src/**/*"]` pour éviter les erreurs de fichiers hors `rootDir`
- **`xss-clean` deprecated** → Affiche un warning npm mais non bloquant. À remplacer par une alternative maintenue (ex: `xss` ou middleware custom) lors d'une prochaine session
- **ENUMs MySQL ≠ PostgreSQL** → `CREATE TYPE ... AS ENUM`, jamais inline
- **`DATETIME` → `TIMESTAMPTZ`** → Toujours avec timezone sur Supabase
- **Supabase region = irréversible** → EU West (Ireland) obligatoire, vérifier à la création du projet
- **Trigger `handle_new_user()` doit lire les metadata d'inscription** → Pour que le profil soit créé correctement après `signUp`, le trigger doit extraire `raw_user_meta_data->>'role'`, `->>'first_name'`, `->>'last_name'`. À configurer via SQL Editor Supabase avant de tester l'inscription en prod.
- **RLS policies — ordre d'application obligatoire** → Appliquer les fichiers `backend/prisma/policies/` dans l'ordre numérique via Supabase SQL Editor. Le fichier `001` (fonctions SECURITY DEFINER) doit être appliqué en premier pour éviter la récursion infinie dans les policies.
- **Récursion RLS sur `profiles`** → Ne jamais faire `SELECT FROM profiles WHERE id = auth.uid()` directement dans une policy `profiles`. Utiliser `get_my_role()` et `get_my_org_id()` (SECURITY DEFINER) définis dans `001_rls_helper_functions.sql`.
- **`as never` cast sur la query Supabase** → Le type retourné par `.select()` avec jointure imbriquée n'est pas toujours inféré correctement. Cast `as never` acceptable pour les Server Components MVP ; à typer proprement avec `Database` généré par Supabase CLI si besoin.