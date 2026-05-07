import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { isAuthenticated } from "@/lib/auth";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = z.object({ isActive: z.boolean() }).safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Geçersiz veri" }, { status: 400 });
  }

  const staff = await prisma.staff.update({
    where: { id: params.id },
    data: { isActive: parsed.data.isActive },
  });
  return NextResponse.json({ staff });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const futureCount = await prisma.appointment.count({
    where: {
      staffId: params.id,
      status: { in: ["pending", "confirmed"] },
      date: { gte: new Date() },
    },
  });

  if (futureCount > 0) {
    return NextResponse.json(
      { error: `Bu personelin ${futureCount} aktif randevusu var. Önce randevuları iptal edin veya başka personele aktarın.` },
      { status: 409 },
    );
  }

  await prisma.staff.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
