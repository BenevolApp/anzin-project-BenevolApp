"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

interface QrPayload {
  beneficiary_id: string;
  token: string;
}

export function QrScanner() {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const scannerRef = useRef<unknown>(null);
  const [error, setError] = useState<string | null>(null);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    let stopped = false;

    async function startScanner() {
      const { Html5Qrcode } = await import("html5-qrcode");
      if (stopped || !containerRef.current) return;

      const scanner = new Html5Qrcode("qr-reader-container");
      scannerRef.current = scanner;

      try {
        await scanner.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 250, height: 250 } },
          (decodedText) => {
            if (stopped) return;
            stopped = true;
            scanner.stop().catch(() => null);

            try {
              const payload = JSON.parse(decodedText) as QrPayload;
              if (!payload.beneficiary_id || !payload.token) {
                setError("QR code invalide.");
                return;
              }
              router.push(
                `/pointage/confirm?beneficiary_id=${encodeURIComponent(payload.beneficiary_id)}&token=${encodeURIComponent(payload.token)}`
              );
            } catch {
              setError("QR code non reconnu. Utilisez la saisie manuelle.");
            }
          },
          () => null // erreur frame ignorée
        );
        setStarted(true);
      } catch {
        setError(
          "Impossible d'accéder à la caméra. Vérifiez les permissions du navigateur ou utilisez la saisie manuelle."
        );
      }
    }

    startScanner();

    return () => {
      stopped = true;
      const s = scannerRef.current as { stop?: () => Promise<void> } | null;
      s?.stop?.().catch(() => null);
    };
  }, [router]);

  return (
    <div className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 overflow-hidden">
      {error ? (
        <div className="p-6 text-center">
          <p className="text-sm text-red-600 mb-3">{error}</p>
          <a
            href="/pointage/fallback"
            className="text-sm text-zinc-600 underline"
          >
            Saisir le code manuellement →
          </a>
        </div>
      ) : (
        <>
          <div
            id="qr-reader-container"
            ref={containerRef}
            className="w-full"
          />
          {!started && (
            <p className="text-sm text-zinc-500 text-center py-4">
              Démarrage de la caméra…
            </p>
          )}
        </>
      )}
    </div>
  );
}
