"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Upload, ArrowLeft, ImageIcon } from "lucide-react";
import Link from "next/link";

const MONTH_NAMES = [
  "", "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

const currentYear = new Date().getFullYear();
const currentMonth = new Date().getMonth() + 1;

export default function UploadPaymentPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [month, setMonth] = useState(String(currentMonth));
  const [year, setYear] = useState(String(currentYear));
  const [amount, setAmount] = useState("");

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    const url = URL.createObjectURL(f);
    setPreview(url);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) {
      toast.error("Pilih file bukti pembayaran terlebih dahulu");
      return;
    }
    if (!amount || parseInt(amount) < 1) {
      toast.error("Masukkan jumlah pembayaran yang valid");
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("month", month);
      formData.append("year", year);
      formData.append("amount", amount);

      const res = await fetch("/api/payments/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Gagal mengupload bukti");
      }

      toast.success("Bukti pembayaran berhasil diupload! Menunggu konfirmasi admin.");
      router.push("/payments");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setLoading(false);
    }
  }

  const months = Array.from({ length: 12 }, (_, i) => i + 1);
  const years = [currentYear - 1, currentYear, currentYear + 1];

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <Link
        href="/payments"
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
      >
        <ArrowLeft className="w-4 h-4" />
        Kembali ke riwayat iuran
      </Link>

      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-6">
        <div className="flex items-center gap-2 mb-6">
          <Upload className="w-5 h-5 text-green-600" />
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">
            Upload Bukti Pembayaran
          </h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Month & Year */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Bulan</Label>
              <Select value={month} onValueChange={setMonth}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {months.map((m) => (
                    <SelectItem key={m} value={String(m)}>
                      {MONTH_NAMES[m]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Tahun</Label>
              <Select value={year} onValueChange={setYear}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {years.map((y) => (
                    <SelectItem key={y} value={String(y)}>
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Amount */}
          <div className="space-y-1.5">
            <Label htmlFor="amount">Jumlah Pembayaran (Rp)</Label>
            <Input
              id="amount"
              type="number"
              min={1}
              placeholder="Contoh: 50000"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>

          {/* File Upload */}
          <div className="space-y-2">
            <Label>Bukti Transfer / Pembayaran</Label>
            <label
              htmlFor="proof-file"
              className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer hover:border-green-400 hover:bg-green-50 transition-colors relative overflow-hidden"
            >
              {preview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={preview}
                  alt="Preview"
                  className="absolute inset-0 w-full h-full object-cover rounded-xl"
                />
              ) : (
                <div className="flex flex-col items-center gap-2 text-gray-400 pointer-events-none">
                  <ImageIcon className="w-8 h-8" />
                  <p className="text-sm">Klik untuk pilih gambar</p>
                  <p className="text-xs">JPG, PNG, WebP — maks 5MB</p>
                </div>
              )}
            </label>
            <input
              id="proof-file"
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/webp"
              onChange={handleFileChange}
              className="sr-only"
            />
            {file && (
              <p className="text-xs text-gray-500 truncate">
                {file.name} ({(file.size / 1024).toFixed(0)} KB)
              </p>
            )}
          </div>

          <Button
            type="submit"
            className="w-full bg-green-600 hover:bg-green-700 text-white"
            disabled={loading}
          >
            {loading ? "Mengupload..." : "Upload Bukti Pembayaran"}
          </Button>
        </form>
      </div>
    </div>
  );
}
