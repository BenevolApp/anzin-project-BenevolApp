"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";

const registerSchema = z
  .object({
    role: z.enum(["benevole", "beneficiaire"], {
      required_error: "Choisissez un rôle",
    }),
    firstName: z.string().min(1, "Prénom requis").max(100),
    lastName: z.string().min(1, "Nom requis").max(100),
    email: z.string().email("Email invalide"),
    password: z.string().min(8, "8 caractères minimum"),
    passwordConfirm: z.string(),
  })
  .refine((v) => v.password === v.passwordConfirm, {
    message: "Les mots de passe ne correspondent pas",
    path: ["passwordConfirm"],
  });

type RegisterValues = z.infer<typeof registerSchema>;

const ROLE_LABELS: Record<RegisterValues["role"], string> = {
  benevole: "Bénévole — je souhaite aider",
  beneficiaire: "Bénéficiaire — j'ai besoin d'aide",
};

export function RegisterForm() {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<RegisterValues>({ resolver: zodResolver(registerSchema) });

  async function onSubmit(values: RegisterValues) {
    const supabase = createClient();
    const { error } = await supabase.auth.signUp({
      email: values.email,
      password: values.password,
      options: {
        data: {
          role: values.role,
          first_name: values.firstName,
          last_name: values.lastName,
        },
      },
    });

    if (error) {
      setError("root", { message: error.message });
      return;
    }

    router.push("/login?registered=1");
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <fieldset>
        <legend className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
          Je suis…
        </legend>
        <div className="grid grid-cols-1 gap-2">
          {(["benevole", "beneficiaire"] as const).map((role) => (
            <label
              key={role}
              className="flex items-center gap-3 rounded-lg border border-zinc-200 px-4 py-3 cursor-pointer has-[:checked]:border-zinc-900 has-[:checked]:bg-zinc-50 dark:border-zinc-700 dark:has-[:checked]:border-zinc-300 dark:has-[:checked]:bg-zinc-800 transition-colors"
            >
              <input
                type="radio"
                value={role}
                {...register("role")}
                className="accent-zinc-900 dark:accent-zinc-50"
              />
              <span className="text-sm text-zinc-700 dark:text-zinc-300">
                {ROLE_LABELS[role]}
              </span>
            </label>
          ))}
        </div>
        {errors.role && (
          <p className="mt-1 text-xs text-red-600">{errors.role.message}</p>
        )}
      </fieldset>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label
            htmlFor="firstName"
            className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
          >
            Prénom
          </label>
          <input
            id="firstName"
            type="text"
            autoComplete="given-name"
            {...register("firstName")}
            className="mt-1 block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-zinc-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
          />
          {errors.firstName && (
            <p className="mt-1 text-xs text-red-600">{errors.firstName.message}</p>
          )}
        </div>
        <div>
          <label
            htmlFor="lastName"
            className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
          >
            Nom
          </label>
          <input
            id="lastName"
            type="text"
            autoComplete="family-name"
            {...register("lastName")}
            className="mt-1 block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-zinc-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
          />
          {errors.lastName && (
            <p className="mt-1 text-xs text-red-600">{errors.lastName.message}</p>
          )}
        </div>
      </div>

      <div>
        <label
          htmlFor="email"
          className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
        >
          Email
        </label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          {...register("email")}
          className="mt-1 block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:border-zinc-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
          placeholder="vous@exemple.fr"
        />
        {errors.email && (
          <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>
        )}
      </div>

      <div>
        <label
          htmlFor="password"
          className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
        >
          Mot de passe
        </label>
        <input
          id="password"
          type="password"
          autoComplete="new-password"
          {...register("password")}
          className="mt-1 block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-zinc-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
          placeholder="••••••••"
        />
        {errors.password && (
          <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>
        )}
      </div>

      <div>
        <label
          htmlFor="passwordConfirm"
          className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
        >
          Confirmer le mot de passe
        </label>
        <input
          id="passwordConfirm"
          type="password"
          autoComplete="new-password"
          {...register("passwordConfirm")}
          className="mt-1 block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-zinc-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
          placeholder="••••••••"
        />
        {errors.passwordConfirm && (
          <p className="mt-1 text-xs text-red-600">{errors.passwordConfirm.message}</p>
        )}
      </div>

      {errors.root && (
        <p className="text-sm text-red-600 text-center">{errors.root.message}</p>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
      >
        {isSubmitting ? "Inscription…" : "Créer mon compte"}
      </button>

      <p className="text-center text-sm text-zinc-500">
        Déjà inscrit ?{" "}
        <a href="/login" className="font-medium text-zinc-900 underline dark:text-zinc-50">
          Se connecter
        </a>
      </p>
    </form>
  );
}
