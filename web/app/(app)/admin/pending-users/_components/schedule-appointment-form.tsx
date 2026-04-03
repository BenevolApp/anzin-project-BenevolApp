"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { createClient } from "@/utils/supabase/client";

const appointmentSchema = z.object({
  type: z.enum(["remote", "in_person"]),
  appointment_date: z.string().min(1, "Date requise"),
  location: z.string().optional(),
});

type AppointmentValues = z.infer<typeof appointmentSchema>;

interface Props {
  userId: string;
  organisationId: string;
  adminId: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export function ScheduleAppointmentForm({
  userId,
  organisationId,
  adminId,
  onSuccess,
  onCancel,
}: Props) {
  const {
    register,
    handleSubmit,
    watch,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<AppointmentValues>({
    resolver: zodResolver(appointmentSchema),
    defaultValues: { type: "remote" },
  });

  const type = watch("type");

  async function onSubmit(values: AppointmentValues) {
    const supabase = createClient();
    const { error } = await supabase.from("validation_appointments").insert({
      user_id: userId,
      organisation_id: organisationId,
      type: values.type,
      appointment_date: new Date(values.appointment_date).toISOString(),
      location: values.location ?? null,
      status: "scheduled",
      created_by_admin: adminId,
    });

    if (error) {
      setError("root", { message: error.message });
      return;
    }

    onSuccess();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="mt-3 space-y-3 border-t border-zinc-100 pt-3 dark:border-zinc-800">
      <div className="flex gap-4">
        {(["remote", "in_person"] as const).map((t) => (
          <label key={t} className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300 cursor-pointer">
            <input type="radio" value={t} {...register("type")} className="accent-zinc-900 dark:accent-zinc-50" />
            {t === "remote" ? "À distance" : "En personne"}
          </label>
        ))}
      </div>

      <div>
        <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400">
          Date et heure
        </label>
        <input
          type="datetime-local"
          {...register("appointment_date")}
          className="mt-1 block w-full rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm text-zinc-900 focus:border-zinc-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
        />
        {errors.appointment_date && (
          <p className="mt-1 text-xs text-red-600">{errors.appointment_date.message}</p>
        )}
      </div>

      {type === "in_person" && (
        <div>
          <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400">
            Lieu
          </label>
          <input
            type="text"
            {...register("location")}
            placeholder="Adresse ou salle"
            className="mt-1 block w-full rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm text-zinc-900 focus:border-zinc-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
          />
        </div>
      )}

      {errors.root && (
        <p className="text-xs text-red-600">{errors.root.message}</p>
      )}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-md bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900"
        >
          {isSubmitting ? "Enregistrement…" : "Confirmer le RDV"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300"
        >
          Annuler
        </button>
      </div>
    </form>
  );
}
