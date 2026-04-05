import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { QrScanner } from "./_components/qr-scanner";

export const metadata: Metadata = { title: "Scanner QR — BénévolApp" };

export default async function ScanPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const role = (user.user_metadata?.role as string | undefined) ?? "benevole";
  if (role === "beneficiaire") redirect("/dashboard");

  return (
    <main className="min-h-screen bg-zinc-50 dark:bg-zinc-900 p-8">
      <div className="max-w-lg mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
              Scanner un QR Code
            </h1>
            <p className="mt-1 text-sm text-zinc-500">
              Pointez la caméra sur le QR code du bénéficiaire.
            </p>
          </div>
          <a href="/dashboard" className="text-sm text-zinc-500 underline">
            ← Retour
          </a>
        </div>

        <QrScanner />

        <div className="mt-4 text-center">
          <a
            href="/pointage/fallback"
            className="text-sm text-zinc-500 underline hover:text-zinc-700"
          >
            Saisir le code manuellement →
          </a>
        </div>
      </div>
    </main>
  );
}
