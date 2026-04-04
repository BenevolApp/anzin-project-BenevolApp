import type { Metadata } from "next";
import Link from "next/link";
import { DashboardStats } from "./_components/dashboard-stats";

export const metadata: Metadata = { title: "Tableau de bord admin — BénévolApp" };

export default function AdminDashboardPage() {
  return (
    <main className="min-h-screen bg-zinc-50 dark:bg-zinc-900 p-8">
      <div className="max-w-3xl mx-auto">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
              Tableau de bord
            </h1>
            <p className="mt-1 text-sm text-zinc-500">Vue d&apos;ensemble de l&apos;activité</p>
          </div>
          <Link href="/dashboard" className="text-sm text-zinc-500 underline">
            ← Accueil
          </Link>
        </div>

        <DashboardStats />
      </div>
    </main>
  );
}
