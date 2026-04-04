"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";

const missionFormSchema = z.object({
  title: z.string().min(1, "Titre requis").max(200),
  description: z.string().optional(),
  service_id: z.string().uuid("Service requis"),
  beneficiaire_id: z.string().uuid("Bénéficiaire requis"),
  competences: z.string().optional(), // liste séparée par virgule
  recurrence_type: z.enum(["one_time", "multi_day", "weekly"]),
  start_date: z.string().min(1, "Date de début requise"),
  end_date: z.string().optional(),
  day_of_week: z.enum(["lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche"]).optional(),
  start_time: z.string().min(1, "Heure de début requise"),
  end_time: z.string().min(1, "Heure de fin requise"),
});

type MissionFormValues = z.infer<typeof missionFormSchema>;

interface TypeService { id: string; libelle: string }
interface Beneficiaire { id: string; first_name: string | null; profiles_sensitive: { last_name: string | null } | null }

interface Props {
  organisationId: string;
  adminId: string;
  services: TypeService[];
  beneficiaires: Beneficiaire[];
  // Si fourni : mode édition
  missionId?: string;
  defaultValues?: Partial<MissionFormValues>;
}

const DAYS = ["lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche"] as const;
const DAYS_FR: Record<string, string> = {
  lundi: "Lundi", mardi: "Mardi", mercredi: "Mercredi",
  jeudi: "Jeudi", vendredi: "Vendredi", samedi: "Samedi", dimanche: "Dimanche",
};

export function MissionForm({ organisationId, adminId, services, beneficiaires, missionId, defaultValues }: Props) {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    watch,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<MissionFormValues>({
    resolver: zodResolver(missionFormSchema),
    defaultValues: { recurrence_type: "one_time", ...defaultValues },
  });

  const recurrence = watch("recurrence_type");

  async function onSubmit(values: MissionFormValues) {
    const supabase = createClient();

    const competences = values.competences
      ? values.competences.split(",").map((c) => c.trim()).filter(Boolean)
      : [];

    if (missionId) {
      // Mode édition
      const { error } = await supabase
        .from("missions")
        .update({ title: values.title, description: values.description ?? null, service_id: values.service_id, beneficiaire_id: values.beneficiaire_id, competences })
        .eq("id", missionId);
      if (error) { setError("root", { message: error.message }); return; }

      // Mettre à jour le planning
      await supabase.from("mission_schedules").delete().eq("mission_id", missionId);
    } else {
      // Mode création
      const { data: mission, error } = await supabase
        .from("missions")
        .insert({ title: values.title, description: values.description ?? null, service_id: values.service_id, beneficiaire_id: values.beneficiaire_id, organisation_id: organisationId, created_by_admin_id: adminId, status: "draft", competences })
        .select("id")
        .single();
      if (error || !mission) { setError("root", { message: error?.message ?? "Erreur création" }); return; }
      missionId = mission.id;
    }

    // Insérer le planning
    await supabase.from("mission_schedules").insert({
      mission_id: missionId,
      recurrence_type: values.recurrence_type,
      start_date: values.start_date,
      end_date: values.end_date ?? null,
      day_of_week: recurrence === "weekly" ? values.day_of_week ?? null : null,
      start_time: values.start_time,
      end_time: values.end_time,
    });

    router.push(`/missions/${missionId}`);
    router.refresh();
  }

  const isEdit = !!defaultValues;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      {/* Titre */}
      <div>
        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Titre</label>
        <input type="text" {...register("title")}
          className="mt-1 block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-zinc-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
        />
        {errors.title && <p className="mt-1 text-xs text-red-600">{errors.title.message}</p>}
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Description</label>
        <textarea rows={3} {...register("description")}
          className="mt-1 block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-zinc-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
        />
      </div>

      {/* Service */}
      <div>
        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Type de service</label>
        <select {...register("service_id")}
          className="mt-1 block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-zinc-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
        >
          <option value="">— Sélectionner —</option>
          {services.map((s) => <option key={s.id} value={s.id}>{s.libelle}</option>)}
        </select>
        {errors.service_id && <p className="mt-1 text-xs text-red-600">{errors.service_id.message}</p>}
      </div>

      {/* Bénéficiaire */}
      <div>
        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Bénéficiaire</label>
        <select {...register("beneficiaire_id")}
          className="mt-1 block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-zinc-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
        >
          <option value="">— Sélectionner —</option>
          {beneficiaires.map((b) => {
            const sensitive = Array.isArray(b.profiles_sensitive) ? b.profiles_sensitive[0] : b.profiles_sensitive;
            const name = [b.first_name, sensitive?.last_name].filter(Boolean).join(" ") || b.id.slice(0, 8);
            return <option key={b.id} value={b.id}>{name}</option>;
          })}
        </select>
        {errors.beneficiaire_id && <p className="mt-1 text-xs text-red-600">{errors.beneficiaire_id.message}</p>}
      </div>

      {/* Compétences */}
      <div>
        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Compétences souhaitées <span className="font-normal text-zinc-400">(séparées par virgule)</span>
        </label>
        <input type="text" {...register("competences")} placeholder="conduite, jardinage, cuisine"
          className="mt-1 block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-zinc-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
        />
      </div>

      {/* Planning */}
      <fieldset className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-700">
        <legend className="px-1 text-sm font-medium text-zinc-700 dark:text-zinc-300">Planning</legend>
        <div className="space-y-4 mt-2">
          <div>
            <label className="block text-sm text-zinc-600 dark:text-zinc-400">Récurrence</label>
            <select {...register("recurrence_type")}
              className="mt-1 block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
            >
              <option value="one_time">Ponctuelle</option>
              <option value="multi_day">Multi-jours</option>
              <option value="weekly">Hebdomadaire</option>
            </select>
          </div>

          {recurrence === "weekly" && (
            <div>
              <label className="block text-sm text-zinc-600 dark:text-zinc-400">Jour de la semaine</label>
              <select {...register("day_of_week")}
                className="mt-1 block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
              >
                <option value="">— Sélectionner —</option>
                {DAYS.map((d) => <option key={d} value={d}>{DAYS_FR[d]}</option>)}
              </select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-zinc-600 dark:text-zinc-400">Date de début</label>
              <input type="date" {...register("start_date")}
                className="mt-1 block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
              />
              {errors.start_date && <p className="mt-1 text-xs text-red-600">{errors.start_date.message}</p>}
            </div>
            {recurrence !== "one_time" && (
              <div>
                <label className="block text-sm text-zinc-600 dark:text-zinc-400">Date de fin</label>
                <input type="date" {...register("end_date")}
                  className="mt-1 block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
                />
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-zinc-600 dark:text-zinc-400">Heure de début</label>
              <input type="time" {...register("start_time")}
                className="mt-1 block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
              />
              {errors.start_time && <p className="mt-1 text-xs text-red-600">{errors.start_time.message}</p>}
            </div>
            <div>
              <label className="block text-sm text-zinc-600 dark:text-zinc-400">Heure de fin</label>
              <input type="time" {...register("end_time")}
                className="mt-1 block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
              />
              {errors.end_time && <p className="mt-1 text-xs text-red-600">{errors.end_time.message}</p>}
            </div>
          </div>
        </div>
      </fieldset>

      {errors.root && <p className="text-sm text-red-600">{errors.root.message}</p>}

      <button type="submit" disabled={isSubmitting}
        className="w-full rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900"
      >
        {isSubmitting ? "Enregistrement…" : isEdit ? "Enregistrer les modifications" : "Créer la mission (brouillon)"}
      </button>
    </form>
  );
}
