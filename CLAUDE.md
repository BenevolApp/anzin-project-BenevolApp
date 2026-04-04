# CLAUDE.md — BénévolApp

> Fichier lu automatiquement par Claude Code à chaque session.
> Source unique de vérité pour le contexte, les conventions et l'état du projet.

---

## ⚠️ RÈGLES ABSOLUES — LIRE EN PREMIER

1. **Branche par plateforme** — web → branche `web` | mobile → branche `mobile`. Vérifier avec `git branch` avant tout travail.
2. **Après chaque `git checkout`** → relancer `pnpm install` depuis la racine (les `package.json` diffèrent entre branches).
3. **Notes et remarques** → toujours écrire dans ce fichier (section Pièges ou Notes de session), jamais seulement dans la réponse chat.
4. **Sync CLAUDE.md entre branches** → après toute mise à jour, propager via `git show <branche>:CLAUDE.md > CLAUDE.md` sur l'autre branche.
5. **Push GitHub après chaque story ET chaque correction** → commit + `git push origin <branche>` après chaque story terminée ET après chaque bug fix / correction de problème. Ne jamais laisser de commits locaux sans push.
6. **Tout code écrit ou modifié DOIT passer la CI GitHub Actions** → avant tout commit, vérifier mentalement (ou lancer localement) les contraintes ci-dessous. Un commit qui casse la CI est interdit.

### Contraintes CI obligatoires (`.github/workflows/ci.yml`)

| Étape | Commande CI | Contrainte à respecter |
|-------|-------------|----------------------|
| Install | `pnpm install --frozen-lockfile` | Si un `package.json` est modifié, **toujours** regénérer le lockfile avec `pnpm install --no-frozen-lockfile` et committer `pnpm-lock.yaml`. Synchroniser `web/package.json` entre branches si nécessaire. |
| Prisma generate | `pnpm exec prisma generate` | Après toute modification de `schema.prisma`, le client généré (`generated/prisma/`) doit être cohérent avec l'import dans le code. |
| Typecheck backend | `pnpm turbo run typecheck --filter=backend` | `backend/` doit passer `tsc --noEmit` sans erreur. Contraintes spécifiques : `strict: true`, `noUncheckedIndexedAccess: true`, `exactOptionalPropertyTypes: true`, `rootDir: "./"` (import depuis `generated/` autorisé). |
| Lint backend | `pnpm turbo run lint --filter=backend` | Aucune erreur ESLint dans `backend/src/`. |
| Security audit | `pnpm audit --audit-level=high` | Aucune vulnérabilité de sévérité HIGH ou CRITICAL dans les dépendances. |

### Pièges CI récurrents
- **`pnpm-lock.yaml` désynchronisé** → toujours committer le lockfile après ajout/suppression de dépendance, et synchroniser `web/package.json` entre les branches `web` et `mobile`
- **Import Prisma v7** → utiliser `../../generated/prisma/client.js` (pas `index.js`)
- **`new PrismaClient()`** → Prisma v7 exige un adapter : `new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env["DATABASE_URL"] ?? "" }) })`
- **`req.params` Express v5** → typé `string | string[]`, utiliser `String(req.params["param"] ?? "")` pour obtenir un `string`
- **`req.params` avec `noUncheckedIndexedAccess`** → accès par index retourne `T | undefined`, toujours utiliser `?? ""`
- **TS2883 "inferred type cannot be named"** → annoter explicitement la variable : `import { Router, type Router as RouterType } from "express"` puis `const router: RouterType = Router()`
- **Vulnérabilité transitive** → utiliser `pnpm.overrides` dans le `package.json` racine pour forcer la version patchée, puis `pnpm install --no-frozen-lockfile` et committer le lockfile
- **Checklist avant tout commit** → lancer `pnpm install --frozen-lockfile` + `tsc --noEmit` (dans le package modifié) + `pnpm audit --audit-level=high`
- **Next.js 16 — `middleware.ts` + `proxy.ts` interdit** → Next.js 16 n'accepte que `proxy.ts`. Supprimer `middleware.ts` si les deux coexistent (erreur build Vercel : "middleware-to-proxy")

---

## 1. Projet

**BénévolApp** — Plateforme de bénévolat encadré mettant en relation :
- **Bénéficiaires fragiles** (aide concrète, compte co-géré possible)
- **Bénévoles allocataires RSA** (activation sociale, export heures)
- **Administrateurs** (coordination, conformité, proxy bénéficiaire)

