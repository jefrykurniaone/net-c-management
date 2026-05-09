"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { buildCreateSessionSchema, type CreateSessionFormData } from "@/lib/validations/session";
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
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useLocale } from "@/components/providers/locale-provider";
import { getDictionary } from "@/lib/i18n/dictionaries";

export default function NewSessionPage() {
  const router = useRouter();
  const { locale } = useLocale();
  const t = getDictionary(locale);
  const [loading, setLoading] = useState(false);

  const form = useForm<CreateSessionFormData>({
    resolver: zodResolver(buildCreateSessionSchema(t)),
    defaultValues: {
      title: "",
      date: "",
      startTime: "08:00",
      endTime: "10:00",
      location: "",
      maxPlayers: 20,
      fee: 0,
      notes: "",
    },
  });

  async function onSubmit(data: CreateSessionFormData) {
    setLoading(true);
    try {
      const res = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? t.admin.sessionCreateFailed);
      }
      toast.success(t.admin.sessionCreated);
      router.push("/admin/sessions");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t.common.error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <Link
        href="/admin/sessions"
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
      >
        <ArrowLeft className="w-4 h-4" />
        {t.admin.backToSessions}
      </Link>

      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 p-6">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
          {t.admin.newSessionTitle}
        </h1>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t.admin.formTitle}</FormLabel>
                  <FormControl>
                    <Input placeholder={locale === 'id' ? 'Contoh: Latihan Rutin Minggu' : 'e.g. Weekly Training'} {...field} />
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
                  <FormLabel>{t.admin.formDate}</FormLabel>
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
                    <FormLabel>{t.admin.formStartTime}</FormLabel>
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
                    <FormLabel>{t.admin.formEndTime}</FormLabel>
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
                  <FormLabel>{t.admin.formLocation}</FormLabel>
                  <FormControl>
                    <Input placeholder={locale === 'id' ? 'Contoh: GOR Serbaguna Kelurahan X' : 'e.g. Community Sports Hall'} {...field} />
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
                    <FormLabel>{t.admin.formMaxPlayers}</FormLabel>
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
                    <FormLabel>{t.admin.formFee}</FormLabel>
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
                  <FormLabel>{t.admin.formNotes}</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={locale === 'id' ? 'Info tambahan tentang sesi ini...' : 'Additional info about this session...'}
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button
              type="submit"
              className="w-full bg-green-600 hover:bg-green-700 text-white"
              disabled={loading}
            >
              {loading ? t.admin.creating : t.admin.createBtn}
            </Button>
          </form>
        </Form>
      </div>
    </div>
  );
}
