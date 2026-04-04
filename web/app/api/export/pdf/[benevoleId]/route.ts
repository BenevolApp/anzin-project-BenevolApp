import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/utils/supabase/server";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ benevoleId: string }> }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  const { benevoleId } = await params;

  // Seul l'utilisateur lui-même peut exporter ses propres données
  if (user.id !== benevoleId) {
    return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  }

  const backendUrl = process.env["BACKEND_URL"] ?? "http://localhost:3001";
  const secret = process.env["EXPORT_SECRET"] ?? "";

  if (!secret) {
    return NextResponse.json({ error: "Export non configuré." }, { status: 500 });
  }

  const upstream = await fetch(`${backendUrl}/api/export/pdf/${benevoleId}`, {
    headers: { "x-export-secret": secret },
  });

  if (!upstream.ok) {
    return NextResponse.json({ error: "Erreur serveur backend." }, { status: upstream.status });
  }

  const blob = await upstream.arrayBuffer();
  const filename = `attestation_benevole_${new Date().toISOString().slice(0, 10)}.pdf`;

  return new NextResponse(blob, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
