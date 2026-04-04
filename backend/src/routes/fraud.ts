import { Router, type Router as RouterType, type Request, type Response } from "express";
import { PrismaClient } from "../../generated/prisma/client.js";
import { PrismaPg } from "@prisma/adapter-pg";

const router: RouterType = Router();
const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env["DATABASE_URL"] ?? "" }),
});

function requireServiceSecret(req: Request, res: Response): boolean {
  const secret = req.headers["x-service-secret"];
  if (!secret || secret !== process.env["SERVICE_SECRET"]) {
    res.status(401).json({ error: "Non autorisé" });
    return false;
  }
  return true;
}

interface FraudFlag {
  pointage_id: string;
  benevole_id: string;
  reason: string;
  severity: "low" | "medium" | "high";
  metadata: Record<string, unknown>;
}

/**
 * POST /api/fraud/check
 * Analyse async les pointages des dernières 24h et détecte les anomalies.
 * Appelé après chaque pointage (fire-and-forget) ou par un cron job.
 */
router.post(
  "/check",
  async (req: Request, res: Response): Promise<void> => {
    if (!requireServiceSecret(req, res)) return;

    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const flags: FraudFlag[] = [];

    // Récupère tous les pointages récents avec infos intervention + bénévole
    const pointages = await prisma.pointage.findMany({
      where: { check_in_time: { gte: since } },
      include: {
        intervention: {
          select: {
            benevole_id: true,
            scheduled_date: true,
            mission_id: true,
          },
        },
      },
      orderBy: { check_in_time: "asc" },
    });

    // Règle 1 — Device fingerprint partagé entre plusieurs bénévoles
    const deviceMap = new Map<string, Set<string>>();
    for (const p of pointages) {
      if (!p.device_fingerprint) continue;
      const benevoleId = p.intervention.benevole_id;
      const set = deviceMap.get(p.device_fingerprint) ?? new Set<string>();
      set.add(benevoleId);
      deviceMap.set(p.device_fingerprint, set);
    }
    for (const [fingerprint, benevoles] of deviceMap.entries()) {
      if (benevoles.size > 1) {
        const affected = pointages.filter((p) => p.device_fingerprint === fingerprint);
        for (const p of affected) {
          flags.push({
            pointage_id: p.id,
            benevole_id: p.intervention.benevole_id,
            reason: "device_shared",
            severity: "high",
            metadata: {
              device_fingerprint: fingerprint,
              benevole_ids: Array.from(benevoles),
            },
          });
        }
      }
    }

    // Règle 2 — IP partagée par plus de 5 bénévoles distincts dans la même heure
    const ipWindowMap = new Map<string, Map<string, Set<string>>>();
    for (const p of pointages) {
      if (!p.ip_address || !p.check_in_time) continue;
      const hourKey = p.check_in_time.toISOString().slice(0, 13); // YYYY-MM-DDTHH
      const ipKey = p.ip_address;
      const byHour = ipWindowMap.get(ipKey) ?? new Map<string, Set<string>>();
      const set = byHour.get(hourKey) ?? new Set<string>();
      set.add(p.intervention.benevole_id);
      byHour.set(hourKey, set);
      ipWindowMap.set(ipKey, byHour);
    }
    for (const [ip, byHour] of ipWindowMap.entries()) {
      for (const [hour, benevoles] of byHour.entries()) {
        if (benevoles.size > 5) {
          const affected = pointages.filter(
            (p) =>
              p.ip_address === ip &&
              p.check_in_time?.toISOString().slice(0, 13) === hour
          );
          for (const p of affected) {
            if (!flags.find((f) => f.pointage_id === p.id && f.reason === "ip_mass")) {
              flags.push({
                pointage_id: p.id,
                benevole_id: p.intervention.benevole_id,
                reason: "ip_mass_checkin",
                severity: "medium",
                metadata: { ip_address: ip, hour, distinct_benevoles: benevoles.size },
              });
            }
          }
        }
      }
    }

    // Règle 3 — Même bénévole, deux check-in à moins de 5 minutes d'intervalle
    const byBenevole = new Map<string, typeof pointages>();
    for (const p of pointages) {
      const id = p.intervention.benevole_id;
      const arr = byBenevole.get(id) ?? [];
      arr.push(p);
      byBenevole.set(id, arr);
    }
    for (const [benevoleId, ps] of byBenevole.entries()) {
      const sorted = ps
        .filter((p) => p.check_in_time)
        .sort((a, b) => a.check_in_time!.getTime() - b.check_in_time!.getTime());

      for (let i = 1; i < sorted.length; i++) {
        const prev = sorted[i - 1]!;
        const curr = sorted[i]!;
        const diffMs = curr.check_in_time!.getTime() - prev.check_in_time!.getTime();
        if (diffMs < 5 * 60 * 1000) {
          flags.push({
            pointage_id: curr.id,
            benevole_id: benevoleId,
            reason: "rapid_consecutive_checkin",
            severity: "medium",
            metadata: {
              previous_pointage_id: prev.id,
              diff_seconds: Math.round(diffMs / 1000),
            },
          });
        }
      }
    }

    // Persistance des flags dans audit_logs (dédupliqué sur la journée)
    let inserted = 0;
    for (const flag of flags) {
      const existing = await prisma.auditLog.findFirst({
        where: {
          action: `fraud_flag_${flag.reason}`,
          entity_type: "pointage",
          entity_id: flag.pointage_id,
        },
      });
      if (existing) continue;

      await prisma.auditLog.create({
        data: {
          user_id: flag.benevole_id,
          action: `fraud_flag_${flag.reason}`,
          entity_type: "pointage",
          entity_id: flag.pointage_id,
          metadata: { severity: flag.severity, ...flag.metadata },
        },
      });
      inserted++;
    }

    res.json({
      checked: pointages.length,
      flags_detected: flags.length,
      flags_inserted: inserted,
    });
  }
);

export default router;
