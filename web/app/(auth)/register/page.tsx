import type { Metadata } from "next";
import { RegisterForm } from "./_components/register-form";

export const metadata: Metadata = {
  title: "Inscription — BénévolApp",
};

export default function RegisterPage() {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <h2 className="mb-6 text-xl font-semibold text-zinc-900 dark:text-zinc-50">
        Créer un compte
      </h2>
      <RegisterForm />
    </div>
  );
}