Modèle d'**entraide horizontale** : les bénévoles sont eux-mêmes en précarité.

### Différenciateurs clés
1. **Compte co-géré** — Admin proxy pour bénéficiaire non-autonome (traçabilité complète)
2. **Liste d'attente avec cascade automatique** — PL/pgSQL
3. **Séparation inbox humaine / notifications système** — `is_human` boolean

### Critères de succès MVP
| Acteur | Critère |
|--------|---------|
| Bénévole | ≥1 mission/mois, historique heures exportable |
| Bénéficiaire | Aide concrète régulière, continuité relationnelle |
| Admin | <15 min/jour, zéro désistement non géré |
| Projet | 50 personnes pilote, ≥90% missions pourvues |
| Technique | <2-3s réponse, offline-first, conforme RGPD |

---

## 2. Architecture

### Structure réelle du monorepo

```
benevolapp/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma          ← 18 modèles, 9 ENUMs
│   │   ├── migrations/            ← migration initiale 20260401
│   │   └── policies/              ← SQL RLS (000–008)
│   └── src/server.ts
├── mobile/                        ← Expo SDK 54, React Native 0.81.5
│   ├── app/
│   │   ├── _layout.tsx            ← Root layout + session guard
│   │   ├── (auth)/                ← login.tsx, register.tsx
│   │   └── (app)/                 ← index.tsx (dashboard)
│   │       ├── missions/          ← index.tsx, [id].tsx
│   │       ├── admin/
│   │       │   ├── pending-users.tsx
│   │       │   ├── missions/      ← new.tsx, [id]/edit.tsx, _components/
│   │       │   └── interventions/ ← new.tsx (admin créer intervention)
│   │       ├── beneficiaire/      ← qr.tsx (QR permanent affiché)
│   │       └── pointage/          ← scan.tsx, fallback.tsx, confirm.tsx
│   ├── utils/
│   │   ├── supabase/client.ts     ← createClient + SecureStore adapter
│   │   └── offline-queue.ts       ← MMKV queue offline pour pointages
│   ├── babel.config.js            ← NativeWind
│   ├── metro.config.js            ← NativeWind
│   └── tailwind.config.js
├── packages/shared/
│   ├── src/schemas/               ← base.ts, user.ts, mission.ts, organisation.ts
│   └── src/types/                 ← errors.ts, query-keys.ts
├── web/                           ← Next.js 16.2.2
│   ├── app/
│   │   ├── layout.tsx + page.tsx  ← redirect → /dashboard
│   │   ├── (auth)/                ← login/, register/ + layout.tsx
│   │   ├── (app)/                 ← layout.tsx (session guard)
│   │   │   ├── dashboard/         ← page.tsx (status-aware)
│   │   │   ├── missions/          ← page.tsx, [id]/page.tsx
│   │   │   └── admin/
│   │   │       ├── layout.tsx     ← garde rôle admin
│   │   │       ├── pending-users/ ← page.tsx + _components/
│   │   │       └── missions/      ← new/, [id]/edit/, _components/
│   │   └── auth/                  ← callback/route.ts, signout/route.ts
│   ├── middleware.ts              ← export proxy
│   ├── proxy.ts                   ← session refresh + protection routes
│   └── utils/supabase/            ← client.ts, server.ts
├── turbo.json
├── pnpm-workspace.yaml
└── CLAUDE.md
```

### Décision architecturale (2026-04-03 — définitive)
**Supabase Client direct** depuis web et mobile (RLS + Auth natifs).
Express/backend uniquement pour : exports PDF/CSV (FR-05), anti-fraude async (FR-10), opérations `service_role`, webhooks.
Raisons : RLS sur 18 tables × 3 rôles × multi-tenant trop lourd à recoder en middleware. Realtime (FR-06) et Storage nécessitent le client direct.

### Flux de données
```
UI → React Hook Form (Zod) → Supabase Client → PostgreSQL (RLS) → Response → UI
[Offline mobile] Scan QR → MMKV → File d'attente → Reconnexion → Supabase
```

---

## 3. Stack technique (versions réelles installées)

