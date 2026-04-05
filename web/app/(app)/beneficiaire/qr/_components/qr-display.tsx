"use client";
import { QRCodeSVG } from "qrcode.react";

export function QrDisplay({ value }: { value: string }) {
  return (
    <div className="p-4 bg-white rounded-xl border border-zinc-100">
      <QRCodeSVG
        value={value}
        size={220}
        bgColor="#ffffff"
        fgColor="#18181b"
        level="M"
      />
    </div>
  );
}
