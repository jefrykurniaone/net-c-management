import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import { isAdminRole } from "@/lib/utils";
import { EditSessionForm } from "./edit-form";

export default async function EditSessionPage({
  params,
}: Readonly<{
  params: Promise<{ id: string }>;
}>) {
  const session = await auth();
  if (!session?.user?.id || !isAdminRole(session.user.role)) redirect("/dashboard");

  const { id } = await params;
  const activitySession = await prisma.activitySession.findUnique({
    where: { id },
    include: {
      attendances: {
        include: {
          user: { select: { id: true, name: true, image: true } },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!activitySession) notFound();

  return (
    <div className="max-w-lg mx-auto">
      <EditSessionForm session={activitySession} />
    </div>
  );
}