| Couche | Techno | Version |
|--------|--------|---------|
| Web | Next.js App Router | 16.2.2 |
| Web UI | Tailwind CSS | v4 |
| Mobile | Expo SDK | 54.0.33 |
| Mobile | React Native | 0.81.5 |
| Mobile | Expo Router | ~4.0.21 |
| Mobile UI | NativeWind | ^4.1.23 |
| Formulaires | React Hook Form + Zod | RHF ^7, Zod ^3 |
| State serveur | TanStack Query v5 | **non installé** — prévu Epic 4+ |
| Auth | Supabase Auth + expo-secure-store | — |
| BaaS | Supabase EU West (Ireland) | PostgreSQL 15 |
| ORM | Prisma | v7.6.0 |
| Temps réel | Supabase Realtime | prévu Epic 6 |
| Offline mobile | react-native-mmkv | ^4.3.0 ✅ installé Epic 4 |
| QR Code | react-native-qrcode-svg | ^6.3.21 ✅ installé Epic 4 |
| Caméra | expo-camera | ~17.0.10 ✅ installé Epic 4 |
| Fichiers | expo-file-system | ~19.0.21 ✅ installé Epic 5 |
| Partage | expo-sharing | ~14.0.8 ✅ installé Epic 5 |
| PDF | pdfkit (backend) | ^0.15.0 ✅ installé Epic 5 |
| Monorepo | Turborepo + pnpm | 2.5.0 / 10.33.0 |
| TypeScript | strict | ^5 web, ~5.9 mobile |
| CI/CD | GitHub Actions | node 24 |
| Hébergement web | Vercel | branche web |
| Build mobile | Expo EAS | non configuré |

> ⚠️ shadcn/ui **non installé** (prévu à terme). Actuellement : Tailwind pur + composants maison.
> ⚠️ TanStack Query **non installé**. Les Server Components web fetchent directement via Supabase server client. Les écrans mobiles utilisent `useState + useEffect`.

---

## 4. Conventions de code — OBLIGATOIRES

### Base de données / Prisma
- `@@map("snake_case")` + `@map("snake_case")` sur tous les modèles
- PKs en UUID (`gen_random_uuid()`)
- `TIMESTAMPTZ` partout (jamais `DATETIME`)
- ENUMs en minuscules : `pending`, `active`, `benevole`, `draft`, etc.
- Le trigger `handle_new_user()` est géré hors Prisma → SQL Editor Supabase

### RLS
- Nommage : `{table}_{action}_{qui}` (ex : `missions_select_benevole`)
- Deny-all par défaut — whitelist explicite uniquement
- Fonctions helper SECURITY DEFINER (`get_my_role()`, `get_my_org_id()`) — voir `001_rls_helper_functions.sql`
- **Ne jamais** faire `SELECT FROM profiles WHERE id = auth.uid()` dans une policy `profiles` → récursion infinie

### TypeScript
- `strict: true` partout
- QueryKeys → uniquement `packages/shared/types/query-keys.ts`
- Erreurs → `createAppError()` — jamais `throw new Error()`
- Dates → `toISOString()` pour toute source externe

### Zod
- ≥ 2 fichiers consomment un schema → `packages/shared/schemas/`
- 1 seul fichier → schema local au composant

### Web (Next.js 16)
- `cookies()` est **async** — toujours `await cookies()`
- `params` dans les pages dynamiques est **async** — toujours `await params`
- Server Components pour le fetch, Client Components pour les interactions
- Formulaires : Client Components avec RHF + Zod

### Mobile (Expo Router)
- Entry point : `expo-router/entry` (dans `package.json`)
- Alias `@/*` → racine du package `mobile/`
- NativeWind : classes Tailwind dans `className`, importer `global.css` dans `_layout.tsx`
- SecureStore : clés sanitisées (remplacer caractères spéciaux par `_`)

### Commits
```
feat(web): ...   feat(mobile): ...   fix(...): ...   docs(...): ...   chore(...): ...
```

---

## 5. Base de données

