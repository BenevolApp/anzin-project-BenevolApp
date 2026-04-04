"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function AnonymizeButton() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleAnonymize() {
    const confirmed = window.confirm(
      "Cette action est irréversible. Vos données personnelles seront anonymisées et votre compte supprimé.\n\nConfirmez-vous la suppression ?"
    );
    if (!confirmed) return;

    setLoading(true);
    setError(null);

    const res = await fetch("/api/rgpd/anonymize", { method: "POST" });
    if (!res.ok) {
      const body = (await res.json()) as { error?: string };
      setError(body.error ?? "Erreur inattendue.");
      setLoading(false);
      return;
    }

    // Compte supprimé — rediriger vers la page de connexion
    router.push("/login?message=compte_supprime");
  }

  return (
    <div className="space-y-2">
      <button
        onClick={handleAnonymize}
        disabled={loading}
        className="rounded-xl border border-red-300 bg-red-50 px-5 py-3 text-sm font-medium text-red-700 hover:bg-red-100 disabled:opacity-50 transition-colors dark:border-red-800 dark:bg-red-950 dark:text-red-300"
      >
        {loading ? "Suppression en cours…" : "Supprimer mon compte (droit à l'oubli)"}
      </button>
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}
