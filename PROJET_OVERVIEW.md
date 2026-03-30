# BénévolApp — Document de synthèse complet

> Généré le 2026-03-30 · Analyse complète du projet, de son architecture, de sa stack technique et de sa base de données.

---

## Table des matières

1. [Vue d'ensemble du projet](#1-vue-densemble-du-projet)
2. [Contexte et objectifs](#2-contexte-et-objectifs)
3. [Acteurs et rôles](#3-acteurs-et-rôles)
4. [Fonctionnalités MVP](#4-fonctionnalités-mvp)
5. [Stack technique](#5-stack-technique)
6. [Architecture du projet](#6-architecture-du-projet)
7. [Installation et setup](#7-installation-et-setup)
8. [Base de données — Analyse et version corrigée](#8-base-de-données--analyse-et-version-corrigée)
9. [Relations entre tables](#9-relations-entre-tables)
10. [État d'avancement](#10-état-davancement)

---

## 1. Vue d'ensemble du projet

**BénévolApp** est une plateforme de **bénévolat encadré** conçue pour mettre en relation trois types d'acteurs :

- Des **bénéficiaires fragiles** ayant besoin d'aide concrète et régulière
- Des **bénévoles allocataires RSA** s'engageant dans une démarche d'activation sociale
- Des **administrateurs** garants de la conformité et de la bonne coordination

Le projet est une application **greenfield** (développée de zéro), organisée en **monorepo Turborepo** comprenant :
- Une **application mobile** (iOS + Android) via Expo/React Native pour les bénévoles et bénéficiaires
- Une **interface web d'administration** via Next.js pour les coordinateurs

Le modèle de BénévolApp est intentionnellement différent des plateformes classiques : il repose sur une **entraide horizontale**, où les bénévoles sont eux-mêmes en situation de précarité. Le bénévolat devient un levier d'activation sociale et de valorisation des compétences — pas un rapport "forts vers faibles".

---

## 2. Contexte et objectifs

### Problème adressé

Les structures d'accompagnement social peinent à coordonner le bénévolat encadré :
- Pas d'outil unifié pour gérer les missions, les candidatures et la présence
- Les bénéficiaires non-autonomes sont mal couverts (pas de proxy admin)
- Les bénévoles RSA n'ont pas de moyen simple d'exporter leurs heures pour leur conseiller
- Les désistements de bénévoles créent des missions non pourvues sans mécanisme automatique

### Proposition de valeur unique

Trois différenciateurs architecturaux clés dans BénévolApp :

1. **Compte co-géré** — Un admin peut agir en proxy pour un bénéficiaire non-autonome numériquement, avec traçabilité complète
2. **Liste d'attente ordonnée avec cascade automatique** — Quand un bénévole se désiste, le suivant en liste est automatiquement notifié et promu via PL/pgSQL
3. **Séparation stricte inbox humaine / notifications système** — Les communications intentionnelles admin→utilisateur sont isolées des alertes automatiques

### Critères de succès du MVP

| Acteur | Critère |
|--------|---------|
| Bénévole | ≥1 mission/mois, historique heures exportable, compétences reconnues |
| Bénéficiaire | Aide concrète régulière, continuité relationnelle, suivi assuré |
| Admin | <15 min de gestion/jour, zéro mission avec désistement non géré |
| Projet | 50 personnes en phase pilote, ≥90% de missions pourvues |
| Technique | <2-3 sec de temps de réponse, offline-first, conforme RGPD |

---

## 3. Acteurs et rôles

### Bénéficiaire

Personne fragilisée ayant besoin d'un service régulier. Peut être autonome ou co-géré par un admin.

- Reçoit des notifications de missions et de présence
- Peut consulter son historique de missions reçues
- Peut exporter ses données personnelles (RGPD)
- Son compte peut être géré par un admin proxy si non-autonome numériquement

### Bénévole RSA

Allocataire s'engageant dans une démarche d'activation sociale via le bénévolat.

- Consulte et postule aux missions disponibles
- Peut être en liste d'attente (cascade automatique en cas de désistement)
- Pointe sa présence via QR code offline-first avec fallback code 6 chiffres
- Exporte ses heures (PDF/CSV) pour justifier auprès de son conseiller RSA
- Déclare ses disponibilités hebdomadaires

### Administrateur

Coordinateur garant de la conformité et de la qualité du service.

- Valide les inscriptions (rendez-vous de validation REMOTE ou IN_PERSON)
- Crée, approuve et publie les missions
- Assigne les bénévoles ou gère les candidatures
- Dashboard temps réel avec alertes à 3 niveaux (🔴 désistements / 🟠 bénéficiaires sans mission / 🟡 nouvelles inscriptions)
- Peut agir en proxy pour les bénéficiaires non-autonomes (compte co-géré)
- Communique via une inbox dédiée séparée des notifications système
- Accède aux notes privées et aux logs d'audit

---

## 4. Fonctionnalités MVP

| Ref | Fonctionnalité | Description |
|-----|---------------|-------------|
| FR-01 | Inscription & Validation | 3 rôles distincts, formulaire adapté, validation admin obligatoire, rendez-vous de validation planifiable |
| FR-02 | Gestion des missions | Création → Approbation → Publication ; statuts (draft / published / cancelled / completed) |
| FR-03 | Candidature & Liste d'attente | Candidature bénévole, liste d'attente ordonnée, cascade automatique PL/pgSQL, assignation admin |
| FR-04 | Pointage QR code | Scan arrivée/départ offline-first via MMKV, token HMAC signé, fallback code 6 chiffres |
| FR-05 | Export heures | Historique missions exportable PDF/CSV horodaté (utilisable dans démarche RSA) |
| FR-06 | Dashboard admin | Alertes 3 niveaux, advisory lock UI, vue temps réel via Supabase Realtime |
| FR-07 | Inbox admin→utilisateur | Inbox humaine séparée des notifications système, communications tracées |
| FR-08 | Compte co-géré | Admin proxy pour bénéficiaires non-autonomes, accès dual, log + notes traçables |
| FR-09 | Conformité RGPD | Export données personnelles, suppression/anonymisation, audit trail complet |
| FR-10 | Anti-fraude géolocalisation | Collecte device fingerprint + IP + user_agent, flagging async pour admin |

---

## 5. Stack technique

### Frontend — Application mobile

| Composant | Technologie | Version |
|-----------|-------------|---------|
| Framework | Expo + React Native | SDK 54 / RN 0.76.9 |
| Navigation | Expo Router | file-based |
| Styling | NativeWind | v4 |
| Formulaires | React Hook Form + Zod | |
| State serveur | TanStack Query | v5 |
| Auth | Supabase + expo-secure-store | v14 |
| Stockage offline | react-native-mmkv | |
| Build | Expo EAS Build | |
| OTA | Expo EAS Update | |
| Tests | Jest + @testing-library/react-native | |

### Frontend — Interface web admin

| Composant | Technologie | Version |
|-----------|-------------|---------|
| Framework | Next.js | 15 (App Router) |
| Styling | Tailwind CSS | v4 |
| UI | shadcn/ui | |
| Formulaires | React Hook Form + Zod | |
| State serveur | TanStack Query | v5 |
| Auth | @supabase/ssr | |
| Icônes | lucide-react | |
| Tests | Vitest + @testing-library/react | |

### Backend & Infrastructure

| Composant | Technologie | Détails |
|-----------|-------------|---------|
| BaaS | Supabase | EU West (Ireland) — RGPD |
| Base de données | PostgreSQL | v15, RLS deny-all |
| Auth | Supabase Auth | OAuth + email/password |
| ORM | Prisma | v6.3.0 |
| Temps réel | Supabase Realtime | Dashboard admin |
| Edge Functions | PL/pgSQL | Cascade liste d'attente, validation QR |
| Stockage fichiers | Supabase Storage | Photos profil |

### Transversal

| Composant | Technologie | Détails |
|-----------|-------------|---------|
| Validation | Zod | v3.24.0 — partagé web/mobile/backend |
| Typage | TypeScript | v5.7 strict |
| Monorepo | Turborepo | v2.5.0 |
| Package manager | pnpm | v10.33.0 workspaces |
| CI/CD | GitHub Actions | typecheck, lint, audit, RLS check |
| Hébergement web | Vercel | Auto-deploy |
| Linting | ESLint | v9, flat config |

---

## 6. Architecture du projet

### Structure des répertoires

```
benevolapp/
├── apps/
│   ├── mobile/              ← Expo React Native (iOS/Android)
│   │   └── app/             ← Expo Router (file-based)
│   └── web/                 ← Next.js 15 (admin)
│       └── app/             ← App Router Next.js
│
├── packages/
│   └── shared/              ← Package partagé (source unique de vérité)
│       ├── prisma/
│       │   └── schema.prisma
│       ├── schemas/         ← Zod schemas (base, user, organisation, mission)
│       └── types/           ← TanStack QueryKeys, AppErrorCodes, helpers dates
│
├── scripts/
│   ├── scaffold-feature.js  ← Générateur features (pnpm new-feature)
│   └── check-rls.js         ← Vérification RLS (CI bloquant)
│
├── .github/workflows/
│   └── ci.yml               ← Pipeline GitHub Actions
│
├── CLAUDE.md                ← Règles pour agents IA
├── .env.example
├── turbo.json
└── pnpm-workspace.yaml
```

### Principes architecturaux

1. **Multi-tenant dès le MVP** — `organisation_id` UUID sur toutes les tables ; isolation complète par RLS
2. **Offline-first mobile** — MMKV + file d'attente sync différée pour les pointages QR
3. **RLS deny-all par défaut** — Chaque politique PostgreSQL est explicitement whitelistée
4. **Zod = source unique de vérité** — Les schemas dans `packages/shared/` sont utilisés côté web, mobile et backend
5. **Pas d'API proxy** — Supabase Client directement depuis Web/Mobile (pas d'Express intermédiaire)
6. **Séparation RGPD** — Données sensibles isolées dans `profiles_sensitive`

### Flux de données

```
UI (Web ou Mobile)
    ↓
React Hook Form (validation locale via Zod)
    ↓
TanStack Query (useQuery / useMutation)
    ↓
Supabase Client
    ↓
Supabase REST API
    ↓
PostgreSQL (RLS filtre par organisation_id + rôle)
    ↓
Response → Cache TanStack Query → UI re-render
```

**Flux offline (Mobile — pointage QR) :**

```
Scan QR
    ↓
MMKV (stockage local React Native)
    ↓
File d'attente offline
    ↓
Reconnexion → sync Supabase
    ↓
PostgreSQL (idempotence via UNIQUE constraints)
```

### Conventions de développement (extraites de CLAUDE.md)

- DB : `@@map` + `@map` obligatoires sur tous les modèles Prisma (snake_case en base)
- QueryKeys : uniquement dans `packages/shared/types/query-keys.ts`
- Erreurs : `createAppError()` — jamais `throw new Error()`
- Zod : `packages/shared/schemas/` si ≥ 2 fichiers consommateurs, sinon local
- Dates : `toISOString()` pour toute source externe
- Async : `useSuspenseQuery` + `Suspense` + `ErrorBoundary`
- Tests : co-localisés avec le composant (`Component.test.tsx`)
- RLS naming : `{table}_{action}_{qui}`

---

## 7. Installation et setup

### Prérequis

- Node.js ≥ 20.x
- pnpm ≥ 10.33.0 (`npm install -g pnpm`)
- Compte Supabase (gratuit)
- Compte Vercel (gratuit, pour le web)
- Compte Expo (gratuit, pour le mobile)

### Installation locale

```bash
# 1. Cloner le dépôt
git clone https://github.com/<username>/benevolapp
cd benevolapp

# 2. Installer toutes les dépendances (tous les workspaces)
pnpm install

# 3. Configurer les variables d'environnement
cp .env.example .env.local
# Éditer .env.local avec :
#   SUPABASE_URL=https://xxxx.supabase.co
#   SUPABASE_ANON_KEY=eyJ...
#   DATABASE_URL=postgresql://postgres.[ref]:[password]@aws-0-eu-west-1.pooler.supabase.com:6543/postgres
#   DIRECT_URL=postgresql://postgres.[ref]:[password]@aws-0-eu-west-1.pooler.supabase.com:5432/postgres

# 4. Appliquer les migrations Prisma
cd packages/shared
npx prisma migrate deploy

# 5. Lancer en développement (mobile + web en parallèle)
cd ../..
pnpm dev
# Mobile (Expo) : http://localhost:8081
# Web (Next.js) : http://localhost:3000
```

### Commandes disponibles

```bash
pnpm dev           # Dev server mobile + web en parallèle
pnpm build         # Build production (tous les packages)
pnpm typecheck     # Vérification TypeScript stricte (3 packages)
pnpm lint          # ESLint sur tous les packages
pnpm test          # Vitest (web) + Jest (mobile)
pnpm new-feature   # Scaffold d'une nouvelle feature (mobile + web)
```

### Configuration Supabase

1. Créer un projet sur [supabase.com](https://supabase.com)
   - **Région impérative : EU West (Ireland)** — exigence RGPD, irréversible après création
   - Sauvegarder le database password en lieu sûr

2. Récupérer les credentials (Settings → API) :
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (CI/CD secrets GitHub uniquement — ne jamais exposer côté client)

3. Configurer les connexions database (Settings → Database) :
   - Transaction mode port 6543 → `DATABASE_URL` (requêtes runtime)
   - Direct mode port 5432 → `DIRECT_URL` (migrations Prisma)

### Déploiement web (Vercel)

```bash
# Connexion du repo GitHub dans Vercel Dashboard
# Push sur main → déploiement production automatique
# Push sur branch → URL preview automatique
# Variables d'env : Vercel Dashboard → Settings → Environment Variables
```

### Déploiement mobile (Expo EAS)

```bash
# Configurer les secrets EAS
eas secret:create --scope project --name SUPABASE_URL --value "..."
eas secret:create --scope project --name SUPABASE_ANON_KEY --value "..."

# Build production
eas build --platform ios --profile production
eas build --platform android --profile production

# Mise à jour OTA (sans passer par les stores)
eas update --branch production --message "fix: description de la mise à jour"
```

---

## 8. Base de données — Analyse et version corrigée

### Problèmes identifiés dans `DBFinal.sql`

Le fichier `DBFinal.sql` à la racine du projet (nommé "TimeLink Database") représente une version initiale du schéma, **conçue en MySQL**, alors que le projet utilise **PostgreSQL via Supabase**. Il présente plusieurs incompatibilités structurelles avec l'architecture finale décidée dans les documents BMAD.

#### Incompatibilités techniques (MySQL vs PostgreSQL)

| Problème | DBFinal.sql (MySQL) | Version correcte (PostgreSQL) |
|----------|---------------------|-------------------------------|
| Auto-increment | `BIGINT AUTO_INCREMENT` | `BIGSERIAL` ou `UUID` via `gen_random_uuid()` |
| ENUM | `ENUM('A','B')` inline | `CREATE TYPE ... AS ENUM` ou `TEXT` avec `CHECK` |
| Date/heure | `DATETIME` | `TIMESTAMPTZ` (avec timezone) |
| Date seule | `DATE` | `DATE` (OK) |
| Heure seule | `TIME` | `TIME` (OK) |
| ON UPDATE | `ON UPDATE CURRENT_TIMESTAMP` | Trigger `updated_at` (Prisma gère via `@updatedAt`) |
| Booléen | `BOOLEAN` (OK) | `BOOLEAN` (OK) |

#### Incompatibilités architecturales

| Problème | Impact |
|----------|--------|
| **Aucune table `organisations`** | Le projet est multi-tenant dès le MVP — toutes les tables doivent avoir `organisation_id` |
| **Pas de colonne `organisation_id`** | Aucune isolation RLS multi-tenant possible |
| **Pas de séparation RGPD** | `Utilisateurs` mélange données publiques et sensibles (email, téléphone, adresse) — le projet exige `profiles` + `profiles_sensitive` séparés |
| **Pas de `managed_by_admin_id`** | Le compte co-géré (proxy admin) est manquant |
| **Valeurs ENUM en majuscules** | Le schéma Prisma et les Zod schemas utilisent des valeurs minuscules (`pending`, `active`, `benevole`, etc.) |
| **Status utilisateur incomplet** | `PENDING/APPROVED/REJECTED` → le projet utilise `pending/active/rejected/suspended` (`active` remplace `APPROVED`, `suspended` est manquant) |
| **Status mission incomplet** | `validation_status PENDING/APPROVED/REJECTED` → le projet utilise `draft/published/cancelled/completed` |
| **Clés primaires BIGINT** | Le projet utilise des UUID v4 (`gen_random_uuid()`) pour toutes les PKs |
| **Pas d'`expo_token`** | Champ manquant pour les push notifications Expo |
| **Pas de `photo_url`** | Champ manquant sur le profil |
| **`supabase_uid`** sur Utilisateurs | Dans l'architecture finale, le `id` du profil **est** l'UUID Supabase Auth — pas un champ séparé |
| **`nom` + `prenom`** | Le profil Prisma utilise uniquement `first_name` (nom de famille récupéré depuis `profiles_sensitive`) |
| **Pas de RLS** | Aucune policy RLS définie — le projet exige un RLS deny-all par défaut |

---

### Schéma corrigé PostgreSQL / Supabase

Le schéma ci-dessous est la version corrigée, compatible PostgreSQL/Supabase, respectant l'architecture multi-tenant, la séparation RGPD, et les conventions du projet (snake_case, UUID, valeurs minuscules).

```sql
-- ============================================================
-- BénévolApp — Schéma PostgreSQL corrigé
-- Compatible Supabase (PostgreSQL 15+, RLS, UUID)
-- Ce schéma est généré progressivement via migrations Prisma.
-- Les tables organisations, profiles et profiles_sensitive
-- sont créées en Story 1.2. Les autres tables sont ajoutées
-- story par story dans les Epics 2 à 7.
-- ============================================================

-- Extension UUID (activée par défaut sur Supabase)
-- CREATE EXTENSION IF NOT EXISTS "pgcrypto";


-- ============================================================
-- TYPES ENUM (PostgreSQL)
-- ============================================================

CREATE TYPE user_role AS ENUM ('admin', 'benevole', 'beneficiaire');
CREATE TYPE account_status AS ENUM ('pending', 'active', 'rejected', 'suspended');
CREATE TYPE mission_status AS ENUM ('draft', 'published', 'cancelled', 'completed');
CREATE TYPE application_status AS ENUM ('pending', 'accepted', 'rejected', 'waitlisted');
CREATE TYPE intervention_status AS ENUM ('planned', 'done', 'missed');
CREATE TYPE recurrence_type AS ENUM ('one_time', 'multi_day', 'weekly');
CREATE TYPE appointment_type AS ENUM ('remote', 'in_person');
CREATE TYPE appointment_status AS ENUM ('scheduled', 'completed', 'cancelled');
CREATE TYPE day_of_week AS ENUM ('lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche');


-- ============================================================
-- 1. ORGANISATIONS (table fondatrice multi-tenant)
-- Story 1.2 — créée en premier, FK de toutes les autres tables
-- ============================================================

CREATE TABLE organisations (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        TEXT NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE organisations ENABLE ROW LEVEL SECURITY;


-- ============================================================
-- 2. PROFILES (données publiques utilisateur)
-- Story 1.2 — id = auth.users.id (Supabase Auth UUID)
-- ============================================================

CREATE TABLE profiles (
    id                   UUID PRIMARY KEY,  -- = auth.users.id
    organisation_id      UUID NOT NULL REFERENCES organisations(id) ON DELETE RESTRICT,
    role                 user_role NOT NULL DEFAULT 'benevole',
    first_name           TEXT,
    photo_url            TEXT,
    status               account_status NOT NULL DEFAULT 'pending',
    managed_by_admin_id  UUID REFERENCES profiles(id) ON DELETE SET NULL,  -- proxy admin
    expo_token           TEXT,  -- token push Expo Notifications
    created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Index
CREATE INDEX idx_profiles_organisation ON profiles(organisation_id);
CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_profiles_status ON profiles(status);

-- Trigger auto-création profil à l'inscription Supabase Auth
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO profiles (id, organisation_id, role, status)
  VALUES (
    NEW.id,
    (NEW.raw_user_meta_data->>'organisation_id')::UUID,
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'benevole'),
    'pending'
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();


-- ============================================================
-- 3. PROFILES_SENSITIVE (données RGPD — séparées)
-- Story 1.2 — PK = FK vers profiles.id (relation 1-1)
-- ============================================================

CREATE TABLE profiles_sensitive (
    id              UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
    organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE RESTRICT,
    last_name       TEXT,
    email           TEXT UNIQUE,
    phone           TEXT,
    address         TEXT,
    date_of_birth   DATE,
    rsa_situation   TEXT,  -- situation RSA (ex : bénéficiaire RSA socle)
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE profiles_sensitive ENABLE ROW LEVEL SECURITY;


-- ============================================================
-- 4. TYPES_SERVICE (catalogue des services proposés)
-- ============================================================

CREATE TABLE types_service (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organisation_id     UUID NOT NULL REFERENCES organisations(id) ON DELETE RESTRICT,
    libelle             TEXT NOT NULL,
    description         TEXT,
    duree_estimee_min   INTEGER,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE types_service ENABLE ROW LEVEL SECURITY;


-- ============================================================
-- 5. ADRESSES (stockage des adresses)
-- ============================================================

CREATE TABLE adresses (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE RESTRICT,
    profile_id      UUID REFERENCES profiles(id) ON DELETE SET NULL,
    rue             TEXT,
    numero          TEXT,
    code_postal     TEXT,
    ville           TEXT,
    pays            TEXT NOT NULL DEFAULT 'France',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE adresses ENABLE ROW LEVEL SECURITY;


-- ============================================================
-- 6. MISSIONS
-- ============================================================

CREATE TABLE missions (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organisation_id     UUID NOT NULL REFERENCES organisations(id) ON DELETE RESTRICT,
    beneficiaire_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
    service_id          UUID NOT NULL REFERENCES types_service(id) ON DELETE RESTRICT,
    location_id         UUID REFERENCES adresses(id) ON DELETE SET NULL,
    status              mission_status NOT NULL DEFAULT 'draft',
    title               TEXT NOT NULL,
    description         TEXT,
    competences         TEXT[],  -- tableau de compétences requises
    created_by_admin_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE missions ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_missions_organisation ON missions(organisation_id);
CREATE INDEX idx_missions_status ON missions(status);
CREATE INDEX idx_missions_beneficiaire ON missions(beneficiaire_id);


-- ============================================================
-- 7. MISSION_SCHEDULES (planning des missions)
-- ============================================================

CREATE TABLE mission_schedules (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mission_id      UUID NOT NULL REFERENCES missions(id) ON DELETE CASCADE,
    recurrence_type recurrence_type NOT NULL,
    start_date      DATE NOT NULL,
    end_date        DATE,
    day_of_week     day_of_week,
    start_time      TIME NOT NULL,
    end_time        TIME NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE mission_schedules ENABLE ROW LEVEL SECURITY;


-- ============================================================
-- 8. MISSION_APPLICATIONS (candidatures bénévoles)
-- Liste d'attente ordonnée par position
-- ============================================================

CREATE TABLE mission_applications (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mission_id      UUID NOT NULL REFERENCES missions(id) ON DELETE CASCADE,
    benevole_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    status          application_status NOT NULL DEFAULT 'pending',
    position        INTEGER,  -- position dans la liste d'attente (nullable si accepté)
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

    UNIQUE(mission_id, benevole_id)  -- une candidature par bénévole/mission
);

ALTER TABLE mission_applications ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_applications_mission ON mission_applications(mission_id);
CREATE INDEX idx_applications_benevole ON mission_applications(benevole_id);
CREATE INDEX idx_applications_status ON mission_applications(status);


-- ============================================================
-- 9. MISSION_INTERVENTIONS (instances réelles de missions)
-- ============================================================

CREATE TABLE mission_interventions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mission_id      UUID NOT NULL REFERENCES missions(id) ON DELETE CASCADE,
    benevole_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
    scheduled_date  DATE NOT NULL,
    start_time      TIME,
    end_time        TIME,
    status          intervention_status NOT NULL DEFAULT 'planned',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE mission_interventions ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_interventions_mission ON mission_interventions(mission_id);
CREATE INDEX idx_interventions_benevole ON mission_interventions(benevole_id);
CREATE INDEX idx_interventions_date ON mission_interventions(scheduled_date);


-- ============================================================
-- 10. POINTAGES (check-in / check-out par intervention)
-- ============================================================

CREATE TABLE pointages (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    intervention_id  UUID NOT NULL REFERENCES mission_interventions(id) ON DELETE CASCADE,
    check_in_time    TIMESTAMPTZ,
    check_out_time   TIMESTAMPTZ,
    ip_address       INET,       -- type natif PostgreSQL pour les IPs (IPv4 + IPv6)
    user_agent       TEXT,
    device_fingerprint TEXT,     -- identifiant appareil (anti-fraude)
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),

    UNIQUE(intervention_id)  -- un seul pointage par intervention
);

ALTER TABLE pointages ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_pointages_checkin ON pointages(check_in_time);


-- ============================================================
-- 11. BENEFICIARY_QR (QR codes permanents des bénéficiaires)
-- ============================================================

CREATE TABLE beneficiary_qr (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    beneficiary_id  UUID UNIQUE NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    qr_token        TEXT UNIQUE NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE beneficiary_qr ENABLE ROW LEVEL SECURITY;


-- ============================================================
-- 12. ATTENDANCE_TOKENS (tokens HMAC anti-fraude, usage unique)
-- ============================================================

CREATE TABLE attendance_tokens (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    intervention_id  UUID NOT NULL REFERENCES mission_interventions(id) ON DELETE CASCADE,
    token_hash       TEXT UNIQUE NOT NULL,
    valid_from       TIMESTAMPTZ NOT NULL,
    valid_until      TIMESTAMPTZ NOT NULL,
    used             BOOLEAN NOT NULL DEFAULT FALSE,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE attendance_tokens ENABLE ROW LEVEL SECURITY;


-- ============================================================
-- 13. DISPONIBILITES (disponibilités hebdomadaires des bénévoles)
-- ============================================================

CREATE TABLE disponibilites (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE RESTRICT,
    jour_semaine    day_of_week NOT NULL,
    heure_debut     TIME,
    heure_fin       TIME,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE disponibilites ENABLE ROW LEVEL SECURITY;


-- ============================================================
-- 14. VALIDATION_APPOINTMENTS (rendez-vous de validation compte)
-- ============================================================

CREATE TABLE validation_appointments (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id           UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    organisation_id   UUID NOT NULL REFERENCES organisations(id) ON DELETE RESTRICT,
    type              appointment_type NOT NULL,
    appointment_date  TIMESTAMPTZ NOT NULL,
    location          TEXT,
    status            appointment_status NOT NULL DEFAULT 'scheduled',
    created_by_admin  UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE validation_appointments ENABLE ROW LEVEL SECURITY;


-- ============================================================
-- 15. MISSION_FOLLOWUPS (suivi de missions — notes admin)
-- ============================================================

CREATE TABLE mission_followups (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mission_id        UUID NOT NULL REFERENCES missions(id) ON DELETE CASCADE,
    organisation_id   UUID NOT NULL REFERENCES organisations(id) ON DELETE RESTRICT,
    scheduled_date    TIMESTAMPTZ NOT NULL,
    notes             TEXT,
    created_by_admin  UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE mission_followups ENABLE ROW LEVEL SECURITY;


-- ============================================================
-- 16. ADMIN_NOTES (notes privées des admins)
-- ============================================================

CREATE TABLE admin_notes (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id          UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
    organisation_id   UUID NOT NULL REFERENCES organisations(id) ON DELETE RESTRICT,
    target_profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    target_mission_id UUID REFERENCES missions(id) ON DELETE CASCADE,
    note              TEXT NOT NULL,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- Une note doit cibler soit un profil, soit une mission (pas les deux, pas aucun)
    CONSTRAINT admin_notes_target_check
        CHECK (
            (target_profile_id IS NOT NULL AND target_mission_id IS NULL) OR
            (target_profile_id IS NULL AND target_mission_id IS NOT NULL)
        )
);

ALTER TABLE admin_notes ENABLE ROW LEVEL SECURITY;


-- ============================================================
-- 17. NOTIFICATIONS (système de notifications)
-- ============================================================

CREATE TABLE notifications (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE RESTRICT,
    type            TEXT NOT NULL,  -- ex: 'mission_published', 'application_accepted', etc.
    title           TEXT NOT NULL,
    message         TEXT,
    is_read         BOOLEAN NOT NULL DEFAULT FALSE,
    is_human        BOOLEAN NOT NULL DEFAULT FALSE,  -- TRUE = inbox humaine admin, FALSE = notif système
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_read ON notifications(is_read) WHERE is_read = FALSE;


-- ============================================================
-- 18. AUDIT_LOGS (trace complète de toutes les actions sensibles)
-- ============================================================

CREATE TABLE audit_logs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID REFERENCES profiles(id) ON DELETE SET NULL,
    organisation_id UUID REFERENCES organisations(id) ON DELETE SET NULL,
    action          TEXT NOT NULL,  -- ex: 'user.approved', 'mission.published', 'proxy.activated'
    entity_type     TEXT,           -- ex: 'profile', 'mission', 'application'
    entity_id       UUID,
    ip_address      INET,
    user_agent      TEXT,
    metadata        JSONB,          -- données supplémentaires contextuelles
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_audit_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_date ON audit_logs(created_at DESC);
CREATE INDEX idx_audit_user ON audit_logs(user_id);
CREATE INDEX idx_audit_action ON audit_logs(action);
```

---

## 9. Relations entre tables

```
organisations (table fondatrice)
│
├─── 1:N ──► profiles
│            ├── 1:1 ──► profiles_sensitive       (RGPD, email/phone/adresse/DOB)
│            ├── 1:N ──► disponibilites           (disponibilités hebdomadaires)
│            ├── 1:N ──► validation_appointments   (rendez-vous validation compte)
│            ├── 1:N ──► admin_notes               (notes privées — si admin)
│            ├── self ──► profiles (managed_by_admin_id)  (proxy admin → bénéficiaire)
│            ├── 1:N ──► notifications             (toutes les notifications)
│            └── 1:N ──► audit_logs               (actions tracées)
│
├─── 1:N ──► types_service                        (catalogue des services)
│
├─── 1:N ──► adresses                             (adresses des profils)
│
└─── 1:N ──► missions
             ├── N:1 ◄── profiles (beneficiaire_id)
             ├── N:1 ◄── types_service (service_id)
             ├── N:1 ◄── adresses (location_id)
             ├── 1:N ──► mission_schedules         (planning)
             ├── 1:N ──► mission_applications      (candidatures)
             │            └── N:1 ◄── profiles (benevole_id)
             ├── 1:N ──► mission_interventions     (instances réelles)
             │            ├── N:1 ◄── profiles (benevole_id)
             │            ├── 1:1 ──► pointages    (check-in/check-out)
             │            └── 1:N ──► attendance_tokens (tokens HMAC)
             ├── 1:N ──► mission_followups         (notes de suivi admin)
             └── 1:N ──► admin_notes               (ciblant la mission)

profiles (beneficiaire_id)
└── 1:1 ──► beneficiary_qr                        (QR code permanent)
            └── validé via attendance_tokens (token_hash HMAC)
```

### Clés d'isolation multi-tenant

Toutes les tables métier portent une colonne `organisation_id UUID NOT NULL`. Le RLS PostgreSQL s'appuie sur cette colonne pour filtrer les données selon l'organisation de l'utilisateur connecté.

Exemple de policy RLS type :
```sql
-- missions_select_benevole
CREATE POLICY missions_select_benevole ON missions
  FOR SELECT
  TO authenticated
  USING (
    organisation_id = (
      SELECT organisation_id FROM profiles WHERE id = auth.uid()
    )
    AND status = 'published'
    AND auth.uid() IN (
      SELECT id FROM profiles WHERE role = 'benevole'
    )
  );
```

---

## 10. État d'avancement

### Epics et stories

| Epic | Titre | Status |
|------|-------|--------|
| **Epic 1** | Fondation & Déploiement Continu | in-progress |
| Story 1.1 | Initialisation du monorepo Turborepo | ✅ review |
| Story 1.2 | Configuration Supabase + schéma Prisma de base | ✅ review |
| Story 1.3 | Pipeline CI/CD GitHub Actions | ✅ review |
| Story 1.4 | Déploiement écran vide production | backlog |
| Story 1.5 | Monitoring + Backup | backlog |
| **Epic 2** | Accès à la Plateforme | backlog |
| **Epic 3** | Gestion des Missions | backlog |
| **Epic 4** | Présence & Pointage QR | backlog |
| **Epic 5** | Suivi & Valorisation des Heures | backlog |
| **Epic 6** | Administration & Communication | backlog |
| **Epic 7** | Conformité RGPD | backlog |

### Foundation Checklist (Story 1.1)

| Item | Status |
|------|--------|
| `QueryKeys` complet dans `packages/shared/types/query-keys.ts` | ✅ |
| `AppErrorCodes` + `createAppError()` dans `types/errors.ts` | ✅ |
| `isoDateSchema` dans `schemas/base.schema.ts` | ✅ |
| Zod schemas de base (user, organisation, mission) | ✅ |
| `toISOString()` helper dans `types/dates.ts` | ✅ |
| `CLAUDE.md` à la racine | ✅ |
| `scaffold-feature.js` (`pnpm new-feature`) | ✅ |
| Template RLS naming (`000_rls_naming_template.sql`) | ⏳ à faire |

### Documents de référence

| Document | Chemin |
|----------|--------|
| PRD (Product Requirements Document) | `_bmad-output/planning-artifacts/prd.md` |
| Architecture Decision Document | `_bmad-output/planning-artifacts/architecture.md` |
| Epics & Stories | `_bmad-output/planning-artifacts/epics.md` |
| Story 1.1 (détaillée) | `_bmad-output/implementation-artifacts/1-1-*.md` |
| Story 1.2 (détaillée) | `_bmad-output/implementation-artifacts/1-2-*.md` |
| Story 1.3 (détaillée) | `_bmad-output/implementation-artifacts/1-3-*.md` |
| Rapport de readiness | `_bmad-output/planning-artifacts/implementation-readiness-report-2026-03-27.md` |
| Conventions IA | `benevolapp/CLAUDE.md` |

---

*Document généré à partir de l'analyse complète du projet BénévolApp — 2026-03-30*
