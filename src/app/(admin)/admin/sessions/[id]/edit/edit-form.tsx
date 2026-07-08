"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
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
import { toast } from "sonner";
import { ArrowLeft, CheckCircle, XCircle, Clock, Loader2 } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import type { ActivitySession, Attendance, User, Activity } from "@prisma/client";
import { useLocale } from "@/components/providers/locale-provider";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { parseIntInput } from "@/lib/form-utils";
import { FormSection } from "@/components/ui/form-section";
import { RemindMembersButton } from "@/components/admin/remind-members-button";
import { ShareSessionCard } from "@/components/sessions/share-session-card";

type AttendanceWithUser = Attendance & { user: Pick<User, "id" | "name" | "image"> };
type SessionWithAttendances = ActivitySession & {
  attendances: AttendanceWithUser[];
  activity: Pick<Activity, "id" | "name">;
};

export function EditSessionForm({ session }: Readonly<{ session: SessionWithAttendances }>) {
  const router = useRouter();
  const { locale } = useLocale();
  const t = getDictionary(locale);

  const STATUS_OPTIONS = [
    { value: "SCHEDULED", label: t.sessionStatus.SCHEDULED },
    { value: "ONGOING", label: t.sessionStatus.ONGOING },
    { value: "COMPLETED", label: t.sessionStatus.COMPLETED },
    { value: "CANCELLED", label: t.sessionStatus.CANCELLED },
  ];

  const ATTENDANCE_STATUS_OPTIONS = [
    { value: "REGISTERED", label: t.attendanceStatus.REGISTERED, icon: Clock, color: "text-muted-foreground" },
    { value: "PRESENT", label: t.attendanceStatus.PRESENT, icon: CheckCircle, color: "text-primary" },
    { value: "ABSENT", label: t.attendanceStatus.ABSENT, icon: XCircle, color: "text-destructive" },
  ];
  const [loading, setLoading] = useState(false);
  const [confirmAction, setConfirmAction] = useState<"delete" | "markAll" | null>(null);
  const [attendances, setAttendances] = useState<AttendanceWithUser[]>(session.attendances);
  const [attendanceLoading, setAttendanceLoading] = useState<string | null>(null);

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
        throw new Error(err.error ?? t.admin.sessionUpdateFailed);
      }
      toast.success(t.admin.sessionUpdated);
      router.push("/admin/sessions");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t.common.error);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    setLoading(true);
    try {
      const res = await fetch(`/api/sessions/${session.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(t.admin.sessionDeleteFailed);
      toast.success(t.admin.sessionDeleted);
      router.push("/admin/sessions");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t.common.error);
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
      if (!res.ok) throw new Error(t.admin.attendanceUpdateFailed);
      setAttendances((prev) =>
        prev.map((a) => (a.userId === userId ? { ...a, status } : a))
      );
      toast.success(t.admin.attendanceUpdated);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t.common.error);
    } finally {
      setAttendanceLoading(null);
    }
  }

  async function handleMarkAllPresent() {
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
      toast.success(t.admin.attendanceUpdated);
    } catch {
      toast.error(t.admin.attendanceUpdateFailed);
    } finally {
      setLoading(false);
    }
  }

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
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
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
                onClick={() => setConfirmAction("delete")}
                loading={loading}
              >
                {t.admin.deleteBtn}
              </Button>
            </div>
            <ConfirmDialog
              open={confirmAction === "delete"}
              onOpenChange={(open) => !open && setConfirmAction(null)}
              title={t.admin.deleteBtn}
              description={t.admin.confirmDelete}
              confirmLabel={t.admin.deleteBtn}
              cancelLabel={t.common.cancel}
              onConfirm={handleDelete}
            />
          </form>
        </Form>
      </div>

      {/* Attendance Management */}
      {attendances.length > 0 && (
        <div className="bg-card rounded-xl border border-border p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-foreground">
              {t.admin.manualAttendance} ({attendances.length})
            </h2>
            <Button
              type="button"
              size="sm"
              onClick={() => setConfirmAction("markAll")}
              loading={loading}
            >
              {!loading && <CheckCircle className="w-4 h-4 mr-1" />}
              {t.admin.markAllPresent}
            </Button>
            <ConfirmDialog
              open={confirmAction === "markAll"}
              onOpenChange={(open) => !open && setConfirmAction(null)}
              tone="primary"
              icon={CheckCircle}
              title={t.admin.markAllPresent}
              description={t.admin.confirmMarkAll}
              confirmLabel={t.admin.markAllPresent}
              cancelLabel={t.common.cancel}
              onConfirm={handleMarkAllPresent}
            />
          </div>
          <div className="space-y-2">
            {attendances.map((a) => {
              const currentOpt = ATTENDANCE_STATUS_OPTIONS.find((o) => o.value === a.status);
              return (
                <div
                  key={a.userId}
                  className="flex items-center justify-between py-2 border-b border-border last:border-0"
                >
                  <div className="flex items-center gap-2">
                    {attendanceLoading === a.userId ? (
                      <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                    ) : (
                      currentOpt && (
                        <currentOpt.icon className={`w-4 h-4 ${currentOpt.color}`} />
                      )
                    )}
                    <span className="text-sm font-medium text-foreground">
                      {a.user.name ?? "—"}
                    </span>
                  </div>
                  <div className="flex gap-1">
                    {ATTENDANCE_STATUS_OPTIONS.map((opt) => {
                      let activeClass = "bg-muted text-muted-foreground ring-1 ring-border";
                      if (opt.value === "PRESENT") activeClass = "bg-primary/15 text-primary ring-1 ring-primary/40";
                      if (opt.value === "ABSENT") activeClass = "bg-destructive/15 text-destructive ring-1 ring-destructive/40";
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
                            isActive ? activeClass : "bg-muted text-muted-foreground hover:bg-muted/70"
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

      {/* Remind members card */}
      <div className="bg-card rounded-xl border border-border p-5">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div>
            <h2 className="text-sm font-semibold text-foreground">
              {t.admin.remindSectionTitle}
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {t.admin.remindSectionDesc}
            </p>
          </div>
        </div>
        <RemindMembersButton
          sessionId={session.id}
          label={t.admin.remindMembers}
          lastReminderAt={session.lastReminderAt?.toISOString() ?? null}
        />
      </div>

      {/* Share session card — bottom */}
      <ShareSessionCard
        sessionId={session.id}
        sessionTitle={session.title}
        labels={{
          title: t.admin.shareSession,
          description: t.admin.shareSessionDesc,
          copyLink: t.admin.copyLink,
          copied: t.admin.linkCopied,
          shareWhatsapp: t.admin.shareViaWhatsapp,
          shareX: t.admin.shareViaTwitter,
        }}
      />
    </div>
  );
}
