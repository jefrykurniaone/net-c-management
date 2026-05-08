"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { updateSessionSchema, type UpdateSessionFormData } from "@/lib/validations/session";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { ArrowLeft, CheckCircle, XCircle, Clock } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import type { BadmintonSession, Attendance, User } from "@prisma/client";

type AttendanceWithUser = Attendance & { user: Pick<User, "id" | "name" | "image"> };
type SessionWithAttendances = BadmintonSession & { attendances: AttendanceWithUser[] };

const STATUS_OPTIONS = [
  { value: "SCHEDULED", label: "Terjadwal" },
  { value: "ONGOING", label: "Berlangsung" },
  { value: "COMPLETED", label: "Selesai" },
  { value: "CANCELLED", label: "Dibatalkan" },
];

const ATTENDANCE_STATUS_OPTIONS = [
  { value: "REGISTERED", label: "Terdaftar", icon: Clock, color: "text-yellow-500" },
  { value: "PRESENT", label: "Hadir", icon: CheckCircle, color: "text-green-500" },
  { value: "ABSENT", label: "Absen", icon: XCircle, color: "text-red-500" },
];

export function EditSessionForm({ session }: Readonly<{ session: SessionWithAttendances }>) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [attendances, setAttendances] = useState<AttendanceWithUser[]>(session.attendances);
  const [attendanceLoading, setAttendanceLoading] = useState<string | null>(null);

  const form = useForm<UpdateSessionFormData>({
    resolver: zodResolver(updateSessionSchema),
    defaultValues: {
      title: session.title,
      date: format(new Date(session.date), "yyyy-MM-dd"),
      startTime: session.startTime,
      endTime: session.endTime,
      location: session.location,
      maxPlayers: session.maxPlayers,
      fee: session.fee,
      notes: session.notes ?? "",
      status: session.status,
    },
  });

  async function onSubmit(data: UpdateSessionFormData) {
    setLoading(true);
    try {
      const res = await fetch(`/api/sessions/${session.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Gagal menyimpan");
      }
      toast.success("Sesi berhasil diperbarui!");
      router.push("/admin/sessions");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!confirm("Yakin ingin menghapus sesi ini? Semua data absensi akan ikut terhapus.")) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/sessions/${session.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Gagal menghapus sesi");
      toast.success("Sesi dihapus");
      router.push("/admin/sessions");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setLoading(false);
    }
  }

  async function handleAttendanceChange(userId: string, status: "PRESENT" | "ABSENT" | "REGISTERED") {
    setAttendanceLoading(userId);
    try {
      const res = await fetch(`/api/sessions/${session.id}/attendance/manual`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, status }),
      });
      if (!res.ok) throw new Error("Gagal mengubah kehadiran");
      setAttendances((prev) =>
        prev.map((a) => (a.userId === userId ? { ...a, status } : a))
      );
      toast.success("Status kehadiran diperbarui");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setAttendanceLoading(null);
    }
  }

  async function handleMarkAllPresent() {
    if (!confirm("Tandai semua peserta sebagai Hadir?")) return;
    setLoading(true);
    try {
      await Promise.all(
        attendances.map((a) =>
          fetch(`/api/sessions/${session.id}/attendance/manual`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId: a.userId, status: "PRESENT" }),
          })
        )
      );
      setAttendances((prev) => prev.map((a) => ({ ...a, status: "PRESENT" as const })));
      toast.success("Semua peserta ditandai Hadir");
    } catch {
      toast.error("Gagal menandai kehadiran");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <Link
        href="/admin/sessions"
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
      >
        <ArrowLeft className="w-4 h-4" />
        Kembali
      </Link>

      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 p-6">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
          Edit Sesi
        </h1>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Judul Sesi</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status Sesi</FormLabel>
                  <FormControl>
                    <select
                      {...field}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      {STATUS_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tanggal</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="startTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mulai</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="endTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Selesai</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="location"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Lokasi</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="maxPlayers"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Maks Peserta</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={2}
                        {...field}
                        onChange={(e) => field.onChange(Number.parseInt(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="fee"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Biaya (Rp)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        {...field}
                        onChange={(e) => field.onChange(Number.parseInt(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Catatan</FormLabel>
                  <FormControl>
                    <Textarea rows={3} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex gap-3">
              <Button
                type="submit"
                className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                disabled={loading}
              >
                {loading ? "Menyimpan..." : "Simpan Perubahan"}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="border-red-200 text-red-500 hover:bg-red-50"
                onClick={handleDelete}
                disabled={loading}
              >
                Hapus
              </Button>
            </div>
          </form>
        </Form>
      </div>

      {/* Attendance Management */}
      {attendances.length > 0 && (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Kehadiran Peserta ({attendances.length})
            </h2>
            <Button
              type="button"
              size="sm"
              className="bg-green-600 hover:bg-green-700 text-white"
              onClick={handleMarkAllPresent}
              disabled={loading}
            >
              <CheckCircle className="w-4 h-4 mr-1" />
              Tandai Semua Hadir
            </Button>
          </div>
          <div className="space-y-2">
            {attendances.map((a) => {
              const currentOpt = ATTENDANCE_STATUS_OPTIONS.find((o) => o.value === a.status);
              return (
                <div
                  key={a.userId}
                  className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0"
                >
                  <div className="flex items-center gap-2">
                    {currentOpt && (
                      <currentOpt.icon className={`w-4 h-4 ${currentOpt.color}`} />
                    )}
                    <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                      {a.user.name ?? "—"}
                    </span>
                  </div>
                  <div className="flex gap-1">
                    {ATTENDANCE_STATUS_OPTIONS.map((opt) => {
                      let activeClass = "bg-yellow-100 text-yellow-700 ring-1 ring-yellow-400";
                      if (opt.value === "PRESENT") activeClass = "bg-green-100 text-green-700 ring-1 ring-green-400";
                      if (opt.value === "ABSENT") activeClass = "bg-red-100 text-red-700 ring-1 ring-red-400";
                      const isActive = a.status === opt.value;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          disabled={attendanceLoading === a.userId}
                          onClick={() =>
                            handleAttendanceChange(
                              a.userId,
                              opt.value as "PRESENT" | "ABSENT" | "REGISTERED"
                            )
                          }
                          className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                            isActive ? activeClass : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                          }`}
                        >
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
