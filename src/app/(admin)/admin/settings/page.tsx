"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Settings } from "lucide-react";

interface SettingsMap {
  communityName?: string;
  defaultMonthlyFee?: string;
  defaultLocation?: string;
  adminWhatsapp?: string;
  maxPlayers?: string;
}

export default function AdminSettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<SettingsMap>({
    communityName: "PB Net-C",
    defaultMonthlyFee: "50000",
    defaultLocation: "",
    adminWhatsapp: "",
    maxPlayers: "20",
  });

  useEffect(() => {
    setLoading(true);
    fetch("/api/settings")
      .then((r) => r.json())
      .then((data: SettingsMap) => {
        setSettings((prev) => ({ ...prev, ...data }));
      })
      .finally(() => setLoading(false));
  }, []);

  async function handleSubmit(e: React.SyntheticEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      if (!res.ok) throw new Error("Gagal menyimpan");
      toast.success("Pengaturan berhasil disimpan!");
      router.refresh();
    } catch {
      toast.error("Terjadi kesalahan");
    } finally {
      setSaving(false);
    }
  }

  function update(key: keyof SettingsMap, value: string) {
    setSettings((prev) => ({ ...prev, [key]: value }));
  }

  if (loading) {
    return <div className="text-gray-400 text-sm">Memuat pengaturan...</div>;
  }

  return (
    <div className="max-w-lg space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Settings className="w-6 h-6 text-green-600" />
          Pengaturan Komunitas
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Konfigurasi default komunitas PB Net-C
        </p>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 p-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-1.5">
            <Label htmlFor="communityName">Nama Komunitas</Label>
            <Input
              id="communityName"
              value={settings.communityName ?? ""}
              onChange={(e) => update("communityName", e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="defaultMonthlyFee">Iuran Bulanan Default (Rp)</Label>
            <Input
              id="defaultMonthlyFee"
              type="number"
              min={0}
              value={settings.defaultMonthlyFee ?? ""}
              onChange={(e) => update("defaultMonthlyFee", e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="defaultLocation">Lokasi Default / GOR</Label>
            <Input
              id="defaultLocation"
              placeholder="Contoh: GOR Serbaguna Kelurahan X"
              value={settings.defaultLocation ?? ""}
              onChange={(e) => update("defaultLocation", e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="adminWhatsapp">Nomor WhatsApp Admin</Label>
            <Input
              id="adminWhatsapp"
              placeholder="Contoh: 6281234567890"
              value={settings.adminWhatsapp ?? ""}
              onChange={(e) => update("adminWhatsapp", e.target.value)}
            />
            <p className="text-xs text-gray-400">
              Format: kode negara tanpa + (contoh: 628...)
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="maxPlayers">Maks Peserta Default</Label>
            <Input
              id="maxPlayers"
              type="number"
              min={2}
              value={settings.maxPlayers ?? ""}
              onChange={(e) => update("maxPlayers", e.target.value)}
            />
          </div>

          <Button
            type="submit"
            className="w-full bg-green-600 hover:bg-green-700 text-white"
            disabled={saving}
          >
            {saving ? "Menyimpan..." : "Simpan Pengaturan"}
          </Button>
        </form>
      </div>
    </div>
  );
}
