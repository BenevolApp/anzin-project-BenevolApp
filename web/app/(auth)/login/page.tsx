import type { Metadata } from "next";
import { LoginForm } from "./_components/login-form";

export const metadata: Metadata = {
  title: "Connexion — BénévolApp",
};

export default function LoginPage() {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <h2 className="mb-6 text-xl font-semibold text-zinc-900 dark:text-zinc-50">
        Connexion
      </h2>
      <LoginForm />
    </div>
  );
}
