# Bilan récapitulatif — BénévolApp

> Dernière mise à jour : 2026-04-03

---

## 1. Ce que le projet est censé être

**BénévolApp** — Plateforme de bénévolat encadré pour une association. Trois acteurs :

- **Bénéficiaires fragiles** — reçoivent de l'aide concrète
- **Bénévoles allocataires RSA** — rendent service, leurs heures sont valorisées pour le suivi RSA
- **Administrateurs** — coordonnent, valident, peuvent agir en proxy pour un bénéficiaire non-autonome

Différenciateurs : liste d'attente automatique (PL/pgSQL), compte co-géré (proxy admin), inbox humaine séparée des notifications système.

---

## 2. Décisions architecturales prises

### Option A retenue (03/04/2026)

- **web + mobile → Supabase Client direct** : RLS natif PostgreSQL, Auth Supabase, Realtime, Storage
- **backend Express → rôle limité** : exports PDF/CSV (FR-05), anti-fraude async (FR-10), opérations `service_role`, webhooks Supabase
- **Raison** : 18 tables × 3 rôles × multi-tenant → recoder l'autorisation en middleware Express aurait été trop risqué et cassé les garanties RGPD

### Stack fixée

| Couche | Choix |
|---|---|
| Monorepo | Turborepo v2.5 + pnpm v10.33 |
| Web | Next.js 16, App Router, Tailwind v4, shadcn/ui |
| Mobile | Expo SDK 54, React Native 0.81.5, Expo Router, NativeWind v4 |
| Auth/BaaS | Supabase — EU West Ireland (RGPD) |
| ORM | Prisma v7.6 (backend uniquement) |
| Schémas partagés | Zod dans `packages/shared/` |
| State serveur | TanStack Query v5 |
| CI/CD | GitHub Actions sur Node.js 24 |

---

## 3. Ce qui a été implémenté

### Story 1.1 — Init monorepo Turborepo ✅

**Structure créée (branche `web`) :**

```
benevolapp/
├── web/               ← Next.js 16, App Router, Tailwind v4
├── mobile/            ← Expo SDK 54, RN 0.81.5
├── backend/           ← Express + Prisma
├── packages/
│   └── shared/        ← Zod schemas + types
├── package.json       ← workspace root, scripts Turborepo
├── pnpm-workspace.yaml
└── turbo.json
```

**`turbo.json`** — Pipeline configuré pour 5 tâches :

| Tâche | Comportement |
|---|---|
| `build` | Dépend des builds amont (`^build`), outputs `.next/**` et `dist/**` |
| `dev` | Mode watch, pas de cache, persistent |
| `typecheck` | Dépend des typechecks amont |
| `lint` | Indépendant |
| `test` | Dépend des builds amont, output `coverage/**` |

**Scripts racine disponibles :**

```bash
pnpm dev          # Lance tous les packages en parallèle
pnpm build        # Build production (web + backend)
pnpm typecheck    # TypeScript strict sur tous les packages
pnpm lint         # ESLint sur tous les packages
pnpm test         # Tests web (Vitest) + mobile (Jest)
pnpm new-feature  # Scaffold feature (scripts/scaffold-feature.js)
```

**`packages/shared/`** — Source unique de vérité Zod :

| Fichier | Contenu |
|---|---|
| `schemas/base.ts` | `uuidSchema`, `timestampSchema`, `paginationSchema` |
| `schemas/user.ts` | `userRoleSchema` (admin/benevole/beneficiaire), `profileSchema`, `profileSensitiveSchema` |
| `schemas/organisation.ts` | `organisationSchema` |
| `schemas/mission.ts` | `missionStatusSchema`, `missionSchema`, `createMissionSchema` |
| `types/query-keys.ts` | `queryKeys` (profiles, missions, organisations, applications, notifications) |
| `types/errors.ts` | `AppErrorCodes`, `AppError`, `createAppError()` |

Règle sur les erreurs : **jamais `throw new Error()`** — toujours `createAppError()`.

**Template RLS** : `backend/prisma/policies/000_rls_naming_template.sql`

7 patterns documentés :

| Pattern | Usage |
|---|---|
| `owner` | L'utilisateur accède à ses propres lignes |
| `benevole` | Accès limité à sa propre organisation |
| `beneficiaire` | Accès limité à sa propre organisation |
| `admin ALL` | Lecture + écriture sur toute son organisation |
| `insert` | `WITH CHECK` obligatoire (jamais seulement `USING`) |
| `update` | `USING` + `WITH CHECK` combinés |
| `proxy_admin` | Admin peut lire/écrire pour le bénéficiaire qu'il gère (`managed_by_admin_id`) |

+ Checklist pré-migration et liste des tables accédées via `service_role`.

**Peer deps alignées** : `@types/react ^19.2.0` partout, `pnpm-lock.yaml` unique à la racine, build scripts Prisma/esbuild autorisés via `onlyBuiltDependencies`.

---

### Story 1.2 — Supabase + Prisma base ✅ (branche `main`)

**Schéma Prisma complet — 9 ENUMs :**

| ENUM | Valeurs |
|---|---|
| `UserRole` | admin, benevole, beneficiaire |
| `AccountStatus` | pending, active, suspended, rejected |
| `MissionStatus` | draft, published, cancelled, completed |
| `ApplicationStatus` | pending, accepted, rejected, waitlisted |
| `InterventionStatus` | planned, done, missed |
| `RecurrenceType` | once, weekly, biweekly, monthly |
| `AppointmentType` | remote, in_person |
| `AppointmentStatus` | scheduled, completed, cancelled |
| `DayOfWeek` | monday → sunday |

**18 modèles :**

