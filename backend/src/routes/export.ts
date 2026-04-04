import { Router, type Request, type Response } from "express";
import PDFDocument from "pdfkit";
import { PrismaClient } from "../../generated/prisma/index.js";

const router = Router();
const prisma = new PrismaClient();

// Middleware auth partagé
function requireExportSecret(req: Request, res: Response): boolean {
  const secret = req.headers["x-export-secret"];
  if (!secret || secret !== process.env.EXPORT_SECRET) {
    res.status(401).json({ error: "Non autorisé" });
    return false;
  }
  return true;
}

async function fetchPointages(benevole_id: string) {
  return prisma.pointage.findMany({
    where: {
      intervention: { benevole_id },
      check_in_time: { not: null },
      check_out_time: { not: null },
    },
    include: {
      intervention: {
        include: {
          mission: { select: { title: true } },
          benevole: { select: { first_name: true } },
        },
      },
    },
    orderBy: { check_in_time: "asc" },
  });
}

/**
 * GET /api/export/heures/:benevole_id
 * Export CSV des heures de bénévolat.
 */
router.get(
  "/heures/:benevole_id",
  async (req: Request, res: Response): Promise<void> => {
    if (!requireExportSecret(req, res)) return;
    const { benevole_id } = req.params;
    const pointages = await fetchPointages(benevole_id);

    const header = "Date,Mission,Heure arrivée,Heure départ,Durée (min)";
    const rows = pointages.map((p) => {
      const date = p.intervention.scheduled_date.toISOString().slice(0, 10);
      const checkIn = p.check_in_time!.toLocaleTimeString("fr-FR", {
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "Europe/Paris",
      });
      const checkOut = p.check_out_time!.toLocaleTimeString("fr-FR", {
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "Europe/Paris",
      });
      const duration = Math.round(
        (p.check_out_time!.getTime() - p.check_in_time!.getTime()) / 60000
      );
      const title = p.intervention.mission.title.replace(/,/g, ";");
      return `${date},${title},${checkIn},${checkOut},${duration}`;
    });

    const csv = [header, ...rows].join("\n");
    const filename = `heures_${benevole_id}_${new Date().toISOString().slice(0, 10)}.csv`;

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(csv);
  }
);

/**
 * GET /api/export/pdf/:benevole_id
 * Attestation PDF horodatée des heures de bénévolat (pour conseiller RSA).
 */
router.get(
  "/pdf/:benevole_id",
  async (req: Request, res: Response): Promise<void> => {
    if (!requireExportSecret(req, res)) return;
    const { benevole_id } = req.params;
    const pointages = await fetchPointages(benevole_id);

    const benevole_name =
      pointages[0]?.intervention.benevole.first_name ?? "Bénévole";
    const today = new Date().toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });

    const totalMinutes = pointages.reduce((acc, p) => {
      return (
        acc +
        Math.round(
          (p.check_out_time!.getTime() - p.check_in_time!.getTime()) / 60000
        )
      );
    }, 0);
    const totalH = Math.floor(totalMinutes / 60);
    const totalM = totalMinutes % 60;
    const totalStr =
      totalM > 0 ? `${totalH}h${String(totalM).padStart(2, "0")}` : `${totalH}h`;

    const doc = new PDFDocument({ margin: 50, size: "A4" });
    const filename = `attestation_benevole_${benevole_id}_${new Date().toISOString().slice(0, 10)}.pdf`;

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    doc.pipe(res);

    // En-tête
    doc
      .fontSize(20)
      .font("Helvetica-Bold")
      .text("Attestation de bénévolat", { align: "center" });
    doc.moveDown(0.3);
    doc
      .fontSize(11)
      .font("Helvetica")
      .fillColor("#666")
      .text("BénévolApp — Document officiel", { align: "center" });
    doc.moveDown(1.5);

    // Infos bénévole
    doc
      .fontSize(12)
      .font("Helvetica-Bold")
      .fillColor("#000")
      .text("Informations bénévole");
    doc.moveDown(0.3);
    doc
      .fontSize(11)
      .font("Helvetica")
      .text(`Prénom : ${benevole_name}`)
      .text(`Date d'émission : ${today}`)
      .text(`Total d'heures : ${totalStr} (${pointages.length} intervention${pointages.length > 1 ? "s" : ""})`);
    doc.moveDown(1.5);

    // Tableau
    doc.fontSize(12).font("Helvetica-Bold").text("Détail des interventions");
    doc.moveDown(0.5);

    // En-tête tableau
    const colX = [50, 160, 310, 390, 470];
    const headers = ["Date", "Mission", "Arrivée", "Départ", "Durée"];
    doc.fontSize(9).font("Helvetica-Bold").fillColor("#444");
    headers.forEach((h, i) => doc.text(h, colX[i], doc.y, { width: 100, continued: i < 4 }));
    doc.moveDown(0.3);

    // Ligne séparatrice
    const lineY = doc.y;
    doc.moveTo(50, lineY).lineTo(545, lineY).strokeColor("#ccc").stroke();
    doc.moveDown(0.3);

    // Lignes de données
    doc.font("Helvetica").fillColor("#000").fontSize(9);
    pointages.forEach((p) => {
      const rowY = doc.y;
      const date = p.intervention.scheduled_date.toLocaleDateString("fr-FR");
      const checkIn = p.check_in_time!.toLocaleTimeString("fr-FR", {
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "Europe/Paris",
      });
      const checkOut = p.check_out_time!.toLocaleTimeString("fr-FR", {
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "Europe/Paris",
      });
      const dur = Math.round(
        (p.check_out_time!.getTime() - p.check_in_time!.getTime()) / 60000
      );
      const durStr =
        dur >= 60
          ? `${Math.floor(dur / 60)}h${String(dur % 60).padStart(2, "0")}`
          : `${dur}min`;
      const title =
        p.intervention.mission.title.length > 20
          ? p.intervention.mission.title.slice(0, 18) + "…"
          : p.intervention.mission.title;

      doc.text(date, colX[0], rowY, { width: 100 });
      doc.text(title, colX[1], rowY, { width: 140 });
      doc.text(checkIn, colX[2], rowY, { width: 70 });
      doc.text(checkOut, colX[3], rowY, { width: 70 });
      doc.text(durStr, colX[4], rowY, { width: 60 });
      doc.moveDown(0.6);
    });

    doc.moveDown(1);

    // Total
    doc
      .moveTo(50, doc.y)
      .lineTo(545, doc.y)
      .strokeColor("#aaa")
      .stroke();
    doc.moveDown(0.5);
    doc
      .fontSize(11)
      .font("Helvetica-Bold")
      .text(`Total : ${totalStr}`, { align: "right" });

    // Pied de page
    doc.moveDown(3);
    doc
      .fontSize(9)
      .font("Helvetica")
      .fillColor("#888")
      .text(
        `Document généré automatiquement le ${today} par BénévolApp. Ce document atteste des heures de bénévolat enregistrées via l'application.`,
        { align: "center" }
      );

    doc.end();
  }
);

export default router;
