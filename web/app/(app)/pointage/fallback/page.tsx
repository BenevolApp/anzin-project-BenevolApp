"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";

export default function FallbackPage() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = code.trim();
    if (trimmed.length !== 6 || !/^\d{6}$/.test(trimmed)) {
      setError("Le code doit contenir exactement 6 chiffres.");
      return;
    }

    setLoading(true);
    setError(null);

    // Recherche le bénéficiaire via les 6 derniers chiffres de son token
    const supabase = createClient();
    const { data: qrRows } = await supabase
      .from("beneficiary_qr")
      .select("beneficiary_id, qr_token");

    const match = qrRows?.find((r) =>
      r.qr_token.replace(/-/g, "").slice(-6).toLowerCase() ===
      trimmed.toLowerCase()
    );

    if (!match) {
      setError("Code introuvable. Vérifiez le code et réessayez.");
      setLoading(false);
      return;
    }

    router.push(
      `/pointage/confirm?beneficiary_id=${encodeURIComponent(match.beneficiary_id)}&token=${encodeURIComponent(match.qr_token)}`
    );
  }

  return (
    <main className="min-h-screen bg-zinc-50 dark:bg-zinc-900 p-8">
      <div className="max-w-sm mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
            Code manuel
          </h1>
          <a href="/pointage/scan" className="text-sm text-zinc-500 underline">
            ← Scanner QR
          </a>
        </div>

        <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-sm text-zinc-500 mb-4">
            Saisissez les 6 chiffres affichés sur l'écran du bénéficiaire.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              type="text"
              inputMode="numeric"
              pattern="\d{6}"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              placeholder="000000"
              className="w-full text-center text-3xl font-mono tracking-[0.5em] rounded-lg border border-zinc-300 bg-zinc-50 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
            />

            {error && (
              <p className="text-sm text-red-600">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading || code.length !== 6}
              className="w-full rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900"
            >
              {loading ? "Vérification…" : "Confirmer"}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