### Tables (18 au total)
| Table | Rôle | RLS fichier |
|-------|------|-------------|
| `organisations` | Multi-tenant, FK racine | — |
| `profiles` | Données publiques, id = auth.users.id | 002 |
| `profiles_sensitive` | RGPD : email, phone, adresse, DOB, RSA | 003 |
| `types_service` | Catalogue des services | 008 |
| `adresses` | Adresses profils + missions | 008 |
| `missions` | status: draft/published/cancelled/completed | 006 |
| `mission_schedules` | Planning récurrence/horaires | 006 |
| `mission_applications` | Candidatures + liste d'attente (position) | 007 |
| `mission_interventions` | Instances réelles (planned/done/missed) | — |
| `pointages` | Check-in/out UNIQUE par intervention | — |
| `beneficiary_qr` | QR permanent bénéficiaire | — |
| `attendance_tokens` | Tokens HMAC anti-fraude | — |
| `disponibilites` | Dispo hebdo bénévoles | — |
| `validation_appointments` | RDV validation compte | 004 |
| `mission_followups` | Notes suivi admin | — |
| `admin_notes` | Notes privées admin (XOR profil/mission) | — |
| `notifications` | Système + inbox humaine (is_human) | 005 |
| `audit_logs` | Trace complète actions sensibles | — |

### Relations clés
- `profiles.managed_by_admin_id` → self-reference (proxy admin)
- `mission_applications` → UNIQUE(mission_id, benevole_id)
- `pointages` → UNIQUE(intervention_id)
- `admin_notes` → CHECK XOR(target_profile_id, target_mission_id)

---

## 6. RLS Policies — fichiers SQL

### Procédure d'application (Supabase SQL Editor)

> **Dashboard Supabase → SQL Editor → New query → coller le contenu du fichier → Run**
> Exécuter **un fichier à la fois**, attendre `Success` avant de passer au suivant.

**⚠️ RÈGLE CRITIQUE** : toujours appliquer `001` en premier (fonctions helper).
Sans `get_my_role()` et `get_my_org_id()`, tous les autres scripts échouent avec
`ERROR: 42883: function get_my_role() does not exist`.

Les fichiers SQL sont dans `backend/prisma/policies/`. Copier-coller leur contenu directement dans le SQL Editor.

### Statut d'application

| Fichier | Tables couvertes | Statut |
|---------|-----------------|--------|
| `000_rls_naming_template.sql` | — (référence) | ✅ créé |
| `001_rls_helper_functions.sql` | `get_my_role()`, `get_my_org_id()` SECURITY DEFINER | ✅ appliqué |
| `002_profiles_policies.sql` | `profiles` SELECT/UPDATE own + admin | ⏳ à appliquer |
| `003_profiles_sensitive_policies.sql` | `profiles_sensitive` SELECT own + admin | ⏳ à appliquer |
| `004_validation_appointments_policies.sql` | SELECT own/admin, INSERT/UPDATE admin | ⏳ à appliquer |
| `005_notifications_policies.sql` | SELECT own, INSERT admin, UPDATE own | ⏳ à appliquer |
| `006_missions_policies.sql` | `missions` + `mission_schedules` | ⏳ à appliquer |
| `007_mission_applications_policies.sql` | `mission_applications` | ⏳ à appliquer |
| `008_types_service_adresses_policies.sql` | `types_service`, `adresses` | ⏳ à appliquer |
| `009_mission_interventions_policies.sql` | `mission_interventions` | ✅ appliqué |
| `010_pointages_policies.sql` | `pointages` | ✅ appliqué |
| `011_beneficiary_qr_policies.sql` | `beneficiary_qr` | ✅ appliqué |
| `012_attendance_tokens_policies.sql` | `attendance_tokens` | ✅ appliqué |

Tables **sans policy encore** (Epic 7) : `disponibilites`, `mission_followups`, `admin_notes`, `audit_logs`.

### Vérification après application
Table Editor Supabase → sélectionner la table → onglet **"RLS"** → les policies doivent apparaître.
Erreur `policy already exists` → ignorable, la policy est déjà en place.

---

## 7. Supabase — Configuration requise

### Trigger `handle_new_user()` (à créer via SQL Editor)
Doit lire les metadata d'inscription et créer le profil :
```sql
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO profiles (id, organisation_id, role, first_name, status)
  VALUES (
    NEW.id,
    COALESCE((NEW.raw_user_meta_data->>'organisation_id')::uuid, '<org_id_par_defaut>'),
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'benevole'),
    NEW.raw_user_meta_data->>'first_name',
    'pending'
  );
  INSERT INTO profiles_sensitive (id, organisation_id, last_name, email)
  VALUES (
    NEW.id,
    COALESCE((NEW.raw_user_meta_data->>'organisation_id')::uuid, '<org_id_par_defaut>'),
    NEW.raw_user_meta_data->>'last_name',
    NEW.email
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
```

