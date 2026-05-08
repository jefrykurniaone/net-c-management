"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { updateProfileSchema, type UpdateProfileFormData } from "@/lib/validations/user";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { User } from "lucide-react";

interface Profile {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  phone: string | null;
  playPosition: string | null;
  playerLevel: string | null;
  role: string;
  createdAt: string;
}

export default function ProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const form = useForm<UpdateProfileFormData>({
    resolver: zodResolver(updateProfileSchema),
    defaultValues: {
      name: "",
      phone: "",
      playPosition: undefined,
      playerLevel: undefined,
    },
  });

  useEffect(() => {
    fetch("/api/users/profile")
      .then((r) => r.json())
      .then((data: Profile) => {
        setProfile(data);
        form.reset({
          name: data.name ?? "",
          phone: data.phone ?? "",
          playPosition: (data.playPosition as UpdateProfileFormData["playPosition"]) ?? undefined,
          playerLevel: (data.playerLevel as UpdateProfileFormData["playerLevel"]) ?? undefined,
        });
      })
      .finally(() => setLoading(false));
  }, [form]);

  async function onSubmit(data: UpdateProfileFormData) {
    setSaving(true);
    try {
      const res = await fetch("/api/users/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Gagal menyimpan");
      }
      toast.success("Profil berhasil diperbarui!");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="text-gray-400 text-sm">Memuat profil...</div>;
  }

  return (
    <div className="max-w-lg space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <User className="w-6 h-6 text-green-600" />
          Profil Saya
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Kelola informasi akun Anda
        </p>
      </div>

      {/* Account info */}
      {profile && (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 p-5 flex items-center gap-4">
          {profile.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={profile.image}
              alt={profile.name ?? ""}
              className="w-14 h-14 rounded-full object-cover"
            />
          ) : (
            <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center text-green-700 font-bold text-xl">
              {(profile.name ?? profile.email ?? "?")[0].toUpperCase()}
            </div>
          )}
          <div>
            <p className="font-semibold text-gray-900 dark:text-white">
              {profile.name ?? "(Belum diisi)"}
            </p>
            <p className="text-sm text-gray-400">{profile.email}</p>
            <Badge
              variant={profile.role === "ADMIN" ? "default" : "secondary"}
              className="mt-1 text-xs"
            >
              {profile.role === "ADMIN" ? "Admin" : "Anggota"}
            </Badge>
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 p-6">
        <h2 className="font-semibold text-gray-900 dark:text-white mb-5">Edit Informasi</h2>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nama Lengkap</FormLabel>
                  <FormControl>
                    <Input placeholder="Nama Anda" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nomor HP</FormLabel>
                  <FormControl>
                    <Input placeholder="Contoh: 08123456789" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="playPosition"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Posisi Bermain</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih posisi" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="SINGLE">Tunggal</SelectItem>
                      <SelectItem value="DOUBLE">Ganda</SelectItem>
                      <SelectItem value="BOTH">Keduanya</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="playerLevel"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Level Pemain</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih level" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="BEGINNER">Pemula</SelectItem>
                      <SelectItem value="INTERMEDIATE">Menengah</SelectItem>
                      <SelectItem value="ADVANCED">Mahir</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button
              type="submit"
              className="w-full bg-green-600 hover:bg-green-700 text-white"
              disabled={saving}
            >
              {saving ? "Menyimpan..." : "Simpan Perubahan"}
            </Button>
          </form>
        </Form>
      </div>
    </div>
  );
}
