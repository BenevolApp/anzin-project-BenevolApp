"use client";

interface PointageRow {
  id: string;
  check_in_time: string;
  check_out_time: string;
  scheduled_date: string;
  mission_title: string;
}

interface ExportButtonsProps {
  pointages: PointageRow[];
  benevoleId: string;
}

function calcDuration(checkIn: string, checkOut: string) {
  return Math.round(
    (new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 60000
  );
}

function formatDuration(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h}h${m.toString().padStart(2, "0")}` : `${m}min`;
}

export function ExportButtons({ pointages, benevoleId }: ExportButtonsProps) {
  function handleExportCsv() {
    if (pointages.length === 0) return;

    const header = "Date,Mission,Heure arrivée,Heure départ,Durée (min)";
    const rows = pointages.map((p) => {
      const date = new Date(p.scheduled_date).toLocaleDateString("fr-FR");
      const checkIn = new Date(p.check_in_time).toLocaleTimeString("fr-FR", {
        hour: "2-digit",
        minute: "2-digit",
      });
      const checkOut = new Date(p.check_out_time).toLocaleTimeString("fr-FR", {
        hour: "2-digit",
        minute: "2-digit",
      });
      const duration = calcDuration(p.check_in_time, p.check_out_time);
      const title = p.mission_title.replace(/,/g, ";");
      return `${date},${title},${checkIn},${checkOut},${duration}`;
    });

    const csv = "\uFEFF" + [header, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `heures_benevole_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleExportPdf() {
    fetch(`/api/export/pdf/${benevoleId}`)
      .then((res) => {
        if (!res.ok) throw new Error("Erreur serveur");
        return res.blob();
      })
      .then((blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `attestation_benevole_${new Date().toISOString().slice(0, 10)}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
      })
      .catch(() => alert("Impossible de générer l'attestation PDF."));
  }

  return (
    <div className="flex flex-col sm:flex-row gap-3">
      <button
        onClick={handleExportCsv}
        disabled={pointages.length === 0}
        className="flex-1 rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors dark:bg-zinc-50 dark:text-zinc-900"
      >
        Exporter en CSV
      </button>
      <button
        onClick={handleExportPdf}
        disabled={pointages.length === 0}
        className="flex-1 rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-sm font-medium text-zinc-700 hover:border-zinc-400 disabled:opacity-40 disabled:cursor-not-allowed transition-colors dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
      >
        Attestation PDF (conseiller RSA)
      </button>
    </div>
  );
}

export { formatDuration, calcDuration };