### Variables d'environnement

**Web** (`web/.env.local`) :
```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

**Mobile** (`mobile/.env`) :
```env
EXPO_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

**Backend / CI** (secrets GitHub uniquement) :
```env
DATABASE_URL=postgresql://postgres.[ref]:[pwd]@aws-0-eu-west-1.pooler.supabase.com:6543/postgres
DIRECT_URL=postgresql://postgres.[ref]:[pwd]@aws-0-eu-west-1.pooler.supabase.com:5432/postgres
SUPABASE_SERVICE_ROLE_KEY=eyJ...  ← JAMAIS côté client
```

---

## 8. Fonctionnalités MVP

| Ref | Feature | Status |
|-----|---------|--------|
| FR-01 | Inscription & Validation (3 rôles, validation admin, RDV) | ✅ web + mobile |
| FR-02 | Gestion missions (draft → published → completed/cancelled) | ✅ web + mobile |
| FR-03 | Candidature & Liste d'attente (position, cascade PL/pgSQL) | ✅ postuler web+mobile / cascade backlog |
| FR-04 | Pointage QR (offline-first MMKV, HMAC, fallback 6 chiffres) | ✅ mobile (build natif requis) |
| FR-05 | Export heures (PDF/CSV horodaté pour conseiller RSA) | ⏳ Epic 5 |
| FR-06 | Dashboard admin (alertes 🔴🟠🟡, Realtime) | ⏳ Epic 6 |
| FR-07 | Inbox admin→user (séparée des notifs système) | ⏳ Epic 6 |
| FR-08 | Compte co-géré (proxy admin, accès dual, logs) | ⏳ Epic 6 |
| FR-09 | RGPD (export, anonymisation, audit trail) | ✅ web |
| FR-10 | Anti-fraude (device fingerprint, IP, flagging async) | ⏳ Epic 7 |

---

## 9. Commandes

```bash
# Depuis la racine du monorepo
pnpm install              # après tout git checkout
pnpm dev                  # dev web + mobile en parallèle
pnpm build                # build production
pnpm typecheck            # TypeScript strict (tous packages)
pnpm lint                 # ESLint tous packages
pnpm test                 # Vitest (web) + Jest (mobile)
pnpm new-feature          # scaffold feature

# Web uniquement
cd web && npx tsc --noEmit

# Mobile uniquement
cd mobile && npx tsc --noEmit
```

---

## 10. État d'avancement

