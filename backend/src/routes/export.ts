import { Router, type Request, type Response } from "express";
import { PrismaClient } from "../../generated/prisma/index.js";

const router = Router();
const prisma = new PrismaClient();

/**
 * GET /api/export/heures/:benevole_id
 * Export CSV des heures de bénévolat pour un bénévole.
 * Endpoint service_role — appelé uniquement par l'admin ou un processus backend.
 * Auth : Bearer token secret via header X-Export-Secret.
 */
router.get(
  "/heures/:benevole_id",
  async (req: Request, res: Response): Promise<void> => {
    const secret = req.headers["x-export-secret"];
    if (!secret || secret !== process.env.EXPORT_SECRET) {
      res.status(401).json({ error: "Non autorisé" });
      return;
    }

    const { benevole_id } = req.params;

    const pointages = await prisma.pointage.findMany({
      where: {
        intervention: { benevole_id },
        check_in_time: { not: null },
        check_out_time: { not: null },
      },
      include: {
        intervention: {
          include: {
            mission: { select: { title: true } },
          },
        },
      },
      orderBy: { check_in_time: "asc" },
    });

    const header = "Date,Mission,Heure arrivée,Heure départ,Durée (min)";
    const rows = pointages.map((p) => {
      const date = p.intervention.scheduled_date.toISOString().slice(0, 10);
      const checkIn = p.check_in_time!.toISOString();
      const checkOut = p.check_out_time!.toISOString();
      const duration = Math.round(
        (p.check_out_time!.getTime() - p.check_in_time!.getTime()) / 60000
      );
      const title = p.intervention.mission.title.replace(/,/g, ";");
      return `${date},${title},${checkIn},${checkOut},${duration}`;
    });

    const csv = [header, ...rows].join("\n");
    const filename = `heures_${benevole_id}_${new Date().toISOString().slice(0, 10)}.csv`;

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${filename}"`
    );
    res.send(csv);
  }
);

export default router;