| Modèle | Rôle |
|---|---|
| `Organisation` | Racine multi-tenant, FK de toutes les autres tables |
| `Profile` | Données publiques, `id` = `auth.users.id` |
| `ProfileSensitive` | RGPD : email, phone, adresse, DOB, statut RSA |
| `TypesService` | Catalogue des services proposés |
| `Adresse` | Adresses (profils + missions) |
| `Mission` | Missions avec cycle de vie draft → completed |
| `MissionSchedule` | Planning : récurrence, jours, horaires |
| `MissionApplication` | Candidatures bénévoles + liste d'attente ordonnée (`position`) |
| `MissionIntervention` | Instances réelles de missions (date + status) |
| `Pointage` | Check-in/check-out par intervention (UNIQUE intervention_id) |
| `BeneficiaryQr` | QR code permanent par bénéficiaire |
| `AttendanceToken` | Tokens HMAC anti-fraude, usage unique |
| `Disponibilite` | Disponibilités hebdomadaires bénévoles |
| `ValidationAppointment` | RDV de validation de compte (remote/in_person) |
| `MissionFollowup` | Notes de suivi admin par mission |
| `AdminNote` | Notes privées admin (cible : profil XOR mission) |
| `Notification` | Système + inbox humaine (`is_human` boolean) |
| `AuditLog` | Trace complète des actions sensibles (JSONB metadata) |

**Conventions appliquées sur tout le schéma :**

- `@@map("snake_case")` + `@map("snake_case")` sur tous les modèles
- PKs en UUID : `@default(dbgenerated("gen_random_uuid()"))`
- Dates en `DateTime @db.Timestamptz()` — jamais `DATETIME`
- `organisation_id` présent sur toutes les tables sauf `audit_logs` et `beneficiary_qr`

Migration initiale générée et appliquée sur Supabase. Client Prisma généré dans `backend/generated/prisma/` avec un fichier par modèle.

---

### Story 1.3 — CI/CD GitHub Actions ✅ (branche `main`)

Pipeline déclenché sur `push` et `pull_request` vers `main` :

| Étape | Commande |
|---|---|
| typecheck | `tsc --noEmit` sur le backend |
| lint | ESLint backend avec `typescript-eslint` |
| audit | `npm audit --audit-level=high` |

- Node.js 24 (corrigé depuis 20 après un premier échec CI)
- `prisma generate` avec variables d'env factices en CI (Prisma exige `DATABASE_URL` même pour generate)
- ESLint configuré avec `typescript-eslint` + `@eslint/js`

---

### Backend Express — Structure de base ✅

`backend/src/server.ts` — Squelette Express :

| Middleware | Rôle |
|---|---|
| `helmet` | Headers de sécurité HTTP |
| `cors` | Cross-Origin Resource Sharing |
| `express.json()` | Parsing JSON |
| `express-rate-limit` | Protection contre le bruteforce |
| `hpp` | Protection HTTP Parameter Pollution |
| `xss-clean` | Nettoyage des entrées (deprecated, à remplacer) |

Port via `process.env.PORT` (corrigé : était hardcodé à 3000).
Pas de routes CRUD — c'est intentionnel (Option A).

---

## 4. État des branches git

```
main  ←── CI/CD + Prisma 18 modèles + ESLint + RLS template + CLAUDE.md
           (commits : 0ffa0d7 → de0f904, 13 commits)

web   ←── Turborepo + web/ (Next.js) + mobile/ (Expo) + packages/shared/
           (diverge de main au commit b1ade89, très tôt)

mobile ←── vide (3 commits initiaux seulement)
backend ←── vide (3 commits initiaux seulement)
```

**Point critique** : `main` et `web` ont divergé tôt. La branche `web` n'a **pas** :
- Le schéma Prisma complet (13 lignes vs ~500)
- Le pipeline CI/CD GitHub Actions
- Le CLAUDE.md
- Le template RLS

Il faudra **merger `main` dans `web`** avant de déployer sur Vercel.

---

## 5. Ce qui reste à faire

### Epic 1 — Fondation (in-progress)

| Story | Tâche | Status |
|---|---|---|
| 1.1 | Init monorepo Turborepo | ✅ |
| 1.2 | Supabase + Prisma base | ✅ |
| 1.3 | CI/CD GitHub Actions | ✅ |
| 1.4 | Merger `main` dans `web` | A faire en premier |
| 1.4 | Déploiement web sur Vercel (écran vide) | backlog |
| 1.5 | Monitoring (Sentry ou équivalent) | backlog |
| 1.5 | Backup Supabase | backlog |

### Epic 2 — Accès à la plateforme (backlog)

FR-01 : Inscription, validation admin, 3 rôles, RDV planifiable.

### Epics 3–7 (backlog)

Gestion missions, Pointage QR, Export heures, Administration, RGPD.

---

## 6. Pièges connus

| Piège | Solution |
|---|---|
| `xss-clean` deprecated | Remplacer par `xss` ou middleware custom |
| Prisma ne gère pas le RLS | Policies SQL brut dans migrations custom (`prisma migrate dev --create-only`) |
| Trigger `handle_new_user()` | SQL Editor Supabase uniquement, pas Prisma |
| `service_role` key | GitHub Actions secrets uniquement, jamais côté client |
| Supabase region EU West Ireland | Irréversible à la création — obligatoire RGPD |
| ENUMs PostgreSQL | `CREATE TYPE ... AS ENUM`, jamais inline |
| Dates | Toujours `TIMESTAMPTZ`, jamais `DATETIME` |
| `tsconfig.json` backend | `"include": ["src/**/*"]` pour éviter les erreurs hors `rootDir` |
