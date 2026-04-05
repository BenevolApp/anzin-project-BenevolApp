import { Router, type Router as RouterType, type Request, type Response } from "express";
import { PrismaClient } from "../../generated/prisma/client.js";
import { PrismaPg } from "@prisma/adapter-pg";

const router: RouterType = Router();
const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env["DATABASE_URL"] ?? "" }),
});

const SUPABASE_URL = process.env["SUPABASE_URL"] ?? "";
const SUPABASE_ANON_KEY = process.env["SUPABASE_ANON_KEY"] ?? "";
const SUPABASE_SERVICE_ROLE_KEY = process.env["SUPABASE_SERVICE_ROLE_KEY"] ?? "";

async function getUserFromToken(token: string): Promise<{ id: string } | null> {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: {
      Authorization: `Bearer ${token}`,
      apikey: SUPABASE_ANON_KEY,
    },
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { id?: string };
  return data.id ? { id: data.id } : null;
}

async function deleteAuthUser(userId: string): Promise<void> {
  await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${userId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      apikey: SUPABASE_SERVICE_ROLE_KEY,
    },
  });
}

/**
 * POST /api/rgpd/anonymize
 * Anonymise les données personnelles et supprime le compte auth.
 * Auth : Bearer <supabase JWT>
 */
router.post(
  "/anonymize",
  async (req: Request, res: Response): Promise<void> => {
    const authHeader = req.headers.authorization;
    const token = authHeader?.replace("Bearer ", "");
    if (!token) {
      res.status(401).json({ error: "Non authentifié." });
      return;
    }

    const user = await getUserFromToken(token);
    if (!user) {
      res.status(401).json({ error: "Token invalide ou expiré." });
      return;
    }

    const userId = user.id;

    // 1. Anonymiser profiles
    await prisma.profile.update({
      where: { id: userId },
      data: { first_name: "Anonymisé", photo_url: null, expo_token: null },
    });

    // 2. Anonymiser profiles_sensitive
    await prisma.profileSensitive.update({
      where: { id: userId },
      data: {
        last_name: "Anonymisé",
        email: `anon-${userId}@deleted.invalid`,
        phone: null,
        address: null,
        date_of_birth: null,
        rsa_situation: null,
      },
    });

    // 3. Tracer dans audit_logs
    await prisma.auditLog.create({
      data: {
        user_id: userId,
        action: "account_anonymized",
        entity_type: "profile",
        entity_id: userId,
        metadata: { requested_by: "user", rgpd: true },
      },
    });

    // 4. Supprimer le compte auth (irréversible)
    await deleteAuthUser(userId);

    res.json({ ok: true });
  }
);

export default router;
