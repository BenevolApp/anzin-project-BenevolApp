import type { Metadata } from "next";
import Link from "next/link";
import { SendMessageForm } from "./_components/send-message-form";

export const metadata: Metadata = { title: "Envoyer un message — BénévolApp" };

interface Props {
  searchParams: Promise<{ user_id?: string; user_name?: string; organisation_id?: string }>;
}

export default async function EnvoyerMessagePage({ searchParams }: Props) {
  const params = await searchParams;
  const userId = params.user_id ?? "";
  const userName = params.user_name ? decodeURIComponent(params.user_name) : "Utilisateur";
  const organisationId = params.organisation_id ?? "";

  if (!userId) {
    return (
      <main className="min-h-screen bg-zinc-50 dark:bg-zinc-900 p-8">
        <div className="max-w-xl mx-auto">
          <p className="text-sm text-red-600">Paramètre user_id manquant.</p>
          <Link href="/admin/pending-users" className="mt-4 inline-block text-sm text-zinc-500 underline">
            ← Retour
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-50 dark:bg-zinc-900 p-8">
      <div className="max-w-xl mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
            Nouveau message
          </h1>
          <Link href="/admin/pending-users" className="text-sm text-zinc-500 underline">
            ← Retour
          </Link>
        </div>

        <SendMessageForm
          userId={userId}
          userName={userName}
          organisationId={organisationId}
        />
      </div>
    </main>
  );
}