| Epic / Story | Titre | Web | Mobile |
|---|---|---|---|
| **Epic 1** | Fondation | ✅ | ✅ |
| Story 1.1 | Init monorepo Turborepo | ✅ | ✅ |
| Story 1.2 | Supabase + Prisma (18 tables) | ✅ | ✅ |
| Story 1.3 | CI/CD GitHub Actions | ✅ | ✅ |
| Story 1.4 | Déploiement prod (Vercel) | ✅ | — |
| Story 1.5 | Monitoring + Backup | backlog | backlog |
| **Epic 2** | Accès à la Plateforme | ✅ | ✅ |
| Story 2.1 | Supabase client + session proxy | ✅ | ✅ |
| Story 2.2 | Auth screens (login, register, callback) | ✅ | ✅ |
| Story 2.3 | Admin validation + RDV planifiable | ✅ | ✅ |
| Story 2.4 | Dashboard status-aware (pending/rejected) | ✅ | ✅ |
| **Epic 3** | Gestion des Missions | ✅ | ✅ |
| Story 3.1 | Liste missions (role-aware) | ✅ | ✅ |
| Story 3.2 | Admin créer/éditer mission + planning | ✅ | ✅ |
| Story 3.3 | Bénévole — postuler + actions statut admin | ✅ | ✅ |
| **Epic 4** | Présence & Pointage QR | ⏳ web partiel | ✅ mobile |
| Story 4.1 | Génération QR bénéficiaire | — | ✅ (`beneficiaire/qr.tsx`) |
| Story 4.2 | Admin — créer intervention planifiée | ✅ (`admin/interventions/new/`) | ✅ (`admin/interventions/new.tsx`) |
| Story 4.3 | Bénévole — scan QR + fallback 6 chiffres | — (caméra mobile uniquement) | ✅ (`pointage/scan.tsx`, `pointage/fallback.tsx`) |
| Story 4.4 | Confirmation pointage + file d'attente offline | — (mobile uniquement) | ✅ (`pointage/confirm.tsx`, `offline-queue.ts`) |
| Story 4.5 | RLS Epic 4 (interventions, pointages, qr, tokens) | — | ✅ (009–012 créés — à appliquer SQL Editor) |
| **Epic 5** | Suivi & Valorisation Heures | ⏳ web partiel | ✅ mobile (CSV) |
| Story 5.1 | Bénévole — historique heures + export CSV | ✅ (`benevole/mes-heures/`) | ✅ (`benevole/mes-heures.tsx`) |
| Story 5.2 | Backend export CSV service_role | — | ✅ (`backend/src/routes/export.ts`) |
| Story 5.3 | Export PDF (RSA conseiller) | ⏳ | ⏳ |
| **Epic 6** | Administration & Communication | ✅ web | ✅ mobile |
| Story 6.1 | Dashboard admin alertes 🔴🟠🟡 | ✅ (`admin/dashboard/`) | ✅ (`admin/dashboard.tsx`) |
| Story 6.2 | Realtime (abonnements live) | ✅ (dans `dashboard-stats.tsx`) | ✅ (dashboard auto-refresh) |
| Story 6.3 | Inbox admin→user (is_human) | ✅ (`inbox/`, `admin/envoyer-message/`) | ✅ (`inbox/`, `admin/send-message.tsx`) |
| Story 6.4 | Compte co-géré (proxy admin) | ✅ (`admin/proxy-beneficiaire/`) | ✅ (`admin/proxy-beneficiaire.tsx`) |
| **Epic 7** | Conformité RGPD | ✅ web | backlog |
| Story 7.1 | Export données perso (JSON) | ✅ (`mon-compte/export-donnees/`) | — |
| Story 7.2 | Droit à l'oubli (anonymisation + suppression) | ✅ (`api/rgpd/anonymize/`) | — |
| Story 7.3 | Audit trail admin | ✅ (`admin/audit-logs/`) | — |

---

## 11. Documents de référence

| Document | Chemin |
|----------|--------|
| PRD | `_bmad-output/planning-artifacts/prd.md` |
| Architecture | `_bmad-output/planning-artifacts/architecture.md` |
| Epics & Stories | `_bmad-output/planning-artifacts/epics.md` |
| Synthèse complète | `PROJET_OVERVIEW.md` |

> ⚠️ Le dossier `_bmad-output/` n'est pas présent dans le repo git (gitignored ou supprimé). Se baser sur ce CLAUDE.md.

---

## 12. Pièges connus

### Git / Monorepo
- **Switch de branche + pnpm** → `pnpm install` obligatoire après tout `git checkout` (package.json diffèrent entre branches)
- **Sync CLAUDE.md** → ne pas oublier de propager les mises à jour entre branches : `git show web:CLAUDE.md > CLAUDE.md`
- **RLS policies** → commitées sur la branche où elles ont été créées ; les propager sur l'autre branche avec `git show <branche>:backend/prisma/policies/<fichier> > ...`

### Supabase / BDD
- **Prisma ne gère pas le RLS** → policies en SQL brut dans `backend/prisma/policies/`, appliquées manuellement via SQL Editor
- **Trigger `handle_new_user()`** → impossible via Prisma, créer via SQL Editor. Doit extraire `raw_user_meta_data->>'role'`, `first_name`, `last_name`
- **Récursion RLS sur `profiles`** → utiliser `get_my_role()` et `get_my_org_id()` (SECURITY DEFINER) — jamais de `SELECT FROM profiles` dans une policy `profiles`
- **Ordre d'application RLS** → `001` en premier (fonctions helper), puis les autres dans l'ordre numérique. **Sans `001`, tous les scripts échouent** avec `ERROR: 42883: function get_my_role() does not exist`
- **Supabase region = irréversible** → EU West (Ireland) obligatoire (RGPD)
- **ENUMs PostgreSQL** → `CREATE TYPE ... AS ENUM`, jamais inline
- **`DATETIME` → `TIMESTAMPTZ`** → toujours avec timezone

