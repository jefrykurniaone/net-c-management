import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import { EditSessionForm } from "./edit-form";

export default async function EditSessionPage({
  params,
}: Readonly<{
  params: Promise<{ id: string }>;
}>) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "ADMIN") redirect("/dashboard");

  const { id } = await params;
  const badmintonSession = await prisma.badmintonSession.findUnique({
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

  if (!badmintonSession) notFound();

  return (
    <div className="max-w-lg mx-auto">
      <EditSessionForm session={badmintonSession} />
    </div>
  );
}
