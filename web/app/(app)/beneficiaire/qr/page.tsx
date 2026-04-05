import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { QrDisplay } from "./_components/qr-display";

export const metadata: Metadata = { title: "Mon QR Code — BénévolApp" };

export default async function BeneficiaireQrPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const role = (user.user_metadata?.role as string | undefined) ?? "benevole";
  if (role !== "beneficiaire" && role !== "admin") redirect("/dashboard");

  // Récupère le QR existant
  const { data: qr, error } = await supabase
    .from("beneficiary_qr")
    .select("qr_token, beneficiary_id")
    .eq("beneficiary_id", user.id)
    .maybeSingle();

  // Si aucun QR n'existe, on en crée un
  let token = qr?.qr_token ?? null;
  if (!token && !error) {
    const newToken = crypto.randomUUID();
    const { data: created } = await supabase
      .from("beneficiary_qr")
      .insert({ beneficiary_id: user.id, qr_token: newToken })
      .select("qr_token")
      .single();
    token = created?.qr_token ?? null;
  }

  const qrValue = token
    ? JSON.stringify({ beneficiary_id: user.id, token })
    : null;

  return (
    <main className="min-h-screen bg-zinc-50 dark:bg-zinc-900 p-8">
      <div className="max-w-md mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
            Mon QR Code
          </h1>
          <a href="/dashboard" className="text-sm text-zinc-500 underline">
            ← Retour
          </a>
        </div>

        <div className="rounded-xl border border-zinc-200 bg-white p-8 dark:border-zinc-800 dark:bg-zinc-900 flex flex-col items-center gap-4">
          {qrValue ? (
            <>
              <QrDisplay value={qrValue} />
              <p className="text-sm text-zinc-500 text-center">
                Présentez ce QR code au bénévole lors de chaque intervention pour
                enregistrer votre présence.
              </p>
            </>
          ) : (
            <p className="text-sm text-red-600">
              Impossible de générer votre QR code. Contactez l'administration.
            </p>
          )}
        </div>
      </div>
    </main>
  );
}
