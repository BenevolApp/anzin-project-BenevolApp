"use client";

import { useEffect } from "react";
import { createClient } from "@/utils/supabase/client";

interface Message {
  id: string;
  type: string;
  title: string;
  message: string | null;
  is_read: boolean;
  created_at: string;
}

const TYPE_ICONS: Record<string, string> = {
  account_approved: "✅",
  account_rejected: "❌",
  admin_message: "💬",
};

interface InboxClientProps {
  messages: Message[];
  unreadCount: number;
}

export function InboxClient({ messages, unreadCount }: InboxClientProps) {
  const supabase = createClient();

  // Marquer tous les non-lus comme lus à l'ouverture
  useEffect(() => {
    if (unreadCount === 0) return;
    supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("is_human", true)
      .eq("is_read", false)
      .then(() => {});
  }, [unreadCount]);

  if (messages.length === 0) {
    return (
      <div className="rounded-xl border border-zinc-200 bg-white px-6 py-12 text-center dark:border-zinc-800 dark:bg-zinc-900">
        <p className="text-sm text-zinc-400">Aucun message pour l&apos;instant.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {messages.map((msg) => {
        const icon = TYPE_ICONS[msg.type] ?? "📩";
        const dateStr = new Date(msg.created_at).toLocaleDateString("fr-FR", {
          day: "numeric",
          month: "long",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        });

        return (
          <div
            key={msg.id}
            className={`rounded-xl border p-5 transition-colors ${
              msg.is_read
                ? "border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900"
                : "border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950"
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 min-w-0">
                <span className="text-lg shrink-0">{icon}</span>
                <div className="min-w-0">
                  <p
                    className={`text-sm font-semibold ${
                      msg.is_read
                        ? "text-zinc-800 dark:text-zinc-200"
                        : "text-blue-900 dark:text-blue-100"
                    }`}
                  >
                    {msg.title}
                  </p>
                  {msg.message && (
                    <p className="mt-1 text-sm text-zinc-600 leading-relaxed dark:text-zinc-400">
                      {msg.message}
                    </p>
                  )}
                  <p className="mt-2 text-xs text-zinc-400">{dateStr}</p>
                </div>
              </div>
              {!msg.is_read && (
                <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-blue-500" />
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
