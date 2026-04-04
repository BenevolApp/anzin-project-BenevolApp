import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
import { InboxClient } from "./_components/inbox-client";

export const metadata: Metadata = { title: "Messagerie — BénévolApp" };

export default async function InboxPage() {
  const supabase = await createClient();

  const { data: messages } = await supabase
    .from("notifications")
    .select("id, type, title, message, is_read, created_at")
    .eq("is_human", true)
    .order("created_at", { ascending: false });

  const msgs = (messages ?? []) as {
    id: string;
    type: string;
    title: string;
    message: string | null;
    is_read: boolean;
    created_at: string;
  }[];

  const unreadCount = msgs.filter((m) => !m.is_read).length;

  return (
    <main className="min-h-screen bg-zinc-50 dark:bg-zinc-900 p-8">
      <div className="max-w-2xl mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
              Messagerie
            </h1>
            {unreadCount > 0 && (
              <span className="rounded-full bg-red-500 px-2 py-0.5 text-xs font-bold text-white">
                {unreadCount}
              </span>
            )}
          </div>
          <Link href="/dashboard" className="text-sm text-zinc-500 underline">
            ← Tableau de bord
          </Link>
        </div>

        <InboxClient messages={msgs} unreadCount={unreadCount} />
      </div>
    </main>
  );
}