### TypeScript / Next.js
- **`cookies()` async (Next.js 16)** → toujours `await cookies()`
- **`params` async (Next.js 16)** → toujours `await params` dans les pages dynamiques
- **`as never` cast Supabase** → `.select()` avec jointure imbriquée mal inféré. Cast `as unknown as Type[]` acceptable MVP ; typer proprement avec `Database` généré par Supabase CLI si besoin
- **`tsconfig.json` backend** → `"include": ["src/**/*"]` pour éviter les erreurs hors `rootDir`

### Mobile (Expo / NativeWind)
- **SecureStore** → les clés ne peuvent contenir que `[a-zA-Z0-9._-]`. Sanitiser avec `.replace(/[^a-zA-Z0-9._-]/g, '_')`
- **NativeWind v4** → nécessite `babel.config.js` + `metro.config.js` + `global.css` importé dans `_layout.tsx`
- **Expo Router entry point** → `"main": "expo-router/entry"` dans `package.json` (remplace `index.ts`)
- **`contentContainerClassName`** → utiliser sur `ScrollView` pour les classes NativeWind du container

### Epic 4 — Pointage QR
- **`expo-camera` nécessite un plugin** → `app.json` doit déclarer `["expo-camera", { ... }]` sinon crash au démarrage
- **`react-native-mmkv`** → nécessite un build natif (incompatible Expo Go) ; utiliser `expo-dev-client` ou EAS Build
- **Vérification HMAC** → doit se faire côté serveur (`service_role`) pour ne pas exposer la clé secrète ; le client mobile envoie le token brut
- **`beneficiary_qr`** → le QR encode `{ beneficiary_id, token }` — le token est permanent (rotatable par admin)
- **`attendance_tokens`** → tokens HMAC à usage unique, expiration configurable ; vérifier côté backend avant d'insérer dans `pointages`
- **`react-native-mmkv` v4** → API changée : `MMKV` est un type uniquement. Utiliser `createMMKV({ id })` à la place de `new MMKV({ id })`

### Epic 5 — Export heures
- **`expo-file-system` + `expo-sharing`** → nécessitent un build natif (incompatible Expo Go) — même contrainte qu'expo-camera et react-native-mmkv
- **Versions SDK 54** → `expo-file-system@~19.0.21` et `expo-sharing@~14.0.8` — toujours utiliser `npx expo install <package>` plutôt que de deviner les versions, Expo résout automatiquement la compatibilité SDK
- **`X-Export-Secret`** → variable d'environnement backend (`EXPORT_SECRET`) à ajouter aux secrets GitHub et dans `.env`
- **Export CSV mobile** : les jointures Supabase imbriquées peuvent retourner des tableaux ou objets selon la query — utiliser le pattern `Array.isArray(x) ? x[0] : x` pour normaliser

### Divers
- **`xss-clean` deprecated** → warning npm non bloquant sur le backend

---

## 13. Journal de développement

> Le détail complet (fichiers créés/modifiés, erreurs, décisions) est dans **[`DEV_LOG.md`](./DEV_LOG.md)**.
> Cette section ne contient que le résumé par session.

| Date | Branche | Résumé | Statut |
|------|---------|--------|--------|
| 2026-04-03 | web+mobile | Fondation : monorepo, Prisma 18 tables, CI/CD, décision archi Supabase direct | ✅ |
| 2026-04-04 S1 | web+mobile | Epic 2 (auth, dashboard) + Epic 3 (missions, candidatures) + RLS 001–008 | ✅ |
| 2026-04-04 S2 | mobile | Epic 4 complet : scan QR, fallback, confirm, file offline MMKV, RLS 009–012, section interventions admin | ✅ |
| 2026-04-04 S3 | mobile | Epic 5 Story 5.1+5.2 (export CSV mobile + backend) + Epic 6 Story 6.1 (dashboard admin alertes) | ✅ |

| 2026-04-05 | web | Epic 5.1 (mes-heures + export CSV) + Epic 6.1 (dashboard admin alertes + Realtime) | ✅ |

| 2026-04-05 S2 | web | Epic 6.3 (inbox + envoi message) + 6.4 (proxy bénéficiaire) + 4.2 (planifier intervention) | ✅ |
| 2026-04-05 S3 | web | Epic 7 RGPD : export données JSON, droit à l'oubli (anonymize route), audit trail admin | ✅ |

**Prochaine étape :** Story 5.3 (PDF export web) + Epic 7 RGPD côté mobile (backlog).
