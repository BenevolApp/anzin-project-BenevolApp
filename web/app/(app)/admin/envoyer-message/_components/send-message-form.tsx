"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";

interface SendMessageFormProps {
  userId: string;
  userName: string;
  organisationId: string;
}

export function SendMessageForm({ userId, userName, organisationId }: SendMessageFormProps) {
  const router = useRouter();
  const supabase = createClient();
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!title.trim() || !message.trim()) {
      setError("L'objet et le message sont requis.");
      return;
    }

    setSending(true);
    const { error: err } = await supabase.from("notifications").insert({
      user_id: userId,
      organisation_id: organisationId,
      type: "admin_message",
      title: title.trim(),
      message: message.trim(),
      is_human: true,
      is_read: false,
    });
    setSending(false);

    if (err) {
      setError(err.message);
      return;
    }

    setSent(true);
    setTimeout(() => router.back(), 1500);
  }

  if (sent) {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-4 dark:border-emerald-800 dark:bg-emerald-950">
        <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
          Message envoyé à {userName}.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Destinataire */}
      <div className="rounded-xl border border-zinc-200 bg-zinc-100 px-4 py-3 dark:border-zinc-700 dark:bg-zinc-800">
        <p className="text-xs text-zinc-500">À</p>
        <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200 mt-0.5">{userName}</p>
      </div>

      {/* Objet */}
      <div>
        <label className="block text-xs font-medium uppercase tracking-wide text-zinc-500 mb-1.5">
          Objet
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={120}
          placeholder="Ex : Informations sur votre compte"
          className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        />
      </div>

      {/* Message */}
      <div>
        <label className="block text-xs font-medium uppercase tracking-wide text-zinc-500 mb-1.5">
          Message
        </label>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={6}
          placeholder="Rédigez votre message ici..."
          className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 resize-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        />
      </div>

      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      )}

      <button
        type="submit"
        disabled={sending}
        className="w-full rounded-xl bg-zinc-900 py-3 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50 transition-colors dark:bg-zinc-50 dark:text-zinc-900"
      >
        {sending ? "Envoi…" : "Envoyer"}
      </button>
    </form>
  );
}
