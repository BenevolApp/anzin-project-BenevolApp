import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  const serviceRoleKey = process.env["SUPABASE_SERVICE_ROLE_KEY"];
  const supabaseUrl = process.env["NEXT_PUBLIC_SUPABASE_URL"];
  if (!serviceRoleKey || !supabaseUrl) {
    return NextResponse.json({ error: "Configuration serveur manquante." }, { status: 500 });
  }

  const adminClient = createAdminClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const userId = user.id;

  // 1. Anonymiser profiles
  const { error: profileErr } = await adminClient
    .from("profiles")
    .update({ first_name: "Anonymisé", photo_url: null, expo_token: null })
    .eq("id", userId);

  if (profileErr) {
    return NextResponse.json({ error: profileErr.message }, { status: 500 });
  }

  // 2. Anonymiser profiles_sensitive
  const { error: sensErr } = await adminClient
    .from("profiles_sensitive")
    .update({
      last_name: "Anonymisé",
      email: `anon-${userId}@deleted.invalid`,
      phone: null,
      address: null,
      date_of_birth: null,
      rsa_situation: null,
    })
    .eq("id", userId);

  if (sensErr) {
    return NextResponse.json({ error: sensErr.message }, { status: 500 });
  }

  // 3. Tracer dans audit_logs
  await adminClient.from("audit_logs").insert({
    actor_id: userId,
    action: "account_anonymized",
    target_type: "profile",
    target_id: userId,
    metadata: { requested_by: "user", rgpd: true },
  });

  // 4. Supprimer l'utilisateur auth (irréversible)
  const { error: deleteErr } = await adminClient.auth.admin.deleteUser(userId);
  if (deleteErr) {
    return NextResponse.json({ error: deleteErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
