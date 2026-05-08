"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface RSVPButtonProps {
  sessionId: string;
  isRegistered: boolean;
  isFull: boolean;
  isCancelled: boolean;
  isCompleted: boolean;
}

export function RSVPButton({
  sessionId,
  isRegistered,
  isFull,
  isCancelled,
  isCompleted,
}: RSVPButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleRSVP() {
    setLoading(true);
    try {
      if (isRegistered) {
        const res = await fetch(`/api/sessions/${sessionId}/attendance`, {
          method: "DELETE",
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error ?? "Gagal membatalkan pendaftaran");
        }
        toast.success("Pendaftaran dibatalkan");
      } else {
        const res = await fetch(`/api/sessions/${sessionId}/attendance`, {
          method: "POST",
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error ?? "Gagal mendaftar");
        }
        toast.success("Berhasil mendaftar sesi!");
      }
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setLoading(false);
    }
  }

  if (isCancelled) {
    return (
      <Button disabled variant="outline" className="w-full">
        Sesi Dibatalkan
      </Button>
    );
  }

  if (isCompleted) {
    return (
      <Button disabled variant="outline" className="w-full">
        Sesi Selesai
      </Button>
    );
  }

  if (!isRegistered && isFull) {
    return (
      <Button disabled variant="outline" className="w-full">
        Sesi Penuh
      </Button>
    );
  }

  return (
    <Button
      onClick={handleRSVP}
      disabled={loading}
      variant={isRegistered ? "outline" : "default"}
      className={
        isRegistered
          ? "w-full border-red-200 text-red-500 hover:bg-red-50"
          : "w-full bg-green-600 hover:bg-green-700 text-white"
      }
    >
      {loading
        ? "Memproses..."
        : isRegistered
        ? "Batalkan Pendaftaran"
        : "Daftar Sesi Ini"}
    </Button>
  );
}
