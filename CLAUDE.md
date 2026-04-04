# CLAUDE.md — BénévolApp

> Fichier lu automatiquement par Claude Code à chaque session.
> Source unique de vérité pour le contexte, les conventions et l'état du projet.

---

## ⚠️ RÈGLES ABSOLUES — LIRE EN PREMIER

1. **Branche par plateforme** — web → branche `web` | mobile → branche `mobile`. Vérifier avec `git branch` avant tout travail.
2. **Après chaque `git checkout`** → relancer `pnpm install` depuis la racine (les `package.json` diffèrent entre branches).
3. **Notes et remarques** → toujours écrire dans ce fichier (section Pièges ou Notes de session), jamais seulement dans la réponse chat.
4. **Sync CLAUDE.md entre branches** → après toute mise à jour, propager via `git show <branche>:CLAUDE.md > CLAUDE.md` sur l'autre branche.

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
│   │       └── admin/
│   │           ├── pending-users.tsx
│   │           └── missions/      ← new.tsx, [id]/edit.tsx, _components/
│   ├── utils/supabase/client.ts   ← createClient + SecureStore adapter
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
| Offline mobile | react-native-mmkv | **non installé** — prévu Epic 4 |
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

**Ordre d'application obligatoire** dans Supabase SQL Editor :

| Fichier | Tables couvertes | Statut |
|---------|-----------------|--------|
| `000_rls_naming_template.sql` | — (référence) | ✅ créé |
| `001_rls_helper_functions.sql` | `get_my_role()`, `get_my_org_id()` SECURITY DEFINER | ⏳ à appliquer |
| `002_profiles_policies.sql` | `profiles` SELECT/UPDATE own + admin | ⏳ à appliquer |
| `003_profiles_sensitive_policies.sql` | `profiles_sensitive` SELECT own + admin | ⏳ à appliquer |
| `004_validation_appointments_policies.sql` | SELECT own/admin, INSERT/UPDATE admin | ⏳ à appliquer |
| `005_notifications_policies.sql` | SELECT own, INSERT admin, UPDATE own | ⏳ à appliquer |
| `006_missions_policies.sql` | `missions` + `mission_schedules` | ⏳ à appliquer |
| `007_mission_applications_policies.sql` | `mission_applications` | ⏳ à appliquer |
| `008_types_service_adresses_policies.sql` | `types_service`, `adresses` | ⏳ à appliquer |

Tables **sans policy encore** (Epic 4+) : `mission_interventions`, `pointages`, `beneficiary_qr`, `attendance_tokens`, `disponibilites`, `mission_followups`, `admin_notes`, `audit_logs`.

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
| FR-04 | Pointage QR (offline-first MMKV, HMAC, fallback 6 chiffres) | ⏳ Epic 4 |
| FR-05 | Export heures (PDF/CSV horodaté pour conseiller RSA) | ⏳ Epic 5 |
| FR-06 | Dashboard admin (alertes 🔴🟠🟡, Realtime) | ⏳ Epic 6 |
| FR-07 | Inbox admin→user (séparée des notifs système) | ⏳ Epic 6 |
| FR-08 | Compte co-géré (proxy admin, accès dual, logs) | ⏳ Epic 6 |
| FR-09 | RGPD (export, anonymisation, audit trail) | ⏳ Epic 7 |
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
| **Epic 4** | Présence & Pointage QR | backlog | backlog |
| **Epic 5** | Suivi & Valorisation Heures | backlog | backlog |
| **Epic 6** | Administration & Communication | backlog | backlog |
| **Epic 7** | Conformité RGPD | backlog | backlog |

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
- **Ordre d'application RLS** → `001` en premier (fonctions helper), puis `002`–`008` dans l'ordre
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

### Divers
- **`xss-clean` deprecated** → warning npm non bloquant sur le backend

---

## 13. Notes de session

### 2026-04-04 — Session principale

**Epic 2 — Accès à la Plateforme (web + mobile)**
- Web : middleware, auth pages (login/register/callback/signout), dashboard, admin pending-users + RDV
- Mobile : Expo Router migration, auth screens, dashboard status-aware, admin pending-users
- RLS : fichiers 001–005 créés

**Epic 3 — Gestion des missions (web + mobile)**
- Web : `/missions` liste, `/missions/[id]` détail, `/admin/missions/new` + `/admin/missions/[id]/edit`, bouton postuler, actions statut
- Mobile : mêmes écrans, formulaire mission avec sélecteurs inline (pas de picker externe)
- RLS : fichiers 006–008 créés

**Décisions techniques prises :**
- Pas de TanStack Query pour l'instant — Server Components web + useState/useEffect mobile suffisent pour les Epics 2–3
- Pas de shadcn/ui — Tailwind pur pour garder le bundle léger
- Formulaire mobile mission : TextInput pour les dates/heures (YYYY-MM-DD / HH:MM) plutôt qu'ajouter un date picker externe

**Prochaine étape : Epic 4 — Présence & Pointage QR**
- `react-native-mmkv` à installer sur mobile (offline-first)
- Génération QR bénéficiaire → table `beneficiary_qr`
- Scan QR bénévole → vérification HMAC → pointage
- Fallback code 6 chiffres
- RLS : `mission_interventions`, `pointages`, `beneficiary_qr`, `attendance_tokens`

### 2026-04-03

- Architecture Supabase Client direct décidée (vs proxy Express)
- Schéma Prisma complet (18 modèles, 9 ENUMs) + migration initiale
- CI/CD GitHub Actions, ESLint backend, branches git créées
- Template RLS naming (`000_rls_naming_template.sql`)
