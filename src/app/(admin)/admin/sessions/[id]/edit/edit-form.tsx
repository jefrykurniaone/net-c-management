"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { buildUpdateSessionSchema, type UpdateSessionFormData } from "@/lib/validations/session";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
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
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import type { ActivitySession, Activity } from "@prisma/client";
import { useLocale } from "@/components/providers/locale-provider";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { parseIntInput } from "@/lib/form-utils";
import { FormSection } from "@/components/ui/form-section";
import { EditSideCards } from "./edit-side-cards";
import { useSessionEditActions } from "./use-session-edit-actions";

/**
 * This form is about the Session's own facts — title, time, venue, capacity,
 * fee, notes. Recording who turned up is a different job at a different moment
 * and lives on its own surface, `/admin/sessions/{id}/attendance`; two places to
 * record attendance is how they come to disagree. The Seats are still counted
 * here, because a Session with money or Seats behind it has a locked fee.
 */
type SessionWithAttendances = ActivitySession & {
  attendances: { id: string }[];
  activity: Pick<Activity, "id" | "name">;
};

export function EditSessionForm({ session }: Readonly<{ session: SessionWithAttendances }>) {
  const { locale } = useLocale();
  const t = getDictionary(locale);
  const { loading, update, remove } = useSessionEditActions(session.id, t);

  const STATUS_OPTIONS = [
    { value: "SCHEDULED", label: t.sessionStatus.SCHEDULED },
    { value: "ONGOING", label: t.sessionStatus.ONGOING },
    { value: "COMPLETED", label: t.sessionStatus.COMPLETED },
    { value: "CANCELLED", label: t.sessionStatus.CANCELLED },
  ];

  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

  const isFeeLocked = session.attendances.length > 0;

  const form = useForm<UpdateSessionFormData>({
    resolver: zodResolver(buildUpdateSessionSchema(t)),
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

  return (
    <div className="space-y-6">
      <Link
        href="/admin/sessions"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="w-4 h-4" />
        {t.admin.backToSessions}
      </Link>

      <div className="bg-card rounded-xl border border-border p-6">
        <h1 className="text-xl font-bold text-foreground mb-6">
          {t.admin.editSessionTitle}
        </h1>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(update)} className="space-y-5">
            <FormSection title={t.admin.sectionBasicInfo}>
            <FormItem>
              <FormLabel>{t.activity.label}</FormLabel>
              <div className="flex items-center gap-2 rounded-md border border-input bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
                <span className="font-medium text-foreground">{session.activity.name}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">{t.admin.activityLocked}</p>
            </FormItem>

            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t.admin.formTitle}</FormLabel>
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
                  <FormLabel>{t.admin.colStatus}</FormLabel>
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
            </FormSection>

            <FormSection title={t.admin.sectionScheduleLocation}>
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
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            </FormSection>

            <FormSection title={t.admin.sectionParticipantsFee}>
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
                        value={field.value ?? ''}
                        onChange={(e) => field.onChange(parseIntInput(e))}
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
                        disabled={isFeeLocked}
                        {...field}
                        value={field.value ?? ''}
                        onChange={(e) => field.onChange(parseIntInput(e))}
                      />
                    </FormControl>
                    {isFeeLocked && (
                      <p className="text-xs text-muted-foreground">{t.admin.feeLocked}</p>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            </FormSection>

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t.admin.formNotes}</FormLabel>
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
                className="flex-1"
                loading={loading}
              >
                {t.admin.updateBtn}
              </Button>
              <Button
                type="button"
                variant="destructive-outline"
                onClick={() => setIsConfirmingDelete(true)}
                loading={loading}
              >
                {t.admin.deleteBtn}
              </Button>
            </div>
            <ConfirmDialog
              open={isConfirmingDelete}
              onOpenChange={(open) => !open && setIsConfirmingDelete(false)}
              title={t.admin.deleteBtn}
              description={t.admin.confirmDelete}
              confirmLabel={t.admin.deleteBtn}
              cancelLabel={t.common.cancel}
              onConfirm={remove}
            />
          </form>
        </Form>
      </div>

      {/* The jobs that are about this Session without being its own facts —
          attendance among them, as a link out and nothing more. */}
      <EditSideCards
        sessionId={session.id}
        sessionTitle={session.title}
        lastReminderAt={session.lastReminderAt?.toISOString() ?? null}
        t={t}
      />
    </div>
  );
}
