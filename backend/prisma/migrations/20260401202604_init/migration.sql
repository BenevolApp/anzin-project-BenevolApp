-- CreateEnum
CREATE TYPE "user_role" AS ENUM ('admin', 'benevole', 'beneficiaire');

-- CreateEnum
CREATE TYPE "account_status" AS ENUM ('pending', 'active', 'rejected', 'suspended');

-- CreateEnum
CREATE TYPE "mission_status" AS ENUM ('draft', 'published', 'cancelled', 'completed');

-- CreateEnum
CREATE TYPE "application_status" AS ENUM ('pending', 'accepted', 'rejected', 'waitlisted');

-- CreateEnum
CREATE TYPE "intervention_status" AS ENUM ('planned', 'done', 'missed');

-- CreateEnum
CREATE TYPE "recurrence_type" AS ENUM ('one_time', 'multi_day', 'weekly');

-- CreateEnum
CREATE TYPE "appointment_type" AS ENUM ('remote', 'in_person');

-- CreateEnum
CREATE TYPE "appointment_status" AS ENUM ('scheduled', 'completed', 'cancelled');

-- CreateEnum
CREATE TYPE "day_of_week" AS ENUM ('lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche');

-- CreateTable
CREATE TABLE "organisations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "organisations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "profiles" (
    "id" UUID NOT NULL,
    "organisation_id" UUID NOT NULL,
    "role" "user_role" NOT NULL DEFAULT 'benevole',
    "first_name" TEXT,
    "photo_url" TEXT,
    "status" "account_status" NOT NULL DEFAULT 'pending',
    "managed_by_admin_id" UUID,
    "expo_token" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "profiles_sensitive" (
    "id" UUID NOT NULL,
    "organisation_id" UUID NOT NULL,
    "last_name" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "date_of_birth" DATE,
    "rsa_situation" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "profiles_sensitive_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "types_service" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organisation_id" UUID NOT NULL,
    "libelle" TEXT NOT NULL,
    "description" TEXT,
    "duree_estimee_min" INTEGER,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "types_service_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "adresses" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organisation_id" UUID NOT NULL,
    "profile_id" UUID,
    "rue" TEXT,
    "numero" TEXT,
    "code_postal" TEXT,
    "ville" TEXT,
    "pays" TEXT NOT NULL DEFAULT 'France',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "adresses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "missions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organisation_id" UUID NOT NULL,
    "beneficiaire_id" UUID NOT NULL,
    "service_id" UUID NOT NULL,
    "location_id" UUID,
    "status" "mission_status" NOT NULL DEFAULT 'draft',
    "title" TEXT NOT NULL,
    "description" TEXT,
    "competences" TEXT[],
    "created_by_admin_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "missions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mission_schedules" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "mission_id" UUID NOT NULL,
    "recurrence_type" "recurrence_type" NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date" DATE,
    "day_of_week" "day_of_week",
    "start_time" TIME(6) NOT NULL,
    "end_time" TIME(6) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mission_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mission_applications" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "mission_id" UUID NOT NULL,
    "benevole_id" UUID NOT NULL,
    "status" "application_status" NOT NULL DEFAULT 'pending',
    "position" INTEGER,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mission_applications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mission_interventions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "mission_id" UUID NOT NULL,
    "benevole_id" UUID NOT NULL,
    "scheduled_date" DATE NOT NULL,
    "start_time" TIME(6),
    "end_time" TIME(6),
    "status" "intervention_status" NOT NULL DEFAULT 'planned',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mission_interventions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pointages" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "intervention_id" UUID NOT NULL,
    "check_in_time" TIMESTAMPTZ(6),
    "check_out_time" TIMESTAMPTZ(6),
    "ip_address" INET,
    "user_agent" TEXT,
    "device_fingerprint" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pointages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "beneficiary_qr" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "beneficiary_id" UUID NOT NULL,
    "qr_token" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "beneficiary_qr_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attendance_tokens" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "intervention_id" UUID NOT NULL,
    "token_hash" TEXT NOT NULL,
    "valid_from" TIMESTAMPTZ(6) NOT NULL,
    "valid_until" TIMESTAMPTZ(6) NOT NULL,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "attendance_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "disponibilites" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "profile_id" UUID NOT NULL,
    "organisation_id" UUID NOT NULL,
    "jour_semaine" "day_of_week" NOT NULL,
    "heure_debut" TIME(6),
    "heure_fin" TIME(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "disponibilites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "validation_appointments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "organisation_id" UUID NOT NULL,
    "type" "appointment_type" NOT NULL,
    "appointment_date" TIMESTAMPTZ(6) NOT NULL,
    "location" TEXT,
    "status" "appointment_status" NOT NULL DEFAULT 'scheduled',
    "created_by_admin" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "validation_appointments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mission_followups" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "mission_id" UUID NOT NULL,
    "organisation_id" UUID NOT NULL,
    "scheduled_date" TIMESTAMPTZ(6) NOT NULL,
    "notes" TEXT,
    "created_by_admin" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mission_followups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_notes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "admin_id" UUID NOT NULL,
    "organisation_id" UUID NOT NULL,
    "target_profile_id" UUID,
    "target_mission_id" UUID,
    "note" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "organisation_id" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "is_human" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID,
    "organisation_id" UUID,
    "action" TEXT NOT NULL,
    "entity_type" TEXT,
    "entity_id" UUID,
    "ip_address" INET,
    "user_agent" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "profiles_organisation_id_idx" ON "profiles"("organisation_id");

-- CreateIndex
CREATE INDEX "profiles_role_idx" ON "profiles"("role");

-- CreateIndex
CREATE INDEX "profiles_status_idx" ON "profiles"("status");

-- CreateIndex
CREATE UNIQUE INDEX "profiles_sensitive_email_key" ON "profiles_sensitive"("email");

-- CreateIndex
CREATE INDEX "missions_organisation_id_idx" ON "missions"("organisation_id");

-- CreateIndex
CREATE INDEX "missions_status_idx" ON "missions"("status");

-- CreateIndex
CREATE INDEX "missions_beneficiaire_id_idx" ON "missions"("beneficiaire_id");

-- CreateIndex
CREATE INDEX "mission_applications_mission_id_idx" ON "mission_applications"("mission_id");

-- CreateIndex
CREATE INDEX "mission_applications_benevole_id_idx" ON "mission_applications"("benevole_id");

-- CreateIndex
CREATE INDEX "mission_applications_status_idx" ON "mission_applications"("status");

-- CreateIndex
CREATE UNIQUE INDEX "mission_applications_mission_id_benevole_id_key" ON "mission_applications"("mission_id", "benevole_id");

-- CreateIndex
CREATE INDEX "mission_interventions_mission_id_idx" ON "mission_interventions"("mission_id");

-- CreateIndex
CREATE INDEX "mission_interventions_benevole_id_idx" ON "mission_interventions"("benevole_id");

-- CreateIndex
CREATE INDEX "mission_interventions_scheduled_date_idx" ON "mission_interventions"("scheduled_date");

-- CreateIndex
CREATE UNIQUE INDEX "pointages_intervention_id_key" ON "pointages"("intervention_id");

-- CreateIndex
CREATE INDEX "pointages_check_in_time_idx" ON "pointages"("check_in_time");

-- CreateIndex
CREATE UNIQUE INDEX "beneficiary_qr_beneficiary_id_key" ON "beneficiary_qr"("beneficiary_id");

-- CreateIndex
CREATE UNIQUE INDEX "beneficiary_qr_qr_token_key" ON "beneficiary_qr"("qr_token");

-- CreateIndex
CREATE UNIQUE INDEX "attendance_tokens_token_hash_key" ON "attendance_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "notifications_user_id_idx" ON "notifications"("user_id");

-- CreateIndex
CREATE INDEX "notifications_is_read_idx" ON "notifications"("is_read");

-- CreateIndex
CREATE INDEX "audit_logs_entity_type_entity_id_idx" ON "audit_logs"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs"("created_at");

-- CreateIndex
CREATE INDEX "audit_logs_user_id_idx" ON "audit_logs"("user_id");

-- CreateIndex
CREATE INDEX "audit_logs_action_idx" ON "audit_logs"("action");

-- AddForeignKey
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_organisation_id_fkey" FOREIGN KEY ("organisation_id") REFERENCES "organisations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_managed_by_admin_id_fkey" FOREIGN KEY ("managed_by_admin_id") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profiles_sensitive" ADD CONSTRAINT "profiles_sensitive_id_fkey" FOREIGN KEY ("id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profiles_sensitive" ADD CONSTRAINT "profiles_sensitive_organisation_id_fkey" FOREIGN KEY ("organisation_id") REFERENCES "organisations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "types_service" ADD CONSTRAINT "types_service_organisation_id_fkey" FOREIGN KEY ("organisation_id") REFERENCES "organisations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "adresses" ADD CONSTRAINT "adresses_organisation_id_fkey" FOREIGN KEY ("organisation_id") REFERENCES "organisations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "adresses" ADD CONSTRAINT "adresses_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "missions" ADD CONSTRAINT "missions_organisation_id_fkey" FOREIGN KEY ("organisation_id") REFERENCES "organisations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "missions" ADD CONSTRAINT "missions_beneficiaire_id_fkey" FOREIGN KEY ("beneficiaire_id") REFERENCES "profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "missions" ADD CONSTRAINT "missions_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "types_service"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "missions" ADD CONSTRAINT "missions_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "adresses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "missions" ADD CONSTRAINT "missions_created_by_admin_id_fkey" FOREIGN KEY ("created_by_admin_id") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mission_schedules" ADD CONSTRAINT "mission_schedules_mission_id_fkey" FOREIGN KEY ("mission_id") REFERENCES "missions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mission_applications" ADD CONSTRAINT "mission_applications_mission_id_fkey" FOREIGN KEY ("mission_id") REFERENCES "missions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mission_applications" ADD CONSTRAINT "mission_applications_benevole_id_fkey" FOREIGN KEY ("benevole_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mission_interventions" ADD CONSTRAINT "mission_interventions_mission_id_fkey" FOREIGN KEY ("mission_id") REFERENCES "missions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mission_interventions" ADD CONSTRAINT "mission_interventions_benevole_id_fkey" FOREIGN KEY ("benevole_id") REFERENCES "profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pointages" ADD CONSTRAINT "pointages_intervention_id_fkey" FOREIGN KEY ("intervention_id") REFERENCES "mission_interventions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "beneficiary_qr" ADD CONSTRAINT "beneficiary_qr_beneficiary_id_fkey" FOREIGN KEY ("beneficiary_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_tokens" ADD CONSTRAINT "attendance_tokens_intervention_id_fkey" FOREIGN KEY ("intervention_id") REFERENCES "mission_interventions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "disponibilites" ADD CONSTRAINT "disponibilites_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "disponibilites" ADD CONSTRAINT "disponibilites_organisation_id_fkey" FOREIGN KEY ("organisation_id") REFERENCES "organisations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "validation_appointments" ADD CONSTRAINT "validation_appointments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "validation_appointments" ADD CONSTRAINT "validation_appointments_organisation_id_fkey" FOREIGN KEY ("organisation_id") REFERENCES "organisations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "validation_appointments" ADD CONSTRAINT "validation_appointments_created_by_admin_fkey" FOREIGN KEY ("created_by_admin") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mission_followups" ADD CONSTRAINT "mission_followups_mission_id_fkey" FOREIGN KEY ("mission_id") REFERENCES "missions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mission_followups" ADD CONSTRAINT "mission_followups_organisation_id_fkey" FOREIGN KEY ("organisation_id") REFERENCES "organisations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mission_followups" ADD CONSTRAINT "mission_followups_created_by_admin_fkey" FOREIGN KEY ("created_by_admin") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_notes" ADD CONSTRAINT "admin_notes_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_notes" ADD CONSTRAINT "admin_notes_organisation_id_fkey" FOREIGN KEY ("organisation_id") REFERENCES "organisations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_notes" ADD CONSTRAINT "admin_notes_target_profile_id_fkey" FOREIGN KEY ("target_profile_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_notes" ADD CONSTRAINT "admin_notes_target_mission_id_fkey" FOREIGN KEY ("target_mission_id") REFERENCES "missions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_organisation_id_fkey" FOREIGN KEY ("organisation_id") REFERENCES "organisations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_organisation_id_fkey" FOREIGN KEY ("organisation_id") REFERENCES "organisations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
